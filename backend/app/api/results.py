from fastapi import APIRouter, Depends, UploadFile, Form
from sqlalchemy.orm import Session
from app.db.models import Result, Operation
from app.db.database import get_db

import boto3, os
from botocore.config import Config
from dotenv import load_dotenv

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

@router.get("/{id_operation}/{position}")
def get_results(id_operation: int, position: int, db: Session = Depends(get_db)):
    return (
        db.query(Result)
        .filter(Result.id_operation == id_operation, Result.position == position)
        .order_by(Result.measurement_number.asc())
        .all()
    )

@router.post("/upload-measurement")
async def upload_measurement(
    id_operation: int = Form(...),
    position: int = Form(...),
    file: UploadFile = None,
    db: Session = Depends(get_db)
):
    try:
        operation = db.query(Operation).filter(Operation.id_operation == id_operation).first()
        if not operation:
            return {"status": "error", "message": "Operation not found"}

        patient_id = operation.patient_id
        operation_name = operation.name

        archive_path = f"{patient_id}/{operation_name}/{position}/{file.filename}"

        s3.upload_fileobj(file.file, B2_BUCKET, archive_path)

        return {
            "status": "success",
            "file_path": archive_path,
            "file_name": file.filename
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/delete-measurements")
def delete_measurements(paths: list[str]):
    try:
        objects = [{"Key": p} for p in paths]
        s3.delete_objects(Bucket=B2_BUCKET, Delete={"Objects": objects})
        return {"status": "success", "deleted": paths}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/{id_operation}/{position}")
def process_results(id_operation: int, position: int, db: Session = Depends(get_db)):
    # ⚠️ Ici tu mets ta logique "process-results"
    # par exemple parser les fichiers importés et remplir les résultats
    # pour le moment, on fait un simple placeholder
    results = db.query(Result).filter(Result.id_operation == id_operation, Result.position == position).all()
    return {"results": results}
