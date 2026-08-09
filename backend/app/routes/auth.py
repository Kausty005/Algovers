from flask import Blueprint, request, jsonify
from app.db import get_db
import bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not email or not password or not name:
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db()
    users_collection = db.users

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "Email already exists"}), 409

    # Hash password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    user = {
        "email": email,
        "password": hashed_password.decode('utf-8'),
        "name": name,
        "created_at": datetime.datetime.utcnow()
    }

    result = users_collection.insert_one(user)
    user_id = str(result.inserted_id)

    # Generate JWT
    access_token = create_access_token(identity=user_id)

    return jsonify({
        "message": "User created successfully",
        "token": access_token,
        "user": {
            "id": user_id,
            "email": email,
            "name": name
        }
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    db = get_db()
    users_collection = db.users

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({"error": "Invalid email or password"}), 401

    user_id = str(user['_id'])
    access_token = create_access_token(identity=user_id)

    return jsonify({
        "message": "Login successful",
        "token": access_token,
        "user": {
            "id": user_id,
            "email": user['email'],
            "name": user.get('name', 'User')
        }
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    from bson.objectid import ObjectId
    
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({
        "user": {
            "id": str(user['_id']),
            "email": user['email'],
            "name": user.get('name', 'User')
        }
    }), 200
