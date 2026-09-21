from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True)
    code = Column(String(1), unique=True, nullable=False)
    name = Column(String, nullable=False)
    has_maritime_access = Column(Boolean, default=False)
    disaster_level = Column(Integer, nullable=False, default=1, server_default="1")  # niveau de catastrophe propre au quartier (1-5)
    disaster_updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class DistrictAdjacency(Base):
    __tablename__ = "district_adjacency"

    id = Column(Integer, primary_key=True)
    district_a_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    district_b_id = Column(Integer, ForeignKey("districts.id"), nullable=False)