import os
import logging
from pymongo import MongoClient

logger = logging.getLogger(__name__)

# Global MongoDB client and database
client = None
db = None

def init_db(app):
    global client, db
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/algovers")
    try:
        client = MongoClient(mongo_uri)
        # Verify connection
        client.admin.command('ping')
        
        # Get the database name from the URI or default to 'algovers'
        db_name = mongo_uri.split('/')[-1] if '/' in mongo_uri.split('mongodb://')[-1] else 'algovers'
        db_name = db_name.split('?')[0] # Remove query params if any
        if not db_name:
            db_name = 'algovers'

        db = client[db_name]
        logger.info(f"Connected successfully to MongoDB database: {db_name}")
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise e

def get_db():
    if db is None:
        raise Exception("Database not initialized. Call init_db first.")
    return db
