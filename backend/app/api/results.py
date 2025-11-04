from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.models import Result, Operation
from app.db.database import get_db

import os, re, tempfile, traceback, shutil
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

DATA_ROOT = Path(r"C:\Users\Pimprenelle\Documents\LymphTrackData")

# ---------------------
# Utility functions
# ---------------------

def infer_header_and_data(raw_df, key_cols, max_header_row=10):
    for idx in range(min(max_header_row, len(raw_df))):
        header = raw_df.iloc[idx].astype(str)
        cols = header.str.lower().str.replace(r"\s+", "", regex=True)
        if all(any(k in c for c in cols) for k in key_cols):
            df = raw_df.iloc[idx+1:].copy()
            df.columns = cols
            return df
    return None


def read_measurement_file(file_path: str):
    file_path = str(file_path)
    suffix = file_path.split(".")[-1].lower()

    try:
        if suffix == "csv":
            tmp = pd.read_csv(file_path, header=0, sep=None, engine="python")
            cols = tmp.columns.astype(str).str.strip().str.lower().str.replace(r"\s+", "", regex=True)

            if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                df = tmp.copy()
                df.columns = cols
            else:
                raw = pd.read_csv(file_path, header=None, sep=None, engine="python")
                df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
        else:
            tmp = pd.read_excel(file_path, header=0)
            cols = tmp.columns.astype(str).str.strip().str.lower().str.replace(r"\s+", "", regex=True)

            if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                df = tmp.copy()
                df.columns = cols
            else:
                raw = pd.read_excel(file_path, header=None)
                df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
    except Exception as e:
        logging.warning(f"[PLOT READ] {file_path}: read error {e}")
        return []

    if df is None:
        logging.warning(f"[PLOT READ] {file_path}: could not infer header")
        return []

    df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(r"\s+", "", regex=True)

    freq_cols = [c for c in df.columns if "freq" in c]
    rl_cols = [c for c in df.columns if "s11" in c or "returnloss" in c]
    if not freq_cols or not rl_cols:
        logging.warning(f"[PLOT READ] {file_path}: missing freq or return loss cols")
        return []

    freq_col, rl_col = freq_cols[0], rl_cols[0]

    df_vals = df[[freq_col, rl_col]].astype(str).map(lambda x: x.replace(",", "."))
    df_sub = df_vals.apply(pd.to_numeric, errors="coerce").dropna()

    if df_sub.empty:
        logging.warning(f"[PLOT READ] {file_path}: no numeric data after coercion")
        return []

    data_points = [
        {
            "freq_hz": float(row[freq_col]),
            "loss_db": float(row[rl_col]),
        }
        for _, row in df_sub.iterrows()
    ]

    return data_points


def merge_measurements_for_chart(measure_arrays: list[list[dict]]):
    if not measure_arrays or not measure_arrays[0]:
        return []

    length = len(measure_arrays[0])
    merged = []

    for idx in range(length):
        point = {}
        freq_hz = measure_arrays[0][idx]["freq_hz"]
        point["freq"] = freq_hz / 1e9 

        for m_index, arr in enumerate(measure_arrays):
            if idx < len(arr):
                point[f"loss{m_index + 1}"] = arr[idx]["loss_db"]

        merged.append(point)

    return merged



def extract_time_from_filename(filename: str) -> int | None:
    match = re.search(r"_(\d{6})", filename)
    if not match:
        return None

    hhmmss = match.group(1)
    try:
        hour = int(hhmmss[:2])
        minute = int(hhmmss[2:4])
        second = int(hhmmss[4:6])
    except ValueError:
        return None

    return hour * 3600 + minute * 60 + second


