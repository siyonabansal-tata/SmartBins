# main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from db import get_db, medicines_collection, orders_collection
from models import Medicine, Order
from bson import ObjectId

app = FastAPI()

# Allow CORS for your frontend
origins = [
    "*",
    # You can add more origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # Origins that are allowed
    allow_credentials=True,
    allow_methods=["*"],          # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],          # Allow all headers
)

@app.get("/test")
async def test_endpoint():
    return {"message": "API is working!"}

# MEDICINE ENDPOINTS
@app.post("/add-or-update-medicine", response_model=Medicine)
async def add_or_update_medicine(medicine: Medicine, db=Depends(get_db)):
    """
    Add a new medicine or update the quantity and bin if it already exists.
    """
    existing = await medicines_collection.find_one({"name": medicine.name})
    
    if existing:
        # Update existing medicine
        update_result = await medicines_collection.update_one(
            {"name": medicine.name},
            {"$set": {"bin": medicine.bin, "qty": medicine.qty}}
        )
        if update_result.modified_count == 1:
            updated_medicine = await medicines_collection.find_one({"name": medicine.name})
            return updated_medicine
        else:
            raise HTTPException(status_code=500, detail="Failed to update medicine")
    else:
        # Insert new medicine
        medicine_dict = medicine.dict()
        await medicines_collection.insert_one(medicine_dict)
        return medicine_dict

@app.get("/medicines", response_model=List[Medicine])
async def list_medicines(db=Depends(get_db)):
    """
    List all medicines in the database.
    """
    medicines = await medicines_collection.find().to_list(100)
    return medicines

#ORDER ENDPOINTS

@app.post("/create-order", response_model=Order)
async def create_order(order: Order, db=Depends(get_db)):
    """
    Create a new order:
    - Status will be 'pending'
    - Get list of bins from medicine names
    """
    bins = []
    for item in order.items:
        medicine = await medicines_collection.find_one({"name": item.medicine_name})
        if not medicine:
            raise HTTPException(status_code=404, detail=f"Medicine '{item.medicine_name}' not found")
        bins.append(medicine["bin"])
    
    order_dict = order.dict()
    order_dict["status"] = "pending"
    order_dict["bins"] = bins
    
    await orders_collection.insert_one(order_dict)
    
    return order_dict

@app.get("/orders", response_model=List[Order])
async def list_orders(db=Depends(get_db)):
    """
    Get a list of all orders in the database
    """
    orders = await orders_collection.find().to_list(100)  # limit to 100 for now
    return orders

# Predefined picker colours
PICKER_COLORS = ["red", "green", "blue"]

# Keep track of active colours
active_picker_colors: List[str] = []

def order_serializer(order: dict) -> dict:
    """
    Convert MongoDB order document to JSON-serializable format.
    """
    order_copy = order.copy()
    order_copy["_id"] = str(order_copy["_id"])
    return order_copy

@app.post("/process-order/{order_id}", response_model=dict)
async def process_order(order_id: str, db=Depends(get_db)):
    global active_picker_colors

    try:
        order_obj_id = ObjectId(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID format")

    order = await orders_collection.find_one({"_id": order_obj_id})
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    # Assign colour
    available_colors = list(set(PICKER_COLORS) - set(active_picker_colors))
    if not available_colors:
        raise HTTPException(status_code=400, detail="No available picker colours at the moment")
    
    assigned_color = available_colors[0]
    active_picker_colors.append(assigned_color)

    # Update order in DB
    await orders_collection.update_one(
        {"_id": order_obj_id},
        {"$set": {"colour": assigned_color, "status": "processing"}}
    )

    updated_order = await orders_collection.find_one({"_id": order_obj_id})
    return {
        "message": f"Order {order_id} is now processing",
        "order": order_serializer(updated_order)
    }

@app.get("/active-orders", response_model=List[dict])
async def get_active_orders(db=Depends(get_db)):
    """
    Get all orders whose status is 'processing' (active orders).
    """
    active_orders_cursor = orders_collection.find({"status": "processing"})
    active_orders = await active_orders_cursor.to_list(100)  # limit to 100
    # Convert _id to string for JSON
    active_orders_serialized = [
        {**order, "_id": str(order["_id"])} for order in active_orders
    ]
    return active_orders_serialized


@app.post("/complete-order/{order_id}", response_model=dict)
async def complete_order(order_id: str, db=Depends(get_db)):
    """
    Complete an order:
    - Sets status to 'completed'
    - Removes picker colour from active list
    - Updates medicine stock quantities
    """
    global active_picker_colors

    try:
        order_obj_id = ObjectId(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID format")

    # Fetch the order
    order = await orders_collection.find_one({"_id": order_obj_id})
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    # Remove assigned colour from active picker colours
    assigned_colour = order.get("colour")
    if assigned_colour and assigned_colour in active_picker_colors:
        active_picker_colors.remove(assigned_colour)

    # Update medicine stock
    for item in order.get("items", []):
        medicine_name = item["medicine_name"]
        quantity_ordered = item["quantity"]
        medicine = await medicines_collection.find_one({"name": medicine_name})
        if not medicine:
            raise HTTPException(status_code=404, detail=f"Medicine '{medicine_name}' not found")
        new_qty = max(medicine["qty"] - quantity_ordered, 0)
        await medicines_collection.update_one(
            {"name": medicine_name},
            {"$set": {"qty": new_qty}}
        )

    # Update order status to 'completed'
    await orders_collection.update_one(
        {"_id": order_obj_id},
        {"$set": {"status": "completed"}}
    )

    updated_order = await orders_collection.find_one({"_id": order_obj_id})
    # Serialize _id
    updated_order["_id"] = str(updated_order["_id"])

    return {
        "message": f"Order {order_id} has been completed",
        "order": updated_order
    }