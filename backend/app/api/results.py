from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.db.models import Result, Operation
from app.db.database import get_db

import boto3, os
import traceback
import pandas as pd
import numpy as np
from botocore.config import Config
from dotenv import load_dotenv
from datetime import datetime, timezone

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

# -------------------------------
# 🔹 Helper pour détecter la ligne d'entête
# -------------------------------
def infer_header_and_data(raw_df, key_cols, max_header_row=10):
    for idx in range(min(max_header_row, len(raw_df))):
        header = raw_df.iloc[idx].astype(str)
        cols = header.str.lower().str.replace(r"\s+", "", regex=True)
        if all(any(k in c for c in cols) for k in key_cols):
            df = raw_df.iloc[idx + 1 :].copy()
            df.columns = cols
            return df
    return None

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
# 🔹 Calcul avant → upload après
# -------------------------------
@router.post("/process-results/{id_operation}/{position}")
async def process_results(
    id_operation: int,
    position: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    try:
        # Vérifier que l’opération existe
        operation = db.query(Operation).filter(Operation.id_operation == id_operation).first()
        if not operation:
            return {"status": "error", "message": "Operation not found"}

        patient_id = operation.patient_id

        # Déterminer le numéro de visite
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

        # -------------------------------
        # 🔹 Boucle sur les fichiers
        # -------------------------------
        for idx, file in enumerate(files, start=1):
            df = None
            suffix = file.filename.split(".")[-1].lower()

            try:
                if suffix == "csv":
                    tmp = pd.read_csv(file.file, header=0, sep=None, engine="python")
                else:
                    tmp = pd.read_excel(file.file, header=0)

                # Normaliser colonnes
                cols = (
                    tmp.columns.astype(str)
                    .str.strip()
                    .str.lower()
                    .str.replace(r"\s+", "", regex=True)
                )
                tmp.columns = cols

                if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                    df = tmp
                else:
                    # Fallback brut
                    file.file.seek(0)
                    raw = (
                        pd.read_csv(file.file, header=None, sep=None, engine="python")
                        if suffix == "csv"
                        else pd.read_excel(file.file, header=None)
                    )
                    df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
            except Exception as e:
                return {"status": "error", "message": f"Read error {file.filename}: {str(e)}"}

            if df is None:
                return {"status": "error", "message": f"Could not parse {file.filename}"}

            # Colonnes utiles
            freq_cols = [c for c in df.columns if "freq" in c]
            rl_cols = [c for c in df.columns if "s11" in c or "returnloss" in c]

            if not freq_cols or not rl_cols:
                return {
                    "status": "error",
                    "message": f"Missing freq/returnloss in {file.filename}. Got {list(df.columns)}",
                }

            freq_col = freq_cols[0]
            rl_col = rl_cols[0]

            # Convertir valeurs en numériques (gérer virgules décimales)
            df_vals = df[[freq_col, rl_col]].astype(str).applymap(lambda x: x.replace(",", "."))
            df_sub = df_vals.apply(pd.to_numeric, errors="coerce").dropna()

            if df_sub.empty:
                return {"status": "error", "message": f"No numeric data in {file.filename}"}

            # ⚡ Calculs
            min_idx = df_sub[rl_col].idxmin()
            min_freq = df_sub.at[min_idx, freq_col]
            min_rl = df_sub.at[min_idx, rl_col]

            mask = df_sub[rl_col] <= -3
            bw = None
            if mask.any():
                freqs = df_sub.loc[mask, freq_col]
                bw = freqs.max() - freqs.min()

            # Upload fichier uniquement si calcul OK
            file.file.seek(0)
            archive_path = f"{patient_id}/{visit_str}/{position}/{file.filename}"
            s3.upload_fileobj(file.file, B2_BUCKET, archive_path)

            # Sauvegarde en DB
            result = Result(
                id_operation=id_operation,
                position=position,
                measurement_number=idx,
                min_return_loss_db=min_rl,
                min_frequency_hz=min_freq,
                bandwidth_hz=bw,
                file_path=archive_path,
                file_name=file.filename,
                uploaded_at=datetime.now(timezone.utc),
            )
            db.add(result)
            processed_results.append(result)

        db.commit()

        # Sérialisation JSON-friendly
        results_json = [
            {
                "id": r.id,
                "measurement_number": r.measurement_number,
                "file_name": r.file_name,
                "file_path": r.file_path,
                "min_return_loss_db": r.min_return_loss_db,
                "min_frequency_hz": r.min_frequency_hz,
                "bandwidth_hz": r.bandwidth_hz,
                "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
            }
            for r in processed_results
        ]

        logger.info(f"Processed {len(processed_results)} results")
        print("Processed results:", results_json)

        return {"status": "success", "results": results_json}

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": str(e)}
