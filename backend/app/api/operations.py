from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.models import Operation, Result
from app.db.database import get_db

import boto3, os

router = APIRouter()

@router.get("/by_patient/{patient_id}")
def get_operations(patient_id: str, db: Session = Depends(get_db)):
    ops = db.query(Operation).filter(Operation.patient_id == patient_id).all()
    return ops

@router.get("/{id_operation}")
def get_operation(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    return op

@router.get("/{id_operation}/results")
def get_results(id_operation: int, db: Session = Depends(get_db)):
    results = (
        db.query(Result)
        .filter(Result.id_operation == id_operation)
        .order_by(Result.position, Result.measurement_number)
        .all()
    )
    return results

@router.delete("/{id_operation}")
def delete_operation(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    db.delete(op)
    db.commit()
    return {"message": "Operation deleted successfully"}

@router.put("/{id_operation}")
def update_operation(id_operation: int, updated_data: dict, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    for key, value in updated_data.items():
        if hasattr(op, key):
            setattr(op, key, value)

    db.commit()
    db.refresh(op)
    return op

@router.post("/")
def create_operation(op_data: dict = Body(...), db: Session = Depends(get_db)):
    try:
        new_op = Operation(**op_data)
        db.add(new_op)
        db.commit()
        db.refresh(new_op)
        return new_op
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating operation: {e}")
    

@router.get("/operations/{id_operation}/positions/{position}/measurements")
def get_measurements(id_operation: int, position: int, db: Session = Depends(get_db)):
    measurements = (
        db.query(Result)
        .filter(Result.id_operation == id_operation, Result.position == position)
        .order_by(Result.measurement_number.asc())
        .all()
    )

    return [
        {
            "id": m.id,
            "measurement_number": m.measurement_number,
            "file_path": m.file_path,
            "file_name": os.path.basename(m.file_path) if m.file_path else None
        }
        for m in measurements
    ]