def process_measurement_file(file: UploadFile, id_operation: int, position: int, db: Session, visit_str: str, patient_id: str, measurement_number=1, m=None):
    try:
        suffix = file.filename.split(".")[-1].lower()
        df = None

        try:
            if suffix == "csv":
                tmp = pd.read_csv(file.file, header=0, sep=None, engine="python")
                cols = tmp.columns.astype(str).str.strip().str.lower().str.replace(r"\s+", "", regex=True)
                if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                    df = tmp.copy()
                    df.columns = cols
                else:
                    raw = pd.read_csv(file.file, header=None, sep=None, engine="python")
                    df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
            else:
                tmp = pd.read_excel(file.file, header=0)
                cols = tmp.columns.astype(str).str.strip().str.lower().str.replace(r"\s+", "", regex=True)
                if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                    df = tmp.copy()
                    df.columns = cols
                else:
                    raw = pd.read_excel(file.file, header=None)
                    df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
        except Exception as e:
            logging.warning(f"Skipping {file.filename}: read error {e}")
            return None

        if df is None:
            logging.warning(f"Skipping {file.filename}: could not infer header")
            return None

        df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(r"\s+", "", regex=True)
        freq_cols = [c for c in df.columns if "freq" in c]
        rl_cols = [c for c in df.columns if "s11" in c or "returnloss" in c]
        if not freq_cols or not rl_cols:
            logging.warning(f"Skipping {file.filename}: missing freq or return loss cols")
            return None

        freq_col, rl_col = freq_cols[0], rl_cols[0]
        df_vals = df[[freq_col, rl_col]].astype(str).map(lambda x: x.replace(",", "."))
        df_sub = df_vals.apply(pd.to_numeric, errors="coerce").dropna()
        if df_sub.empty:
            logging.warning(f"Skipping {file.filename}: no numeric data after coercion")
            return None

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

            if m:
                patient_folder = m.find(f"lymphtrack-data/{patient_id}")
                if not patient_folder:
                    try:
                        m.create_folder(f"lymphtrack-data/{patient_id}")
                        patient_folder = m.find(f"lymphtrack-data/{patient_id}")
                    except Exception as e:
                        logging.warning(f"[MEGA] create_folder patient failed: {e}")
                        patient_folder = None

                visit_folder = None
                if patient_folder:
                    sub = m.get_files_in_node(patient_folder[0])
                    for fid, meta in sub.items():
                        if meta.get("t") == 1 and meta.get("a", {}).get("n") == visit_str:
                            visit_folder = (fid, meta)
                            break
                    if not visit_folder:
                        try:
                            node = m.create_folder(visit_str, patient_folder[0])
                            if isinstance(node, dict) and "f" in node:
                                folder_id = node["f"][0]["h"]
                                visit_folder = (folder_id, node["f"][0])
                            elif isinstance(node, dict) and "h" in node:
                                visit_folder = (node["h"], node)
                            elif isinstance(node, str):
                                visit_folder = (node, {"a": {"n": visit_str}, "t": 1})
                            elif isinstance(node, dict) and any(k.isdigit() for k in node):
                                folder_id = list(node.values())[0]
                                visit_folder = (folder_id, {"a": {"n": visit_str}, "t": 1})
                            else:
                                logging.warning(f"[MEGA] Unexpected visit folder response: {node}")
                                visit_folder = None
                        except Exception as e:
                            logging.warning(f"[MEGA] create_folder visit failed: {e}")
                            visit_folder = None

                dest_folder = None
                if visit_folder:
                    subfolders = m.get_files_in_node(visit_folder[0])
                    for fid, meta in subfolders.items():
                        if meta.get("t") == 1 and meta.get("a", {}).get("n") == str(position):
                            dest_folder = (fid, meta)
                            break
                    if not dest_folder:
                        try:
                            node = m.create_folder(str(position), visit_folder[0])
                            if isinstance(node, dict) and "f" in node:
                                folder_id = node["f"][0]["h"]
                                dest_folder = (folder_id, node["f"][0])
                            elif isinstance(node, dict) and "h" in node:
                                dest_folder = (node["h"], node)
                            elif isinstance(node, str):
                                dest_folder = (node, {"a": {"n": str(position)}, "t": 1})
                            elif isinstance(node, dict) and any(k.isdigit() for k in node):
                                folder_id = list(node.values())[0]
                                dest_folder = (folder_id, {"a": {"n": str(position)}, "t": 1})
                            else:
                                logging.warning(f"[MEGA] Unexpected position folder response: {node}")
                                dest_folder = None
                        except Exception as e:
                            logging.warning(f"[MEGA] create_folder position failed: {e}")
                            dest_folder = None

                try:
                    if dest_folder:
                        up = m.upload(tmp_path, dest_folder[0], dest_filename=file.filename)
                        logging.info(f"[MEGA] Uploaded {file.filename}: {up}")
                    else:
                        logging.warning(f"[MEGA] Skip upload (no dest folder) for {file.filename}")
                except Exception as e:
                    logging.warning(f"[MEGA] Upload failed for {file.filename}: {e}")
            else:
                logging.debug("[MEGA] Client is None, skipping Mega operations")
           
            os.remove(tmp_path)

            result = Result(
                id_operation=int(id_operation),
                position=int(position),
                measurement_number=measurement_number,
                min_return_loss_db=float(min_rl),
                min_frequency_hz=int(min_freq),
                bandwidth_hz=float(bw) if not pd.isna(bw) else None,
                file_path=archive_path,
                uploaded_at=datetime.now(timezone.utc),
            )
            db.add(result)
            return result

    except Exception as e:
        logging.error(f"[PROCESS FILE] {file.filename}: {e}")
        traceback.print_exc()
        return None


