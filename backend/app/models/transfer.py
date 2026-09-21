import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, func
from app.db.session import Base

class TransferStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

class RouteType(str, enum.Enum):
    DIRECT = "direct"
    TRANSIT = "transit"
    MARITIME = "maritime"

class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    id = Column(Integer, primary_key=True)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    from_district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    to_district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    transit_district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    route_type = Column(Enum(RouteType), nullable=False)
    status = Column(Enum(TransferStatus), default=TransferStatus.PENDING)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    disaster_level_at_request = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())