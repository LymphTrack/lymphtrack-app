from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.db import models
from app.db.database import get_db
import io
import zipfile
import os
from dotenv import load_dotenv
from botocore.config import Config
from mega import Mega

router = APIRouter()

load_dotenv()

EMAIL = os.getenv("MEGA_EMAIL")
PASSWORD = os.getenv("MEGA_PASSWORD")

mega = Mega()
m = mega.login(EMAIL, PASSWORD)

root_folder = m.find("lymphtrack-data")
if not root_folder:
    raise Exception("Folder 'lymphtrack-data' was not found in Mega.nz")
root_id = root_folder[0]

# ---------------------
# CREATE PATIENT
# ---------------------

@router.post("/")
def create_patient(patient: dict, db: Session = Depends(get_db)):
    prefix = "MV"

    last_patient = (
        db.query(models.SickPatient)
        .order_by(models.SickPatient.patient_id.desc())
        .first()
    )

    if last_patient and last_patient.patient_id.startswith(prefix):
        try:
            last_number = int(last_patient.patient_id.replace(prefix, ""))
            next_number = str(last_number + 1).zfill(3)
        except ValueError:
            next_number = "001"
    else:
        next_number = "001"

    patient_id = f"{prefix}{next_number}"

    new_patient = models.SickPatient(
        patient_id=patient_id,
        age=patient["age"],
        gender=patient["gender"],
        bmi=patient["bmi"],
        lymphedema_side=patient["lymphedema_side"],
        notes=patient.get("notes")
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    m.create_folder(f"lymphtrack-data/{patient_id}")

    return new_patient


# ---------------------
# READ PATIENT BY ID
# ---------------------

@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.SickPatient).filter(models.SickPatient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# ---------------------
# READ ALL PATIENTS
# ---------------------

@router.get("/")
def get_patients(db: Session = Depends(get_db)):
    return db.query(models.SickPatient).all()


# ---------------------
# UPDATE PATIENT
# ---------------------

@router.put("/{patient_id}")
def update_patient(patient_id: str, updated_data: dict, db: Session = Depends(get_db)):
    patient = db.query(models.SickPatient).filter(models.SickPatient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for key, value in updated_data.items():
        if hasattr(patient, key):
            setattr(patient, key, value)

    db.commit()
    db.refresh(patient)
    return patient


# ---------------------
# DELETE PATIENT
# ---------------------

@router.delete("/{patient_id}")
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = (
        db.query(models.SickPatient)
        .filter(models.SickPatient.patient_id == patient_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db.delete(patient)
    db.commit()

    try:
        folder = m.find(f"lymphtrack-data/{patient_id}")
        if folder:
            m.delete(folder[0])
            deleted_files = [patient_id]
        else:
            deleted_files = []

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting files: {str(e)}")

    return {
        "message": f"Patient {patient_id} deleted successfully",
        "deleted_files": deleted_files,
    }


# ------------------------
# EXPORT PATIENT FOLDER
# ------------------------

@router.get("/export-folder/{patient_id}")
def export_patient_folder(patient_id: str):
    try:
        folder = m.find(f"lymphtrack-data/{patient_id}")
        if not folder:
            return {"status": "error", "message": f"No files found for {patient_id}"}

        files = m.get_files_in_node(folder[0])
        if not files:
            return {"status": "error", "message": f"No files found for {patient_id}"}

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            for f in files:
                file_name = f['a']['n']
                temp_path = f"tmp_{file_name}"
                m.download(f, temp_path)
                with open(temp_path, "rb") as temp_file:
                    zipf.writestr(file_name, temp_file.read())
                os.remove(temp_path)

        zip_buffer.seek(0)
        return Response(
            content=zip_buffer.read(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={patient_id}.zip"
            },
        )

    except Exception as e:
        return {"status": "error", "message": str(e)}