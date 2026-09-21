from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.core.exceptions import AppError
from app.core.adjacency import validate_route
from app.core.retention import validate_retention, retention_min
from app.core.permissions import can_perform, Action, require_role
from app.core.websocket_manager import manager
from app.models.district import District
from app.models.stock import Stock
from app.models.user import RoleEnum
from app.models.transfer import TransferRequest, TransferStatus
from app.schemas.transfer import TransferCreate, TransferOut, RequisitionCreate, TransferDetailOut, TransferStatusOut

router = APIRouter(prefix="/transfers", tags=["transfers"])


@router.post("", response_model=TransferOut, status_code=201)
async def create_transfer(
    payload: TransferCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    from_district = db.query(District).filter(District.id == payload.from_district_id).first()
    to_district = db.query(District).filter(District.id == payload.to_district_id).first()
    transit_district = None

    if not from_district or not to_district:
        raise AppError("NOT_FOUND", "Source or destination district not found", 404)

    if payload.transit_district_id is not None:
        transit_district = db.query(District).filter(District.id == payload.transit_district_id).first()
        if not transit_district:
            raise AppError("NOT_FOUND", "Transit district not found", 404)

    # géographie du transfert (adjacent, transit, ou maritime)
    validate_route(db, from_district, to_district, transit_district, payload.route_type)

    # niveau de catastrophe du quartier source + le rôle a-t-il le droit d'initier ce transfert à ce niveau ?
    level = from_district.disaster_level

    if not can_perform(Action.REQUEST_ADJACENT_TRANSFER, level, user["role"]):
        raise AppError(
            "DISASTER_LEVEL_FORBIDDEN",
            f"Role {user['role']} cannot request transfers at disaster level {level} in district {from_district.code}",
            422,
        )

    # le transfert ne doit pas faire passer le quartier source sous son seuil de rétention minimum
    source_stock = db.query(Stock).filter(
        Stock.district_id == payload.from_district_id,
        Stock.resource_id == payload.resource_id,
    ).first()

    if not source_stock:
        raise AppError("NOT_FOUND", "No stock record for this resource in the source district", 404)

    validate_retention(source_stock, payload.quantity)

    # Détection de conflit : d'autres transferts sont-ils déjà en attente sur cette même paire ?
    pending_transfers = db.query(TransferRequest).filter(
        TransferRequest.from_district_id == payload.from_district_id,
        TransferRequest.resource_id == payload.resource_id,
        TransferRequest.status == TransferStatus.PENDING,
    ).all()

    pending_quantity = sum(t.quantity for t in pending_transfers) # Si leur somme, ajoutée à celle-ci, dépasse ce qui est disponible au-dessus du seuil de rétention
    is_conflict = pending_transfers and ( # c'est un conflit --> les deux équipes visent donc la même ressource limitée
        source_stock.current_quantity - pending_quantity - payload.quantity
        < retention_min(source_stock.initial_quantity, source_stock.retention_threshold_pct)
    )

    transfer = TransferRequest(
        resource_id=payload.resource_id,
        from_district_id=payload.from_district_id,
        to_district_id=payload.to_district_id,
        transit_district_id=payload.transit_district_id,
        quantity=payload.quantity,
        route_type=payload.route_type,
        status=TransferStatus.PENDING,
        requested_by_id=user["id"],
        disaster_level_at_request=level,
    )
    
    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    await manager.broadcast({
        "event": "transfer_created",
        "transfer_id": transfer.id,
        "resource_id": transfer.resource_id,
        "from_district_id": transfer.from_district_id,
        "to_district_id": transfer.to_district_id,
        "quantity": transfer.quantity,
    })

    if is_conflict:
        await manager.broadcast({
            "event": "transfer_conflict",
            "resource_id": payload.resource_id,
            "district_id": payload.from_district_id,
        })

    return transfer


@router.post("/requisition", response_model=TransferOut, status_code=201)
async def requisition_transfer(
    payload: RequisitionCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(RoleEnum.CD)),
):
    from_district = db.query(District).filter(District.id == payload.from_district_id).first()
    to_district = db.query(District).filter(District.id == payload.to_district_id).first()

    if not from_district or not to_district:
        raise AppError("NOT_FOUND", "Source or destination district not found", 404)

    level = from_district.disaster_level

    # kaiju-rules.pdf, matrice permissions : Requisition n'est possible qu'aux niveaux 4 et 5, RéSERVé au CD uniquement
    if not can_perform(Action.REQUISITION, level, user["role"]):
        raise AppError(
            "DISASTER_LEVEL_FORBIDDEN",
            f"Requisition is not allowed at disaster level {level} in district {from_district.code}",
            422,
        )

    source_stock = db.query(Stock).filter(
        Stock.district_id == payload.from_district_id,
        Stock.resource_id == payload.resource_id,
    ).first()

    if not source_stock:
        raise AppError("NOT_FOUND", "No stock record for this resource in the source district", 404)

    dest_stock = db.query(Stock).filter(
        Stock.district_id == payload.to_district_id,
        Stock.resource_id == payload.resource_id,
    ).first()

    if not dest_stock:
        raise AppError("NOT_FOUND", "No stock record for this resource in the destination district", 404)

    # Même règle de rétention qu'un transfert classique : le CD ne peut pas vider un quartier sous son seuil, même en réquisition
    validate_retention(source_stock, payload.quantity)

    # Différence avec un transfert normal : le mouvement est immédiat,
    # pas de statut "pending" en attente d'approbation d'un QC --> c'est ça la réquisition
    source_stock.current_quantity -= payload.quantity
    dest_stock.current_quantity += payload.quantity

    transfer = TransferRequest(
        resource_id=payload.resource_id,
        from_district_id=payload.from_district_id,
        to_district_id=payload.to_district_id,
        quantity=payload.quantity,
        route_type="direct",
        status=TransferStatus.COMPLETED,
        requested_by_id=user["id"],
        approved_by_id=user["id"],
        disaster_level_at_request=level,
    )
    db.add(transfer)
    db.commit()
    await manager.broadcast({
        "event": "stock_updated",
        "district_id": payload.from_district_id,
        "resource_id": payload.resource_id,
        "new_quantity": source_stock.current_quantity,
    })
    db.refresh(transfer)

    return transfer


