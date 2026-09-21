from sqlalchemy import Column, Integer, String
from app.db.session import Base

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)