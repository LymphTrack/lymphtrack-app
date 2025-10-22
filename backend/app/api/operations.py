from fastapi import APIRouter, Depends, HTTPException, Body, Response
from sqlalchemy.orm import Session
from app.db.models import Operation
from app.db.database import get_db
import os, io , zipfile
from dotenv import load_dotenv
from mega import Mega
from datetime import datetime

load_dotenv()

router = APIRouter()

EMAIL = os.getenv("MEGA_EMAIL")
PASSWORD = os.getenv("MEGA_PASSWORD")

mega = Mega()
m = mega.login(EMAIL, PASSWORD)

# ---------------------
# CREATE OPERATION
# ---------------------

@router.post("/")
def create_operation(op_data: dict = Body(...), db: Session = Depends(get_db)):
    patient_id = op_data.get("patient_id")

    try:
        # Vérifie / crée dossier patient
        patient_folder = m.find(f"lymphtrack-data/{patient_id}")
        if not patient_folder:
            patient_folder = [m.create_folder(f"lymphtrack-data/{patient_id}")]

        # Parse date proprement
        op_date = op_data.get("operation_date")
        if isinstance(op_date, str):
            try:
                op_date = datetime.fromisoformat(op_date)
            except ValueError:
                op_date = datetime.strptime(op_date, "%Y-%m-%d")

        existing = (
            db.query(Operation)
            .filter(
                Operation.patient_id == patient_id,
                Operation.name == op_data.get("name"),
                Operation.operation_date == op_date,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="An operation with the same name and date already exists for this patient.",
            )

        temp_op = Operation(**op_data)
        temp_op.operation_date = op_date
        db.add(temp_op)
        db.flush()

        all_ops = (
            db.query(Operation)
            .filter(Operation.patient_id == patient_id)
            .order_by(Operation.operation_date.asc())
            .all()
        )

        visit_map = {}
        for i, op in enumerate(all_ops, start=1):
            new_visit_str = f"{i}-{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"
            visit_map[op.id_operation] = (i, new_visit_str)
            
            subfolders = m.get_files_in_node(patient_folder[0])

            if op.id_operation == temp_op.id_operation:
                already_exists = any(meta["t"] == 1 and meta["a"]["n"] == new_visit_str for _, meta in subfolders.items())
                if not already_exists:
                    m.create_folder(new_visit_str, patient_folder[0])
            else:
                for folder_id, folder_meta in subfolders.items():
                    if folder_meta["t"] == 1 and folder_meta["a"]["n"].endswith(op.operation_date.strftime("%d%m%Y")):
                        old_name = folder_meta["a"]["n"]
                        if old_name != new_visit_str:
                            m.rename((folder_id, folder_meta), new_visit_str)

        db.commit()
        db.refresh(temp_op)
        
        visit_number, visit_str = visit_map[temp_op.id_operation]
        
        return {
            "status": "success",
            "operation": {
                "id_operation": temp_op.id_operation,
                "patient_id": temp_op.patient_id,
                "name": temp_op.name,
                "operation_date": temp_op.operation_date,
                "notes": temp_op.notes,
                "visit_number": visit_number,
                "visit_str": visit_str,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating operation: {e}")


# -----------------------
# READ OPERATION BY ID
# -----------------------

@router.get("/{id_operation}")
def get_operation(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    return op


# --------------------------------
# READ ALL OPERATIONS BY PATIENT
# --------------------------------

@router.get("/by_patient/{patient_id}")
def get_operations(patient_id: str, db: Session = Depends(get_db)):
    ops = db.query(Operation).filter(Operation.patient_id == patient_id).all()
    return ops


# --------------------------------
# READ ALL OPERATIONS
# --------------------------------

@router.get("/")
def get_operations(db: Session = Depends(get_db)):
    ops = db.query(Operation).all()
    return ops


# ---------------------
# UPDATE OPERATION
# ---------------------

@router.put("/{id_operation}")
def update_operation(id_operation: int, updated_data: dict, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    old_name = op.name
    old_date = op.operation_date

    for key, value in updated_data.items():
        if hasattr(op, key):
            if key == "operation_date" and isinstance(value, str):
                value = datetime.fromisoformat(value)
            setattr(op, key, value)

    db.commit()
    db.refresh(op)

    if op.name == old_name and op.operation_date == old_date:
        return op

    try:
        patient_id = op.patient_id

        all_ops = (
            db.query(Operation)
            .filter(Operation.patient_id == patient_id)
            .order_by(Operation.operation_date.asc())
            .all()
        )

        patient_folder = m.find(f"lymphtrack-data/{patient_id}")
        if not patient_folder:
            raise HTTPException(status_code=404, detail="Patient folder not found in Mega")

        subfolders = m.get_files_in_node(patient_folder[0])

        if op.operation_date == old_date and op.name != old_name:
            visit_number = {o.id_operation: idx + 1 for idx, o in enumerate(all_ops)}[op.id_operation]

            old_visit_str = f"{visit_number}-{old_name.replace(' ', '_')}_{old_date.strftime('%d%m%Y')}"
            new_visit_str = f"{visit_number}-{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"

            old_folder = None
            for fid, meta in subfolders.items():
                if meta["t"] == 1 and meta["a"]["n"] == old_visit_str:
                    old_folder = (fid, meta)
                    break

            if old_folder and old_visit_str != new_visit_str:
                m.rename(old_folder, new_visit_str)

        elif op.operation_date != old_date:
            for i, o in enumerate(all_ops, start=1):
                new_visit_str = f"{i}-{o.name.replace(' ', '_')}_{o.operation_date.strftime('%d%m%Y')}"

                old_folder = None
                for fid, meta in subfolders.items():
                    if meta["t"] == 1 and meta["a"]["n"].endswith(o.operation_date.strftime("%d%m%Y")):
                        old_folder = (fid, meta)
                        break

                if old_folder and old_folder[1]["a"]["n"] != new_visit_str:
                    m.rename(old_folder, new_visit_str)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating folder in Mega: {e}")

    return op



# ---------------------
# DELETE OPERATION
# ---------------------

@router.delete("/{id_operation}")
def delete_operation(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    patient_id = op.patient_id

    all_ops = (
        db.query(Operation)
        .filter(Operation.patient_id == patient_id)
        .order_by(Operation.operation_date.asc())
        .all()
    )
    visit_number = {o.id_operation: idx + 1 for idx, o in enumerate(all_ops)}[op.id_operation]
    visit_str = f"{visit_number}-{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"

    try:
        patient_folder = m.find(f"lymphtrack-data/{patient_id}")
        if patient_folder:
            subfolders = m.get_files_in_node(patient_folder[0])

            target_folder = None
            for fid, meta in subfolders.items():
                if meta["t"] == 1 and meta["a"]["n"] == visit_str: 
                    target_folder = (fid, meta)
                    break

            if target_folder:
                m.delete(target_folder[0])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting operation folder in Mega: {e}")

    db.delete(op)
    db.commit()

    try:
        remaining_ops = (
            db.query(Operation)
            .filter(Operation.patient_id == patient_id)
            .order_by(Operation.operation_date.asc())
            .all()
        )

        subfolders = m.get_files_in_node(patient_folder[0]) if patient_folder else {}

        for i, op in enumerate(remaining_ops, start=1):
            new_visit_str = f"{i}-{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"
            old_folder = None

            for fid, meta in subfolders.items():
                if meta["t"] == 1 and meta["a"]["n"].endswith(op.operation_date.strftime("%d%m%Y")):
                    old_folder = (fid, meta)
                    break

            if old_folder and old_folder[1]["a"]["n"] != new_visit_str:
                m.rename(old_folder, new_visit_str)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error renumbering folders in Mega: {e}")

    return {
        "message": f"Operation {id_operation} deleted successfully",
        "patient_id": patient_id,
        "deleted_folder": visit_str
    }


# ---------------------
# EXPORT OPERATION FOLDER
# ---------------------

def add_node_to_zip_recursive(node_id, meta, zipf, base_path=""):
    """Ajoute un fichier ou un dossier (récursivement) dans le ZIP."""
    try:
        name = meta["a"].get("n", str(node_id))
        node_type = meta.get("t")
        zip_path = os.path.join(base_path, name)

        if node_type == 0:
            if name == ".DS_Store":
                return
            
            downloaded_path = m.download((node_id, meta), dest_path=".", dest_filename=f"tmp_{name}")
            with open(downloaded_path, "rb") as f:
                zipf.writestr(zip_path, f.read())
            os.remove(downloaded_path)

        elif node_type == 1: 
            children = m.get_files_in_node(node_id)
            for child_id, child_meta in children.items():
                add_node_to_zip_recursive(child_id, child_meta, zipf, base_path=zip_path)

    except Exception as e:
        print(f"[DEBUG] Failed to add {meta['a'].get('n', node_id)}: {e}")


@router.get("/export-folder/{id_operation}")
def export_visit_folder(id_operation: int, db: Session = Depends(get_db)):
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

        patient_folder = m.find(f"lymphtrack-data/{patient_id}")
        if not patient_folder:
            raise HTTPException(status_code=404, detail=f"Patient folder {patient_id} not found")

        subfolders = m.get_files_in_node(patient_folder[0])
        visit_folder_id = None
        for fid, meta in subfolders.items():
            if meta["t"] == 1 and meta["a"]["n"] == visit_str:
                visit_folder_id = fid
                break

        if not visit_folder_id:
            raise HTTPException(status_code=404, detail=f"Visit folder {visit_str} not found in MEGA")

        files = m.get_files_in_node(visit_folder_id)
        if not files:
            raise HTTPException(status_code=404, detail=f"No files found inside {visit_str}")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_id, meta in files.items():
                add_node_to_zip_recursive(file_id, meta, zipf, base_path=visit_str)

        zip_buffer.seek(0)

        return Response(
            content=zip_buffer.read(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={visit_str}.zip"},
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        return {"status": "error", "message": str(e)}
    

# ---------------------
# EXPORT Position FOLDER
# ---------------------

@router.get("/export-position/{id_operation}/{position}")
def export_position_folder(id_operation: int, position: int, db: Session = Depends(get_db)):
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

        patient_folder = m.find(f"lymphtrack-data/{patient_id}")
        if not patient_folder:
            raise HTTPException(status_code=404, detail=f"Patient folder {patient_id} not found")

        subfolders = m.get_files_in_node(patient_folder[0])
        visit_folder_id = None
        for fid, meta in subfolders.items():
            if meta["t"] == 1 and meta["a"]["n"] == visit_str:
                visit_folder_id = fid
                break

        if not visit_folder_id:
            raise HTTPException(status_code=404, detail=f"Visit folder {visit_str} not found in MEGA")

        visit_contents = m.get_files_in_node(visit_folder_id)
        position_folder_id = None
        position_folder_name = f"position_{position}"
        for fid, meta in visit_contents.items():
            if meta["t"] == 1 and meta["a"]["n"].lower() == position_folder_name.lower():
                position_folder_id = fid
                break

        if not position_folder_id:
            raise HTTPException(status_code=404, detail=f"Position folder {position_folder_name} not found in {visit_str}")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            position_files = m.get_files_in_node(position_folder_id)
            if not position_files:
                raise HTTPException(status_code=404, detail=f"No files found inside {position_folder_name}")

            for file_id, meta in position_files.items():
                add_node_to_zip_recursive(file_id, meta, zipf, base_path=position_folder_name)

        zip_buffer.seek(0)

        filename = f"{patient_id}_{visit_str}_{position_folder_name}.zip"
        return Response(
            content=zip_buffer.read(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        return {"status": "error", "message": str(e)}
