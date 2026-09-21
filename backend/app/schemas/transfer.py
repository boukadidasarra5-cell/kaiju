from pydantic import BaseModel
from datetime import datetime


class TransferCreate(BaseModel):
    resource_id: int
    from_district_id: int
    to_district_id: int
    transit_district_id: int | None = None
    quantity: int
    route_type: str  # "direct" | "transit" | "maritime"


class TransferOut(BaseModel):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TransferDetailOut(BaseModel):
    id: int
    resource_id: int
    from_district_id: int
    to_district_id: int
    transit_district_id: int | None
    quantity: int
    route_type: str
    status: str
    requested_by_id: int
    disaster_level_at_request: int
    created_at: datetime

    class Config:
        from_attributes = True


class TransferStatusOut(BaseModel):
    id: int
    status: str

    class Config:
        from_attributes = True


class RequisitionCreate(BaseModel):
    resource_id: int
    from_district_id: int
    to_district_id: int
    quantity: int