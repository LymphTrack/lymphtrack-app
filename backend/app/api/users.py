from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from fastapi import APIRouter, Depends, HTTPException, Body
from supabase import create_client
from datetime import datetime

import os

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ---------------------
# CREATE USER
# ---------------------

@router.post("/")
def create_user(user_data: dict = Body(...), db: Session = Depends(get_db)):
    email = user_data.get("email")
    password = user_data.get("password")
    name = user_data.get("name")
    role = user_data.get("role")
    institution = user_data.get("institution")
    user_type = user_data.get("user_type", "user") 

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    try:
        response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        auth_user = response.user
        if not auth_user:
            raise Exception("Failed to create user in Supabase auth")
    except Exception as e:
        if "already been registered" in str(e):
            auth_user = db.query(User).filter(User.email == email).first()
            if not auth_user:
                raise HTTPException(status_code=400, detail="Auth user exists but not in DB")
        else:
            raise HTTPException(status_code=500, detail=f"Error creating auth user: {str(e)}")

    user_id = auth_user.id if hasattr(auth_user, "id") else auth_user.id

    existing = db.query(User).filter(User.id == user_id).first()
    if existing:
        existing.name = name or existing.name
        existing.role = role or existing.role
        existing.institution = institution or existing.institution
        existing.user_type = user_type or existing.user_type
        if not existing.created_at:
            existing.created_at = datetime.now(datetime.timezone.utc)
        db.commit()
        db.refresh(existing)

        return {
            "status": "exists",
            "message": f"User with email {email} already exists (updated profile)",
            "auth_user_id": user_id,
            "profile": existing
        }

    new_user = User(
        id=user_id,
        email=email,
        name=name,
        role=role,
        institution=institution,
        user_type=user_type,
        created_at=datetime.now(datetime.timezone.utc)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "status": "success",
        "auth_user_id": user_id,
        "profile": new_user
    }


# ---------------------
# READ USER BY ID
# ---------------------

@router.get("/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}
    return {
        "id": str(user.id),
        "email": user.email,
        "name" : user.name,
        "role": user.role,
        "institution" : user.institution,
        "user_type": user.user_type
    }


# ---------------------
# READ ALL USERS
# ---------------------

@router.get("/")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()


# ---------------------
# UPDATE USER
# ---------------------

@router.put("/{user_id}")
def update_user(user_id: str, user_update: dict = Body(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for key, value in user_update.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


# ---------------------
# DELETE USER
# ---------------------

@router.delete("/{user_id}")
def delete_user(user_id:str , db: Session = Depends(get_db)) :
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()

    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete auth user: {str(e)}")

    return {"status": "success", "message": f"User {user_id} deleted from public and auth"}