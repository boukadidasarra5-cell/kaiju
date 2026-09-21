from pydantic import BaseModel


class DistrictOut(BaseModel):
    id: int
    code: str
    name: str
    has_maritime_access: bool
    disaster_level: int

    class Config:
        from_attributes = True


class AdjacencyOut(BaseModel):
    district_id: int
    adjacent_to: list[str]


class ResourceOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
