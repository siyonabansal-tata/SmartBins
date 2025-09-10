from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class Medicine(BaseModel):
    name: str = Field(..., description="Name of the medicine")
    bin: str = Field(..., description="Bin ID where the medicine is stored")
    qty: int = Field(..., description="Current stock level of the medicine", ge=0)

class OrderItem(BaseModel):
    medicine_name: str = Field(..., description="Name of the medicine")
    quantity: int = Field(..., description="Quantity ordered", gt=0)

class Order(BaseModel):
    items: List[OrderItem] = Field(..., description="List of medicines with quantities")
    colour: Optional[str] = None
    status: str = "pending"
    bins: Optional[Dict[str, int]] = None

class QRPayload(BaseModel):
    name: str = Field(..., description="Name of the medicine")
    qty: Optional[int] = Field(1, description="Count of the medicine, default is 1")


