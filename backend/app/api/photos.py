from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.models import Photo, Operation
from app.db.database import get_db
from datetime import datetime, timezone
from pathlib import Path
import os, re, shutil, logging
import base64

router = APIRouter()
DATA_ROOT = Path(r"C:\Users\Pimprenelle\Documents\LymphTrackData")

# ---------------------
# UPLOAD PHOTO
# ---------------------
@router.post("/upload/{id_operation}")
def upload_photo(id_operation: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
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

    photos_dir = DATA_ROOT / patient_id / visit_str / "photos"
    photos_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename or "photo.jpg")
    save_path = photos_dir / safe_filename

    try:
        with open(save_path, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)
    except Exception as e:
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error saving photo: {e}")

    new_photo = Photo(id_operation=id_operation, filename=safe_filename, created_at=datetime.now(timezone.utc))
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)

    return {
        "status": "success",
        "photo": {
            "id": new_photo.id,
            "filename": new_photo.filename,
            "created_at": new_photo.created_at.isoformat(),
        },
    }


# ---------------------
# GET ALL PHOTOS BY OPERATION
# ---------------------
@router.get("/photos/{id_operation}")
def get_photos(id_operation: int, db: Session = Depends(get_db)):
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

    photos_dir = DATA_ROOT / patient_id / visit_str / "photos"
    if not photos_dir.exists():
        return {"status": "success", "photos": []}

    image_extensions = (".jpg", ".jpeg", ".png", ".webp", ".gif")
    photos = []

    for f in photos_dir.iterdir():
        if f.is_file() and f.suffix.lower() in image_extensions:
            with open(f, "rb") as img_file:
                encoded = base64.b64encode(img_file.read()).decode("utf-8")
                photos.append({
                    "filename": f.name,
                    "image_base64": f"data:image/{f.suffix[1:]};base64,{encoded}"
                })

    return {"status": "success", "photos": photos}



# ---------------------
# DELETE PHOTO
# ---------------------
@router.delete("/photos/{id_operation}/{filename}")
def delete_photo(id_operation: int, filename: str, db: Session = Depends(get_db)):
    try:
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

        photo_path = DATA_ROOT / patient_id / visit_str / "photos" / filename

        photo = (
            db.query(Photo)
            .filter(Photo.id_operation == id_operation, Photo.filename == filename)
            .first()
        )
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found in database")

        if photo_path.exists():
            try:
                photo_path.unlink()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")

        db.delete(photo)
        db.commit()

        return {"status": "success", "message": f"Photo '{filename}' deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logging.error(f"[DELETE PHOTO] {e}")
        raise HTTPException(status_code=500, detail=str(e))
