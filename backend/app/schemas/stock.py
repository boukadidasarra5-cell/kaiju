from pydantic import BaseModel

class StockOut(BaseModel):
    resource_id: int
    resource_name: str
    current_quantity: int
    initial_quantity: int
    retention_min: int

    class Config:
        from_attributes = True