import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from app.db.session import Base

class RoleEnum(str, enum.Enum):
    QC = "QC"
    LC = "LC"
    CD = "CD"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)