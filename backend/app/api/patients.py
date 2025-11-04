from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.db import models
from app.db.database import get_db
import io
import zipfile
import os
import shutil
from pydantic import BaseModel
from pathlib import Path

router = APIRouter()

# Dossier racine des patients
DATA_ROOT = Path(r"C:\Users\Pimprenelle\Documents\LymphTrackData")

# ---------------------
# CREATE PATIENT
# ---------------------
@router.post("/")
def create_patient(patient: dict, db: Session = Depends(get_db)):
    prefix = "MV"

    custom_id = patient.get("patient_id")
    if custom_id:
        if not custom_id.startswith(prefix):
            raise HTTPException(status_code=400, detail="Patient ID must start with 'MV'")
        existing = db.query(models.SickPatient).filter(models.SickPatient.patient_id == custom_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Patient ID {custom_id} already exists")
        patient_id = custom_id
    else:
        last_patient = db.query(models.SickPatient).order_by(models.SickPatient.patient_id.desc()).first()
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
        age=patient.get("age"),
        gender=patient.get("gender"),
        bmi=patient.get("bmi"),
        lymphedema_side=patient.get("lymphedema_side"),
        notes=patient.get("notes"),
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    try:
        patient_folder = DATA_ROOT / patient_id
        patient_folder.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Erreur de création de dossier pour {patient_id}")

    return new_patient

# ---------------------
# GET PATIENT
# ---------------------
@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.SickPatient).filter(models.SickPatient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# ---------------------
# GET ALL PATIENTS
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
    patient = db.query(models.SickPatient).filter(models.SickPatient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db.delete(patient)
    db.commit()

    patient_folder = DATA_ROOT / patient_id
    deleted_files = []

    try:
        if patient_folder.exists():
            shutil.rmtree(patient_folder)
            deleted_files.append(str(patient_folder.resolve()))
            print(f"Dossier supprimé : {patient_folder.resolve()}")
        else:
            print(f"Aucun dossier à supprimer pour {patient_id}")
    except Exception as e:
        print(f"Erreur lors de la suppression du dossier {patient_folder}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting folder for {patient_id}: {str(e)}")

    return {
        "status": "success",
        "message": f"Patient {patient_id} deleted successfully",
        "deleted_folders": deleted_files
    }

# ---------------------
# EXPORT PATIENT FOLDER
# ---------------------
@router.get("/export-folder/{patient_id}")
def export_patient_folder(patient_id: str):
    patient_folder = DATA_ROOT / patient_id
    if not patient_folder.exists():
        raise HTTPException(status_code=404, detail=f"No folder found for {patient_id}")

    backend_dir = Path(__file__).resolve().parent
    output_zip = backend_dir / f"{patient_id}.zip"

    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
        for file_path in patient_folder.rglob("*"):
            if file_path.is_file():
                rel_path = file_path.relative_to(DATA_ROOT)
                zipf.write(file_path, rel_path)

    with open(output_zip, "rb") as f:
        content = f.read()

    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={patient_id}.zip"},
    )


# ---------------------
# EXPORT MULTIPLE FOLDERS
# ---------------------
class PatientsExportRequest(BaseModel):
    patient_ids: list[str]

@router.post("/export-multiple/")
def export_multiple_patients(request: PatientsExportRequest):
    patient_ids = request.patient_ids
    if not patient_ids:
        raise HTTPException(status_code=400, detail="No patient IDs provided")

    backend_dir = Path(__file__).resolve().parent
    output_zip = backend_dir / f"patients_export_{len(patient_ids)}.zip"

    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
        for pid in patient_ids:
            folder_path = DATA_ROOT / pid
            if not folder_path.exists():
                continue
            for file_path in folder_path.rglob("*"):
                if file_path.is_file():
                    rel_path = file_path.relative_to(DATA_ROOT)
                    zipf.write(file_path, rel_path)

    with open(output_zip, "rb") as f:
        content = f.read()

    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={output_zip.name}"},
    )