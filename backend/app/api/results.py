from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.models import Result, Operation
from app.db.database import get_db
from mega import Mega

import os
import traceback
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from datetime import datetime, timezone

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

def infer_header_and_data(raw_df, key_cols, max_header_row=10):
    for idx in range(min(max_header_row, len(raw_df))):
        header = raw_df.iloc[idx].astype(str)
        cols = header.str.lower().str.replace(r"\s+", "", regex=True)
        if all(any(k in c for c in cols) for k in key_cols):
            df = raw_df.iloc[idx+1:].copy()
            df.columns = cols
            return df
    return None

load_dotenv()

EMAIL = os.getenv("MEGA_EMAIL")
PASSWORD = os.getenv("MEGA_PASSWORD")

mega = Mega()
m = mega.login(EMAIL, PASSWORD)


# ---------------------
# CREATE RESULT
# ---------------------

@router.post("/process-results/{id_operation}/{position}")
async def create_results(
    id_operation: int,
    position: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
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

        old_results = (
            db.query(Result)
            .filter(Result.id_operation == id_operation, Result.position == position)
            .all()
        )

        for r in old_results:
            try:
                file_name = r.file_path.split("/")[-1]
                file_node = m.find(file_name)
                if file_node:
                    m.delete(file_node[0])
                else:
                    logging.warning(f"File {file_name} not found in Mega, skipping deletion")
            except Exception as e:
                logging.warning(f"Could not delete old file {r.file_path}: {e}")

            db.delete(r)

        db.commit()

        for idx, file in enumerate(files, start=1):
            df = None
            suffix = file.filename.split(".")[-1].lower()

            try:
                if suffix == ".csv":
                    tmp = pd.read_csv(file.file, header=0, sep=None, engine="python")
                    cols = (
                        tmp.columns.astype(str)
                        .str.strip()
                        .str.lower()
                        .str.replace(r"\s+", "", regex=True)
                    )
                    if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                        df = tmp.copy()
                        df.columns = cols
                    else:
                        raw = pd.read_csv(file.file, header=None, sep=None, engine="python")
                        df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
                else:
                    tmp = pd.read_excel(file.file, header=0)
                    cols = (
                        tmp.columns.astype(str)
                        .str.strip()
                        .str.lower()
                        .str.replace(r"\s+", "", regex=True)
                    )
                    if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                        df = tmp.copy()
                        df.columns = cols
                    else:
                        raw = pd.read_excel(file.file, header=None)
                        df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
            except Exception as e:
                logging.warning(f"Skipping {file.filename}: read error: {e}")
                continue

            if df is None:
                logging.warning(f"Skipping {file.filename}: could not infer or find header")
                continue

            df.columns = (
                df.columns.astype(str)
                .str.strip()
                .str.lower()
                .str.replace(r"\s+", "", regex=True)
            )

            freq_cols = [c for c in df.columns if "freq" in c]
            rl_cols = [c for c in df.columns if "s11" in c or "returnloss" in c]
            if not freq_cols or not rl_cols:
                logging.warning(f"Skipping {file.filename}: missing freq or return loss columns")
                continue

            freq_col = freq_cols[0]
            rl_col = rl_cols[0]

            df_vals = df[[freq_col, rl_col]].astype(str).map(lambda x: x.replace(",", "."))
            df_sub = df_vals.apply(pd.to_numeric, errors="coerce").dropna()
            if df_sub.empty:
                logging.warning(f"Skipping {file.filename}: no numeric data after coercion")
                continue

        min_idx = df_sub[rl_col].idxmin()
        min_freq = df_sub.at[min_idx, freq_col]
        min_rl = df_sub.at[min_idx, rl_col]
        mask = df_sub[rl_col] <= -3
        bw = np.nan
        if mask.any():
            freqs = df_sub.loc[mask, freq_col]
            bw = freqs.max() - freqs.min()

        file.file.seek(0)

        archive_path = f"{patient_id}/{visit_str}/{position}/{file.filename}"

        tmp_path = f"tmp_{file.filename}"
        with open(tmp_path, "wb") as tmp_f:
            tmp_f.write(file.file.read())

        dest_folder = m.find(f"lymphtrack-data/{patient_id}/{visit_str}/{position}")
        if not dest_folder:
            dest_folder = m.create_folder(f"lymphtrack-data/{patient_id}/{visit_str}/{position}")

        m.upload(tmp_path, dest_folder[0])

        os.remove(tmp_path)

        result = Result(
            id_operation=int(id_operation),
            position=int(position),
            measurement_number=int(idx),
            min_return_loss_db=float(min_rl),
            min_frequency_hz=int(min_freq),
            bandwidth_hz=float(bw) if bw is not None and not pd.isna(bw) else None,
            file_path=archive_path, 
            uploaded_at=datetime.now(timezone.utc),
        )
        db.add(result)
        processed_results.append(result)


        db.commit()

        return {"status": "success", "results": processed_results}

    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


# ---------------------
# READ ALL RESULTS
# ---------------------

@router.get("/")
def get_results(db: Session = Depends(get_db)):
    return db.query(Result).all()


# ---------------------
# READ RESULT BY ID
# ---------------------

@router.get("/{id_operation}")
def get_results(id_operation: int, db: Session = Depends(get_db)):
    results = (
        db.query(Result)
        .filter(Result.id_operation == id_operation)
        .order_by(Result.position, Result.measurement_number)
        .all()
    )
    return results


# ------------------------
# READ RESULT BY PATIENT
# ------------------------

@router.get("/{patient_id}")
def get_results(patient_id: str, db: Session = Depends(get_db)):
    results = (
        db.query(Result)
        .filter(Result.patient_id == patient_id)
        .all()
    )
    return results


# -----------------------------------
# READ RESULT BY VISIT AND POSITION
# -----------------------------------
@router.get("/{id_operation}/{position}")
def get_results(id_operation: int, position: int, db: Session = Depends(get_db)):
    results = (
        db.query(Result)
        .filter(Result.id_operation == id_operation, Result.position == position)
        .order_by(Result.measurement_number.asc())
        .all()
    )

    return [
        {
            "id": r.id,
            "measurement_number": r.measurement_number,
            "file_path": r.file_path,
            "file_name": r.file_path.split("/")[-1] if r.file_path else None,
            "min_return_loss_db": r.min_return_loss_db,
            "min_frequency_hz": r.min_frequency_hz,
            "bandwidth_hz": r.bandwidth_hz,
        }
        for r in results
    ]


# ---------------------
# DELETE RESULT
# ---------------------

@router.post("/delete-measurements")
def delete_measurements(payload: dict, db: Session = Depends(get_db)):
    try:
        file_path = payload.get("file_path")
        if not file_path:
            return {"status": "error", "message": "No file_path provided"}

        file_name = file_path.split("/")[-1]

        try:
            file_node = m.find(file_name)
            if file_node:
                m.delete(file_node[0])
            else:
                print(f"[INFO] File {file_name} not found in Mega, skipping deletion")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error deleting file from Mega: {e}")

        results = db.query(Result).filter(Result.file_path == file_path).all()
        if results:
            for r in results:
                db.delete(r)
            db.commit()
        else:
            return {"status": "error", "message": f"No DB record found for {file_path}"}

        return {"status": "success", "deleted": [file_path]}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}



