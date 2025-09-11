from fastapi import APIRouter, Depends, UploadFile, Form
from sqlalchemy.orm import Session
from app.db.models import Result, Operation
from app.db.database import get_db

import boto3, os
import pandas as pd
from botocore.config import Config
from dotenv import load_dotenv
from io import BytesIO
from datetime import datetime, timezone

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

        visit_name_clean = operation.visit_name.replace(" ", "_")

        visit_str = f"{operation.visit_number}_{visit_name_clean}_{operation.visit_date.strftime('%d%m%Y')}"

        archive_path = f"{patient_id}/{visit_str}/{position}/{file.filename}"

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
    try:
        results = db.query(Result).filter(Result.id_operation == id_operation, Result.position == position).all()

        processed = []
        for idx, res in enumerate(results, start=1):
            buffer = BytesIO()
            s3.download_fileobj(B2_BUCKET, res.file_path, buffer)
            buffer.seek(0)

            if res.file_path.endswith(".csv"):
                df = pd.read_csv(buffer)
            else:
                df = pd.read_excel(buffer)

            freq_col = [c for c in df.columns if "Freq" in c or "frequency" in c.lower()][0]
            rl_col = [c for c in df.columns if "S11" in c or "return" in c.lower()][0]

            freqs = df[freq_col].values
            s11 = df[rl_col].values

            min_idx = s11.argmin()
            min_return_loss = float(s11[min_idx])
            min_freq = float(freqs[min_idx])

            mask = s11 < -3
            if mask.any():
                bw_freqs = freqs[mask]
                bandwidth = float(bw_freqs.max() - bw_freqs.min())
            else:
                bandwidth = None

            res.measurement_number = idx
            res.min_return_loss_db = min_return_loss
            res.min_frequency_hz = min_freq
            res.bandwidth_hz = bandwidth
            res.uploaded_at = datetime.now(timezone.utc)

            processed.append(res)

        db.commit()

        return {"status": "success", "results": processed}

    except Exception as e:
        return {"status": "error", "message": str(e)}
