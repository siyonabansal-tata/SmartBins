# db.py
import os
from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "warehouse")

# Initialize MongoDB client
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# Collections
medicines_collection = db["medicines"]
orders_collection = db["orders"]

async def get_db() -> AsyncGenerator:
    """
    Async generator to provide the db instance.
    Can be used with FastAPI's Depends.
    """
    try:
        yield db
    finally:
        pass  # No need to close client in async app; it will close on shutdown
