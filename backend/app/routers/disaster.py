from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import require_role, can_perform, Action
from app.core.exceptions import AppError
from app.core.websocket_manager import manager
from app.models.user import RoleEnum
from app.models.district import District
from app.models.stock import Stock
from app.schemas.disaster import DisasterLevelUpdate, DistrictDisasterOut

router = APIRouter(tags=["disaster"])


def _out(district: District) -> DistrictDisasterOut:
    return DistrictDisasterOut(
        district_id=district.id,
        level=district.disaster_level,
        updated_at=district.disaster_updated_at,
    )


@router.get("/disaster", response_model=list[DistrictDisasterOut])
def list_disaster_levels(db: Session = Depends(get_db)):
    return [_out(d) for d in db.query(District).order_by(District.id).all()]


@router.patch("/districts/{district_id}/disaster", response_model=DistrictDisasterOut)
async def update_district_disaster_level(
    district_id: int,
    payload: DisasterLevelUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(RoleEnum.CD)),
):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise AppError("NOT_FOUND", f"District {district_id} not found", 404)

    district.disaster_level = payload.level

    # Le CD ne peut baisser le seuil qu'au niveau 5 (kaiju-rules.pdf, "Catastrophe levels" + matrice) :
    # ici le niveau est celui du quartier concerné, et seul le stock de ce quartier est touché
    if payload.retention_threshold_pct is not None:
        if not can_perform(Action.LOWER_RETENTION_THRESHOLD, payload.level, user["role"]):
            raise AppError(
                "DISASTER_LEVEL_FORBIDDEN",
                f"Retention threshold can only be lowered at level 5, current request is level {payload.level}",
                422,
            )
        db.query(Stock).filter(Stock.district_id == district_id).update(
            {Stock.retention_threshold_pct: payload.retention_threshold_pct}
        )

    db.commit()
    db.refresh(district)

    await manager.broadcast({
        "event": "disaster_level_changed",
        "district_id": district.id,
        "level": district.disaster_level,
    })

    return _out(district)