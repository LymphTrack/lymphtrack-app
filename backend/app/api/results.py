from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.db.models import Result, Operation
from app.db.database import get_db

import boto3, os
import pandas as pd
from botocore.config import Config
from dotenv import load_dotenv
from datetime import datetime, timezone

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

# -------------------------------
# 🔹 Config S3
# -------------------------------
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

# -------------------------------
# 🔹 Récupération des résultats
# -------------------------------
@router.get("/{id_operation}/{position}")
def get_results(id_operation: int, position: int, db: Session = Depends(get_db)):
    return (
        db.query(Result)
        .filter(Result.id_operation == id_operation, Result.position == position)
        .order_by(Result.measurement_number.asc())
        .all()
    )

# -------------------------------
# 🔹 Suppression fichiers du storage
# -------------------------------
@router.post("/delete-measurements")
def delete_measurements(paths: list[str]):
    try:
        objects = [{"Key": p} for p in paths]
        s3.delete_objects(Bucket=B2_BUCKET, Delete={"Objects": objects})
        return {"status": "success", "deleted": paths}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# -------------------------------
#  calcul avant → upload après
# -------------------------------
@router.post("/process-results/{id_operation}/{position}")
async def process_results(
    id_operation: int,
    position: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    try:
        operation = db.query(Operation).filter(Operation.id_operation == id_operation).first()
        if not operation:
            return {"status": "error", "message": "Operation not found"}

        patient_id = operation.patient_id

        all_ops = (
            db.query(Operation)
            .filter(Operation.patient_id == patient_id)
            .order_by(Operation.operation_date.asc())
            .all()
        )
        visit_number = {op.id_operation: idx + 1 for idx, op in enumerate(all_ops)}[operation.id_operation]
        visit_name = operation.name.replace(" ", "_")
        visit_str = f"{visit_number}_{visit_name}_{operation.operation_date.strftime('%d%m%Y')}"

        processed_results = []

        for idx, file in enumerate(files, start=1):
            if file.filename.endswith(".csv"):
                df = pd.read_csv(file.file)
            else:
                df = pd.read_excel(file.file)

            freq_col = [c for c in df.columns if "Freq" in c or "frequency" in c.lower()][0]
            rl_col = [c for c in df.columns if "S11" in c or "return" in c.lower()][0]

            freqs = df[freq_col].values
            s11 = df[rl_col].values

            min_idx = s11.argmin()
            min_return_loss = float(s11[min_idx])
            min_freq = float(freqs[min_idx])

            mask = s11 < -3
            bandwidth = None
            if mask.any():
                bw_freqs = freqs[mask]
                bandwidth = float(bw_freqs.max() - bw_freqs.min())

            file.file.seek(0)
            archive_path = f"{patient_id}/{visit_str}/{position}/{file.filename}"
            s3.upload_fileobj(file.file, B2_BUCKET, archive_path)

            result = Result(
                id_operation=id_operation,
                position=position,
                measurement_number=idx,
                min_return_loss_db=min_return_loss,
                min_frequency_hz=min_freq,
                bandwidth_hz=bandwidth,
                file_path=archive_path,
                file_name=file.filename,
                uploaded_at=datetime.now(timezone.utc),
            )
            db.add(result)
            processed_results.append(result)

        db.commit()

        logger.info(f"Processed {len(processed_results)} results")
        print("Processed results:", processed_results) 

        return {"status": "success", "results": processed_results}

    except Exception as e:
        return {"status": "error", "message": str(e)}
