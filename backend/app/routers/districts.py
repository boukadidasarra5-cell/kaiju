from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.core.exceptions import AppError
from app.models.district import District, DistrictAdjacency
from app.models.resource import Resource
from app.schemas.district import DistrictOut, AdjacencyOut, ResourceOut

router = APIRouter(tags=["districts"])


@router.get("/districts", response_model=list[DistrictOut])
def list_districts(db: Session = Depends(get_db)):
    # Public : données de référence nécessaires au formulaire d'inscription (choix du quartier du QC)
    return db.query(District).order_by(District.id).all()


@router.get("/districts/{district_id}/adjacency", response_model=AdjacencyOut)
def get_adjacency(
    district_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise AppError("NOT_FOUND", f"District {district_id} not found", 404)

    links = db.query(DistrictAdjacency).filter(
        or_(
            DistrictAdjacency.district_a_id == district_id,
            DistrictAdjacency.district_b_id == district_id,
        )
    ).all()
    neighbour_ids = [
        l.district_b_id if l.district_a_id == district_id else l.district_a_id
        for l in links
    ]
    neighbours = db.query(District).filter(District.id.in_(neighbour_ids)).order_by(District.code).all()
    return AdjacencyOut(district_id=district_id, adjacent_to=[n.code for n in neighbours])


@router.get("/resources", response_model=list[ResourceOut])
def list_resources(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return db.query(Resource).order_by(Resource.id).all()
