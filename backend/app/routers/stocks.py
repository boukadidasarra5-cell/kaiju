import math
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.core.exceptions import AppError
from app.models.district import District
from app.models.stock import Stock
from app.schemas.stock import StockOut

router = APIRouter(prefix="/districts", tags=["stocks"])


def retention_min(initial_qty: int, pct: float) -> int:
    return math.ceil(initial_qty * pct / 100) # ceil arrondit au-dessus


@router.get("/{district_id}/stock", response_model=list[StockOut])
def get_district_stock(
    district_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise AppError("NOT_FOUND", f"District {district_id} not found", 404)

    stocks = db.query(Stock).filter(Stock.district_id == district_id).all()

    return [
        StockOut(
            resource_id=s.resource_id,
            resource_name=s.resource.name,
            current_quantity=s.current_quantity,
            initial_quantity=s.initial_quantity,
            retention_min=retention_min(s.initial_quantity, s.retention_threshold_pct),
        )
        for s in stocks
    ]