@router.get("", response_model=list[TransferDetailOut])
def list_transfers(
    status: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(TransferRequest)
    if status is not None:
        if status not in {s.value for s in TransferStatus}:
            raise AppError("VALIDATION_ERROR", f"Unknown status: {status}", 400)
        query = query.filter(TransferRequest.status == TransferStatus(status))
    return query.order_by(TransferRequest.id.desc()).all()


def _get_pending_transfer_for_decision(db: Session, transfer_id: int, user: dict) -> TransferRequest:
    transfer = db.query(TransferRequest).filter(TransferRequest.id == transfer_id).first()
    if not transfer:
        raise AppError("NOT_FOUND", f"Transfer {transfer_id} not found", 404)

    # QC du quartier source ou CD ; un LC ne peut pas forcer un transfert sans approbation du QC (kaiju-rules.pdf, "Officers and roles")
    is_source_qc = user["role"] == RoleEnum.QC.value and user["district_id"] == transfer.from_district_id
    if not (is_source_qc or user["role"] == RoleEnum.CD.value):
        raise AppError(
            "PERMISSION_DENIED",
            "Only the source district QC or the CD can decide on this transfer",
            403,
        )

    if transfer.status != TransferStatus.PENDING:
        raise AppError(
            "VALIDATION_ERROR",
            f"Transfer {transfer_id} is already {transfer.status.value}",
            422,
        )
    return transfer


@router.patch("/{transfer_id}/approve", response_model=TransferStatusOut)
async def approve_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    transfer = _get_pending_transfer_for_decision(db, transfer_id, user)

    source_stock = db.query(Stock).filter(
        Stock.district_id == transfer.from_district_id,
        Stock.resource_id == transfer.resource_id,
    ).first()
    dest_stock = db.query(Stock).filter(
        Stock.district_id == transfer.to_district_id,
        Stock.resource_id == transfer.resource_id,
    ).first()
    if not source_stock or not dest_stock:
        raise AppError("NOT_FOUND", "Stock record missing for this transfer", 404)

    # Le stock a pu baisser depuis la demande (autres transferts approuvés) : on revalide la rétention au moment de l'approbation
    validate_retention(source_stock, transfer.quantity)

    source_stock.current_quantity -= transfer.quantity
    dest_stock.current_quantity += transfer.quantity
    transfer.status = TransferStatus.APPROVED
    transfer.approved_by_id = int(user["id"])
    db.commit()
    db.refresh(transfer)

    await manager.broadcast({"event": "transfer_updated", "transfer_id": transfer.id, "status": transfer.status.value})

    for stock in (source_stock, dest_stock):
        await manager.broadcast({
            "event": "stock_updated",
            "district_id": stock.district_id,
            "resource_id": stock.resource_id,
            "new_quantity": stock.current_quantity,
        })

    return transfer


@router.patch("/{transfer_id}/reject", response_model=TransferStatusOut)
async def reject_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    transfer = _get_pending_transfer_for_decision(db, transfer_id, user)
    transfer.status = TransferStatus.REJECTED
    transfer.approved_by_id = int(user["id"])
    db.commit()
    db.refresh(transfer)

    await manager.broadcast({"event": "transfer_updated", "transfer_id": transfer.id, "status": transfer.status.value})
    return transfer