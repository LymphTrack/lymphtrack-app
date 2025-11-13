from fastapi import APIRouter, Depends, HTTPException, Body, Response
from sqlalchemy.orm import Session
from app.db.models import Operation
from app.db.database import get_db
from datetime import datetime
from pathlib import Path
import shutil
from app.db import models
import zipfile
from pydantic import BaseModel

router = APIRouter()

DATA_ROOT = Path(r"C:\Users\Pimprenelle\Documents\LymphTrackData")

# ---------------------
# CREATE OPERATION
# ---------------------
@router.post("/")
def create_operation(op_data: dict = Body(...), db: Session = Depends(get_db)):
    patient_id = op_data.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="Missing patient_id")

    patient_folder = DATA_ROOT / patient_id
    if not patient_folder.exists():
        raise HTTPException(status_code=404, detail=f"Patient folder {patient_id} not found")

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
            Operation.operation_date == op_date
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Operation already exists for this patient with the same name and date.")

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
        visit_str = f"{i}-{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"
        visit_map[op.id_operation] = (i, visit_str)
        expected_folder = patient_folder / visit_str

        # Trouver un dossier existant avec la même date (peu importe l'ancien index)
        old_pattern = f"_{op.operation_date.strftime('%d%m%Y')}"
        existing_folder = None
        for folder in patient_folder.iterdir():
            if folder.is_dir() and folder.name.endswith(old_pattern):
                existing_folder = folder
                break

        # Si un dossier existe mais que le nom ne correspond plus → on le renomme
        if existing_folder and existing_folder.name != visit_str:
            existing_folder.rename(expected_folder)

        # Sinon on le crée s’il n’existe pas
        expected_folder.mkdir(parents=True, exist_ok=True)

        # Créer les sous-dossiers 1 à 6 si manquants
        for pos in range(1, 7):
            (expected_folder / str(pos)).mkdir(exist_ok=True)


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


