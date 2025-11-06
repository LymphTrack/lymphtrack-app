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
            try:
                tmp = pd.read_csv(file_path, header=0, sep=None, engine="python")
                cols = tmp.columns.astype(str).str.strip().str.lower().str.replace(r"\s+", "", regex=True)
                if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                    df = tmp.copy()
                    df.columns = cols
                else:
                    raw = pd.read_csv(file_path, header=None, sep=None, engine="python")
                    df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
            except Exception:
                logging.warning(f"[PLOT READ] CSV read failed for {file_path}")
                return []
        else:
            try:
                tmp = pd.read_excel(file_path, header=0)
                cols = tmp.columns.astype(str).str.strip().str.lower().str.replace(r"\s+", "", regex=True)
                if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                    df = tmp.copy()
                    df.columns = cols
                else:
                    raw = pd.read_excel(file_path, header=None)
                    df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
            except Exception:
                logging.warning(f"[PLOT READ] Excel read failed for {file_path}")
                return []
    except Exception as e:
        logging.warning(f"[PLOT READ] {file_path}: unexpected read error {e}")
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
        {"freq_hz": float(row[freq_col]), "loss_db": float(row[rl_col])}
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

def average_measurements(measure_arrays: list[list[dict]]):
    if not measure_arrays:
        return []

    if len(measure_arrays) == 1:
        single = measure_arrays[0]
        return [{"freq_hz": p["freq_hz"], "avg_loss_db": p["loss_db"]} for p in single]

    base_freqs = [p["freq_hz"] for p in measure_arrays[0]]
    combined = []
    for i, freq in enumerate(base_freqs):
        vals = []
        for arr in measure_arrays:
            if i < len(arr):
                vals.append(arr[i]["loss_db"])
        if vals:
            avg_loss = float(np.mean(vals))
            combined.append({"freq_hz": freq, "avg_loss_db": avg_loss})
    return combined



def merge_positions_for_chart(position_curves: dict[int, list[dict]]):
    if not position_curves:
        return []

    first_curve = next(iter(position_curves.values()))
    if not first_curve:
        return []

    base_freqs = [p["freq_hz"] for p in first_curve]
    merged = []

    for i, freq in enumerate(base_freqs):
        point = {"freq": freq / 1e9}  # en GHz
        for pos, curve in position_curves.items():
            if i < len(curve):
                point[f"pos{pos}"] = curve[i]["avg_loss_db"]
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


