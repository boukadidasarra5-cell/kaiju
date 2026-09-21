from datetime import datetime
from pydantic import BaseModel, field_validator


class DisasterLevelUpdate(BaseModel):
    level: int
    retention_threshold_pct: float | None = None  # rempli seulement si CD veut baisser le seuil

    @field_validator("level")
    @classmethod
    def validate_level(cls, v):
        if v < 1 or v > 5:
            raise ValueError("level must be between 1 and 5")
        return v

    @field_validator("retention_threshold_pct")
    @classmethod
    def validate_threshold(cls, v):
        if v is not None and not (0 < v <= 30):
            raise ValueError("retention_threshold_pct must be between 0 and 30")
        return v


class DistrictDisasterOut(BaseModel):
    district_id: int
    level: int
    updated_at: datetime | None