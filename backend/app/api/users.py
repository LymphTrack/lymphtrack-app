from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from fastapi import Body
from fastapi import APIRouter, Depends, HTTPException


router = APIRouter()

@router.get("/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.id == user_id).first()

@router.put("/{user_id}")
def update_user(user_id: str, user_update: dict = Body(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for key, value in user_update.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user
