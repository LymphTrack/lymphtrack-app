from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.db import models
from app.db.database import get_db
import io
import zipfile
import boto3, os
from dotenv import load_dotenv
from botocore.config import Config

router = APIRouter()

load_dotenv()

B2_ENDPOINT = os.getenv("ENDPOINT_URL_YOUR_BUCKET")
B2_KEY_ID = os.getenv("KEY_ID_YOUR_ACCOUNT")
B2_APP_KEY = os.getenv("APPLICATION_KEY_YOUR_ACCOUNT")
B2_BUCKET = "lymphtrack-data"

s3 = boto3.client(
    "s3",
    endpoint_url=B2_ENDPOINT,
    aws_access_key_id=B2_KEY_ID,
    aws_secret_access_key=B2_APP_KEY,
    config=Config(signature_version="s3v4"),
)

@router.get("/")
def get_patients(db: Session = Depends(get_db)):
    return db.query(models.SickPatient).all()

@router.delete("/{patient_id}")
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.SickPatient).filter(models.SickPatient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()
    return {"message": "Patient deleted successfully"}

@router.post("/")
def create_patient(patient: dict, db: Session = Depends(get_db)):
    existing = db.query(models.SickPatient).filter(models.SickPatient.patient_id == patient["patient_id"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient ID already exists")

    new_patient = models.SickPatient(**patient)
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient

@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.SickPatient).filter(models.SickPatient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


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

@router.get("/patients/export-folder/{patient_id}")
def export_patient_folder(patient_id: int, db: Session = Depends(get_db)):
    try:
        prefix = f"patients/{patient_id}/"

        objects = s3.list_objects_v2(Bucket=B2_BUCKET, Prefix=prefix)

        if "Contents" not in objects:
            return {"status": "error", "message": "No files found for this patient"}

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            for obj in objects["Contents"]:
                key = obj["Key"]
                file_obj = s3.get_object(Bucket=B2_BUCKET, Key=key)
                file_data = file_obj["Body"].read()
                zipf.writestr(key.replace(prefix, ""), file_data)

        zip_buffer.seek(0)

        return Response(
            content=zip_buffer.read(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=patient_{patient_id}.zip"
            },
        )
    except Exception as e:
        return {"status": "error", "message": str(e)}