def process_measurement_file(
    file: UploadFile,
    id_operation: int,
    position: int,
    db: Session,
    visit_str: str,
    patient_id: str,
    measurement_number=1
):
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
                    file.file.seek(0)
                    raw = pd.read_csv(file.file, header=None, sep=None, engine="python")
                    df = infer_header_and_data(raw, key_cols=["freq", "returnloss"])
            else:
                tmp = pd.read_excel(file.file, header=0)
                cols = tmp.columns.astype(str).str.strip().str.lower().str.replace(r"\s+", "", regex=True)
                if any("freq" in c for c in cols) and any("s11" in c or "returnloss" in c for c in cols):
                    df = tmp.copy()
                    df.columns = cols
                else:
                    file.file.seek(0)
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
        archive_dir = DATA_ROOT / patient_id / visit_str / str(position)
        archive_dir.mkdir(parents=True, exist_ok=True)
        archive_path = archive_dir / file.filename

        try:
            with open(archive_path, "wb") as out_f:
                shutil.copyfileobj(file.file, out_f)
        except Exception as e:
            if archive_path.exists():
                archive_path.unlink() 
            logging.error(f"[SAVE FILE] Failed to save {file.filename}: {e}")
            return None

        relative_path = str(archive_path.relative_to(DATA_ROOT)).replace("\\", "/")
        result = Result(
            id_operation=int(id_operation),
            position=int(position),
            measurement_number=measurement_number,
            min_return_loss_db=float(min_rl),
            min_frequency_hz=int(min_freq),
            bandwidth_hz=float(bw) if not pd.isna(bw) else None,
            file_path=relative_path,
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
async def create_result(
    id_operation: int,
    position: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):

    try:
        operation = (
            db.query(Operation)
            .filter(Operation.id_operation == id_operation)
            .first()
        )
        if not operation:
            raise HTTPException(status_code=404, detail="Operation not found")

        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        patient_id = operation.patient_id
        all_ops = (
            db.query(Operation)
            .filter(Operation.patient_id == patient_id)
            .order_by(Operation.operation_date.asc())
            .all()
        )
        visit_number = {op.id_operation: idx + 1 for idx, op in enumerate(all_ops)}[
            id_operation
        ]
        visit_str = f"{visit_number}-{operation.name.replace(' ', '_')}_{operation.operation_date.strftime('%d%m%Y')}"

        existing = (
            db.query(Result)
            .filter(Result.id_operation == id_operation, Result.position == position)
            .order_by(Result.measurement_number.asc())
            .all()
        )
        start_index = len(existing) + 1

        saved_results = []
        for idx, f in enumerate(files, start=start_index):
            res = process_measurement_file(
                file=f,
                id_operation=id_operation,
                position=position,
                db=db,
                visit_str=visit_str,
                patient_id=patient_id,
                measurement_number=idx,
            )
            if res:
                saved_results.append(res)

        db.commit()

        if not saved_results:
            return {"status": "error", "message": "No valid files were processed"}

        payload = [
            {
                "id": r.id,
                "id_operation": r.id_operation,
                "position": r.position,
                "measurement_number": r.measurement_number,
                "min_return_loss_db": r.min_return_loss_db,
                "min_frequency_hz": r.min_frequency_hz,
                "bandwidth_hz": r.bandwidth_hz,
                "file_path": r.file_path,
                "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
            }
            for r in saved_results
        ]

        return {
            "status": "success",
            "message": f"Processed {len(saved_results)} file(s)",
            "results": payload,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logging.error(f"[CREATE RESULT] {e}")
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

# ---------------------
# PLOT DATA BY VISIT
# ---------------------
@router.get("/plot-data-by-visit/{id_operation}")
def get_plot_data_by_visit(id_operation: int, db: Session = Depends(get_db)):
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

        visit_dir = DATA_ROOT / patient_id / visit_str
        if not visit_dir.exists():
            raise HTTPException(status_code=404, detail=f"Visit folder not found: {visit_str}")

        results_all = db.query(Result).filter(Result.id_operation == id_operation).all()
        if not results_all:
            raise HTTPException(status_code=404, detail="No measurements found for this visit")

        position_curves = {}

        for pos in range(1, 7):
            pos_results = [r for r in results_all if r.position == pos]
            if not pos_results:
                continue

            measure_arrays = []
            for r in pos_results:
                file_path = DATA_ROOT / r.file_path
                if not file_path.exists():
                    logging.warning(f"[PLOT VISIT] Missing file: {file_path}")
                    continue
                data = read_measurement_file(file_path)
                if data:
                    measure_arrays.append(data)
                else:
                    logging.warning(f"[PLOT VISIT] Invalid data: {file_path}")

            if not measure_arrays:
                continue

            avg_curve = average_measurements(measure_arrays)
            position_curves[pos] = avg_curve

        if not position_curves:
            raise HTTPException(status_code=400, detail="No valid data found for this visit")

        graph_data = merge_positions_for_chart(position_curves)

        return {
            "status": "success",
            "operation_id": id_operation,
            "visit": visit_str,
            "n_positions": len(position_curves),
            "graph_data": graph_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[PLOT VISIT ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Internal error while building visit plot: {e}")



# ---------------------
# PLOT DATA BY POSITION
# ---------------------
@router.get("/plot-data-by-position/{id_operation}/{position}")
def get_plot_data_by_position(id_operation: int, position: int, db: Session = Depends(get_db)):
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



