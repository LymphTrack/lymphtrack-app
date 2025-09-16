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
    patient = (
        db.query(models.SickPatient)
        .filter(models.SickPatient.patient_id == patient_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db.delete(patient)
    db.commit()

    prefix = f"{patient_id}/"
    try:
        continuation_token = None
        deleted_files = []

        while True:
            if continuation_token:
                response = s3.list_objects_v2(
                    Bucket=B2_BUCKET, Prefix=prefix, ContinuationToken=continuation_token
                )
            else:
                response = s3.list_objects_v2(Bucket=B2_BUCKET, Prefix=prefix)

            if "Contents" in response:
                delete_keys = [{"Key": obj["Key"]} for obj in response["Contents"]]
                deleted_files.extend([obj["Key"] for obj in response["Contents"]])

                s3.delete_objects(Bucket=B2_BUCKET, Delete={"Objects": delete_keys})

            if response.get("IsTruncated"):
                continuation_token = response.get("NextContinuationToken")
            else:
                break

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting files: {str(e)}")

    return {
        "message": f"Patient {patient_id} deleted successfully",
        "deleted_files": deleted_files,
    }

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

@router.get("/export-folder/{patient_id}")
def export_patient_folder(patient_id: str):
    try:
        # Préfixe = "dossier" du patient
        prefix = f"{patient_id}/"

        # Lister tous les fichiers sous ce préfixe
        objects = s3.list_objects_v2(Bucket=B2_BUCKET, Prefix=prefix)

        if "Contents" not in objects or len(objects["Contents"]) == 0:
            return {"status": "error", "message": f"No files found for {patient_id}"}

        # Créer un buffer mémoire pour le zip
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            for obj in objects["Contents"]:
                key = obj["Key"]

                # ignorer les "clés dossier"
                if key.endswith("/"):
                    continue  

                # Récupérer le fichier depuis B2
                file_obj = s3.get_object(Bucket=B2_BUCKET, Key=key)
                file_data = file_obj["Body"].read()

                # Garder une structure propre dans le zip
                arcname = key.replace(prefix, "")
                zipf.writestr(arcname, file_data)

        zip_buffer.seek(0)

        # Retourner le zip en téléchargement
        return Response(
            content=zip_buffer.read(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={patient_id}.zip"
            },
        )

    except Exception as e:
        return {"status": "error", "message": str(e)}