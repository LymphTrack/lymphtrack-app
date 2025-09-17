from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.models import Operation
from app.db.database import get_db
import boto3, os
from dotenv import load_dotenv
from botocore.config import Config
from mega import Mega

load_dotenv()

router = APIRouter()

EMAIL = os.getenv("MEGA_EMAIL")
PASSWORD = os.getenv("MEGA_PASSWORD")

mega = Mega()
m = mega.login(EMAIL, PASSWORD)

root_folder = m.find("lymphtrack-data")
if not root_folder:
    raise Exception("Folder 'lymphtrack-data' was not found in Mega.nz")
root_id = root_folder[0]

# ---------------------
# CREATE OPERATION
# ---------------------

@router.post("/")
def create_operation(op_data: dict = Body(...), db: Session = Depends(get_db)):
    try:
        new_op = Operation(**op_data)
        db.add(new_op)
        db.commit()
        db.refresh(new_op)

        patient_id = new_op.patient_id

        all_ops = (
            db.query(Operation)
            .filter(Operation.patient_id == patient_id)
            .order_by(Operation.operation_date.asc())
            .all()
        )

        visit_number = {o.id_operation: idx + 1 for idx, o in enumerate(all_ops)}[new_op.id_operation]
        visit_str = f"{visit_number}_{new_op.name.replace(' ', '_')}_{new_op.operation_date.strftime('%d%m%Y')}"
        visit_folder = m.create_folder(f"lymphtrack-data/{patient_id}/{visit_str}")

        for pos in range(1, 7):
            m.create_folder(f"lymphtrack-data/{patient_id}/{visit_str}/{pos}")

        return {
            "status": "success",
            "operation": new_op,
            "patient_id": patient_id,
            "id_operation": new_op.id_operation,
            "visit_str": visit_str,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating operation: {e}")


# -----------------------
# READ OPERATION BY ID
# -----------------------

@router.get("/{id_operation}")
def get_operation(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    return op


# --------------------------------
# READ ALL OPERATIONS BY PATIENT
# --------------------------------

@router.get("/by_patient/{patient_id}")
def get_operations(patient_id: str, db: Session = Depends(get_db)):
    ops = db.query(Operation).filter(Operation.patient_id == patient_id).all()
    return ops


# --------------------------------
# READ ALL OPERATIONS
# --------------------------------

@router.get("/")
def get_operations(db: Session = Depends(get_db)):
    ops = db.query(Operation).all()
    return ops


# ---------------------
# UPDATE OPERATION
# ---------------------

@router.put("/{id_operation}")
def update_operation(id_operation: int, updated_data: dict, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    old_name = op.name
    old_date = op.operation_date

    for key, value in updated_data.items():
        if hasattr(op, key):
            setattr(op, key, value)

    db.commit()
    db.refresh(op)

    if op.name != old_name or op.operation_date != old_date:
        try:
            patient_id = op.patient_id

            all_ops = (
                db.query(Operation)
                .filter(Operation.patient_id == patient_id)
                .order_by(Operation.operation_date.asc())
                .all()
            )
            visit_number = {o.id_operation: idx + 1 for idx, o in enumerate(all_ops)}[op.id_operation]

            old_visit_str = f"{visit_number}_{old_name.replace(' ', '_')}_{old_date.strftime('%d%m%Y')}"
            new_visit_str = f"{visit_number}_{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"

            old_folder = m.find(f"lymphtrack-data/{patient_id}/{old_visit_str}")
            if old_folder:
                m.create_folder(f"lymphtrack-data/{patient_id}/{new_visit_str}")
                for pos in range(1, 7):
                    m.create_folder(f"lymphtrack-data/{patient_id}/{new_visit_str}/{pos}")

                files = m.get_files_in_node(old_folder[0])
                for f in files:
                    file_name = f["a"]["n"]
                    tmp_path = f"tmp_{file_name}"
                    m.download(f, tmp_path)

                    pos = None
                    for i in range(1, 7):
                        if f"/{i}/" in file_name or file_name.startswith(f"{i}_"):
                            pos = i
                            break
                        
                    if pos:
                        m.upload(tmp_path, m.find(f"lymphtrack-data/{patient_id}/{new_visit_str}/{pos}")[0])
                    else:
                        m.upload(tmp_path, m.find(f"lymphtrack-data/{patient_id}/{new_visit_str}")[0])

                    os.remove(tmp_path)

                m.delete(old_folder[0])

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error renaming folder in Mega: {e}")

    return op


# ---------------------
# DELETE OPERATION
# ---------------------

@router.delete("/{id_operation}")
def delete_operation(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    patient_id = op.patient_id

    all_ops = (
        db.query(Operation)
        .filter(Operation.patient_id == patient_id)
        .order_by(Operation.operation_date.asc())
        .all()
    )
    visit_number = {o.id_operation: idx + 1 for idx, o in enumerate(all_ops)}[op.id_operation]
    visit_str = f"{visit_number}_{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"

    try:
        folder = m.find(f"lymphtrack-data/{patient_id}/{visit_str}")
        if folder:
            m.delete(folder[0]) 

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting operation folder in Mega: {e}")

    db.delete(op)
    db.commit()

    return {
        "message": f"Operation {id_operation} deleted successfully",
        "patient_id": patient_id,
        "deleted_folder": visit_str
    }