# ---------------------
# CREATE RESULT
# ---------------------
@router.post("/process-results/{id_operation}/{position}")
async def create_result(id_operation: int, position: int, files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    try:
        operation = db.query(Operation).filter(Operation.id_operation == id_operation).first()
        if not operation:
            raise HTTPException(status_code=404, detail="Operation not found")

        patient_id = operation.patient_id
        all_ops = db.query(Operation).filter(Operation.patient_id == patient_id).order_by(Operation.operation_date.asc()).all()
        visit_number = {op.id_operation: idx + 1 for idx, op in enumerate(all_ops)}[id_operation]
        visit_str = f"{visit_number}-{operation.name.replace(' ', '_')}_{operation.operation_date.strftime('%d%m%Y')}"

        existing_results = db.query(Result).filter(Result.id_operation == id_operation, Result.position == position).order_by(Result.measurement_number.asc()).all()
        start_index = len(existing_results) + 1

        all_results = []
        for offset, f in enumerate(files, start=start_index):
            result = process_measurement_file(f, id_operation, position, db, visit_str, patient_id, measurement_number=offset)
            if result:
                all_results.append(result)
        db.commit()

        if not all_results:
            return {"status": "error", "message": "No valid files were processed"}
        return {"status": "success", "message": f"Processed {len(all_results)} file(s)", "results": all_results}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ---------------------
# CREATE ALL RESULT
# ---------------------

@router.post("/process-all/{id_operation}")
async def create_all_results(
    id_operation: int,
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
        visit_str = f"{visit_number}-{visit_name}_{operation.operation_date.strftime('%d%m%Y')}"

        timed_files = []
        for f in files:
            t = extract_time_from_filename(f.filename)
            if t is not None:
                timed_files.append((t, f))
            else:
                logging.warning(f"[PROCESS-ALL] Could not extract time from {f.filename}")

        if len(timed_files) < 18:
            return {"status": "error", "message": f"Expected 18 files, got {len(timed_files)}"}

        timed_files.sort(key=lambda x: x[0])
        sorted_files = [f for _, f in timed_files]

        grouped = {pos: sorted_files[(pos - 1) * 3: pos * 3] for pos in range(1, 7)}

        all_results = []
        counter_db = 0
        batch_size_db = 5

        for pos, pos_files in grouped.items():
            for idx, f in enumerate(pos_files, start=1):
                result = process_measurement_file(
                    f,
                    id_operation,
                    pos,
                    db,
                    visit_str,
                    patient_id,
                    measurement_number=idx,
                )
                if result:
                    all_results.append(result)
                    counter_db += 1
                    if counter_db % batch_size_db == 0:
                        db.commit()

        db.commit()

        if not all_results:
            return {"status": "error", "message": "No valid files were processed"}

        return {
            "status": "success",
            "message": f"Processed {len(all_results)} files across 6 positions",
            "results": all_results,
        }

    except Exception as e:
        db.rollback()
        logging.error(f"[PROCESS-ALL] {e}")
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

@router.get("/by_operation/{id_operation}")
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

@router.get("/by_patient/{patient_id}")
def get_results_by_patient(patient_id: str, db: Session = Depends(get_db)):
    results = (
        db.query(Result)
        .join(Operation, Result.id_operation == Operation.id_operation)
        .filter(Operation.patient_id == patient_id)
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

        parts = Path(file_path).parts
        if len(parts) < 4:
            return {"status": "error", "message": f"Invalid file_path format: {file_path}"}

        patient_id, visit_str, position, file_name = parts[-4:]

        result = db.query(Result).filter(Result.file_path == file_path).first()
        if not result:
            return {"status": "error", "message": f"No DB record found for {file_path}"}

        id_operation = result.id_operation
        measurement_number = result.measurement_number

        abs_path = DATA_ROOT / file_path
        deleted_files = []
        if abs_path.exists():
            try:
                abs_path.unlink()
                deleted_files.append(str(abs_path))
            except Exception as e:
                return {"status": "error", "message": f"Failed to delete file: {e}"}
        else:
            return {"status": "error", "message": f"File not found: {abs_path}"}

        db.delete(result)
        db.commit()

        results_to_update = (
            db.query(Result)
            .filter(Result.id_operation == id_operation, Result.position == position)
            .filter(Result.measurement_number > measurement_number)
            .order_by(Result.measurement_number.asc())
            .all()
        )

        for r in results_to_update:
            r.measurement_number -= 1

        db.commit()

        return {
            "status": "success",
            "deleted": deleted_files,
            "reindexed": [r.id for r in results_to_update],
        }

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}



@router.get("/plot-data/{id_operation}/{position}")
def get_plot_data(id_operation: int, position: int, db: Session = Depends(get_db)):
    try:
        operation = db.query(Operation).filter(Operation.id_operation == id_operation).first()
        if not operation:
            raise HTTPException(status_code=404, detail=f"Operation {id_operation} not found")

        patient_id = operation.patient_id
        all_ops = (
            db.query(Operation)
            .filter(Operation.patient_id == patient_id)
            .order_by(Operation.operation_date.asc())
            .all()
        )

        visit_number = {op.id_operation: idx + 1 for idx, op in enumerate(all_ops)}[operation.id_operation]
        visit_name = operation.name.replace(" ", "_")
        visit_str = f"{visit_number}-{visit_name}_{operation.operation_date.strftime('%d%m%Y')}"

        position_folder = DATA_ROOT / patient_id / visit_str / str(position)
        if not position_folder.exists():
            raise HTTPException(status_code=404, detail=f"Position folder {position} not found in {visit_str}")

        results = (
            db.query(Result)
            .filter(Result.id_operation == id_operation, Result.position == position)
            .order_by(Result.measurement_number.asc())
            .all()
        )
        if not results:
            raise HTTPException(status_code=404, detail="No measurements found for this position")

        measure_arrays = []
        for r in results:
            file_path = DATA_ROOT / r.file_path
            if not file_path.exists():
                logging.warning(f"[PLOT DATA] Missing file: {file_path}")
                continue

            data = read_measurement_file(file_path)
            if data:
                measure_arrays.append(data)
            else:
                logging.warning(f"[PLOT DATA] Invalid data: {file_path}")

        if not measure_arrays:
            raise HTTPException(status_code=400, detail="No valid measurement data found locally")

        graph_data = merge_measurements_for_chart(measure_arrays)

        return {
            "status": "success",
            "operation_id": id_operation,
            "position": position,
            "n_measurements": len(measure_arrays),
            "graph_data": graph_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[PLOT DATA ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Internal error while building plot data: {e}")