# ---------------------
# READ OPERATION BY ID
# ---------------------
@router.get("/{id_operation}")
def get_operation(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    return op

# ---------------------
# READ ALL OPERATIONS BY PATIENT
# ---------------------
@router.get("/by_patient/{patient_id}")
def get_operations_by_patient(patient_id: str, db: Session = Depends(get_db)):
    return db.query(Operation).filter(Operation.patient_id == patient_id).all()

# ---------------------
# READ ALL OPERATIONS
# ---------------------
@router.get("/")
def get_operations(db: Session = Depends(get_db)):
    return db.query(Operation).all()


# ---------------------
# GET ALL UNIQUE NAME OPERATIONS
# ---------------------
@router.get("/utils/unique-names")
def get_unique_names(db: Session = Depends(get_db)):
    names = db.query(Operation.name).distinct().all()
    return [n[0] for n in names if n[0]]


# ---------------------
# UPDATE OPERATION
# ---------------------
@router.put("/{id_operation}")
def update_operation(id_operation: int, updated_data: dict, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    old_name, old_date = op.name, op.operation_date

    for key, value in updated_data.items():
        if hasattr(op, key):
            if key == "operation_date" and isinstance(value, str):
                value = datetime.fromisoformat(value)
            setattr(op, key, value)

    db.commit()
    db.refresh(op)

    if op.name != old_name or op.operation_date != old_date:
        patient_folder = DATA_ROOT / op.patient_id
        all_ops = (
            db.query(Operation)
            .filter(Operation.patient_id == op.patient_id)
            .order_by(Operation.operation_date.asc())
            .all()
        )

        # Rename folders to maintain order and consistency
        for i, o in enumerate(all_ops, start=1):
            old_folder = next(patient_folder.glob(f"*{o.operation_date.strftime('%d%m%Y')}"), None)
            new_name = f"{i}-{o.name.replace(' ', '_')}_{o.operation_date.strftime('%d%m%Y')}"
            if old_folder and old_folder.name != new_name:
                old_folder.rename(patient_folder / new_name)

    return op


# ---------------------
# DELETE OPERATION
# ---------------------
@router.delete("/{id_operation}")
def delete_operation(id_operation: int, db: Session = Depends(get_db)):
    try:
        op = db.query(models.Operation).filter(models.Operation.id_operation == id_operation).first()
        if not op:
            raise HTTPException(status_code=404, detail="Operation not found")

        patient_id = op.patient_id
        op_date_str = op.operation_date.strftime("%d%m%Y")
        patient_folder = DATA_ROOT / patient_id

        op_folder = None
        for f in patient_folder.glob(f"*{op_date_str}"):
            if f.is_dir() and op.name.replace(" ", "_") in f.name:
                op_folder = f
                break

        db.delete(op)
        db.commit()

        if op_folder and op_folder.exists():
            try:
                shutil.rmtree(op_folder)
                print(f"Dossier supprimé : {op_folder}")
            except Exception as e:
                print(f"Erreur suppression dossier {op_folder}: {e}")

        remaining_ops = (
            db.query(models.Operation)
            .filter(models.Operation.patient_id == patient_id)
            .order_by(models.Operation.operation_date.asc())
            .all()
        )

        for i, o in enumerate(remaining_ops, start=1):
            old_folder = next(patient_folder.glob(f"*{o.operation_date.strftime('%d%m%Y')}"), None)
            if old_folder:
                new_name = f"{i}-{o.name.replace(' ', '_')}_{o.operation_date.strftime('%d%m%Y')}"
                if old_folder.name != new_name:
                    try:
                        old_folder.rename(patient_folder / new_name)
                        print(f"Dossier renommé : {old_folder.name} → {new_name}")
                    except Exception as e:
                        print(f"Erreur renommage {old_folder}: {e}")

        return {
            "status": "success",
            "message": f"Operation {id_operation} deleted successfully",
            "deleted_folder": str(op_folder) if op_folder else None
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERREUR BACKEND] delete_operation: {e}")
        return {"status": "error", "message": str(e)}

# ---------------------
# EXPORT OPERATION FOLDER
# ---------------------
@router.get("/export-folder/{id_operation}")
def export_operation_folder(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    patient_folder = DATA_ROOT / op.patient_id
    visit_str = f"{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"
    op_folder = next(patient_folder.glob(f"*{op.operation_date.strftime('%d%m%Y')}"), None)
    if not op_folder or not op_folder.exists():
        raise HTTPException(status_code=404, detail=f"No folder found for operation {visit_str}")

    backend_dir = Path(__file__).resolve().parent
    output_zip = backend_dir / f"{op.patient_id}_{visit_str}.zip"

    try:
        with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_path in op_folder.rglob("*"):
                if file_path.is_file():
                    rel_path = file_path.relative_to(DATA_ROOT)
                    zipf.write(file_path, rel_path)

        with open(output_zip, "rb") as f:
            content = f.read()

        return Response(
            content=content,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={output_zip.name}",
                "Content-Type": "application/octet-stream",
            },
        )
    finally:
        if output_zip.exists():
            output_zip.unlink()

# ---------------------
# EXPORT POSITION FOLDER
# ---------------------
@router.get("/export-position/{id_operation}/{position}")
def export_position_folder(id_operation: int, position: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    patient_folder = DATA_ROOT / op.patient_id
    op_folder = next(patient_folder.glob(f"*{op.operation_date.strftime('%d%m%Y')}"), None)
    if not op_folder or not op_folder.exists():
        raise HTTPException(status_code=404, detail=f"Operation folder not found for {op.name}")

    position_folder = op_folder / str(position)
    if not position_folder.exists():
        raise HTTPException(status_code=404, detail=f"Position folder {position} not found")

    backend_dir = Path(__file__).resolve().parent
    filename = f"{op.patient_id}_{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}_pos{position}.zip"
    output_zip = backend_dir / filename

    try:
        with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_path in position_folder.rglob("*"):
                if file_path.is_file():
                    rel_path = file_path.relative_to(DATA_ROOT)
                    zipf.write(file_path, rel_path)

        with open(output_zip, "rb") as f:
            content = f.read()

        return Response(
            content=content,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/octet-stream",
            },
        )
    finally:
        if output_zip.exists():
            output_zip.unlink()
