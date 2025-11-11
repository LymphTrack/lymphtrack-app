from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.models import Photo, Operation
from app.db.database import get_db
from datetime import datetime, timezone
from pathlib import Path
import os, re, shutil, logging
import mimetypes

router = APIRouter()
DATA_ROOT = Path(r"C:\Users\Pimprenelle\Documents\LymphTrackData")

# ---------------------
# UPLOAD PHOTO
# ---------------------
@router.post("/upload/{id_operation}")
def upload_photo(id_operation: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
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

        photos_dir = DATA_ROOT / patient_id / visit_str / "photos"
        photos_dir.mkdir(parents=True, exist_ok=True)

        safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename or "photo.jpg")
        archive_path = photos_dir / safe_filename

        try:
            with open(archive_path, "wb") as out_file:
                shutil.copyfileobj(file.file, out_file)
        except Exception as e:
            if archive_path.exists():
                archive_path.unlink()
            raise HTTPException(status_code=500, detail=f"Error saving photo: {e}")

        relative_url = str(archive_path.relative_to(DATA_ROOT)).replace("\\", "/")

        new_photo = Photo(
            id_operation=id_operation,
            url=relative_url,
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_photo)
        db.commit()
        db.refresh(new_photo)

        return {
            "status": "success",
            "photo": {"id": new_photo.id, "url": new_photo.url}
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[UPLOAD PHOTO] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------
# GET PHOTOS BY OPERATION
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
            photos.append({
                "filename": f.name,
                "url": f"/photos/{id_operation}/{f.name}",
            })

    return {"status": "success", "photos": photos}




@router.get("/photos/{id_operation}/{filename}")
def get_photo_file(id_operation: int, filename: str, db: Session = Depends(get_db)):
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

    if not photo_path.exists():
        raise HTTPException(status_code=404, detail="Photo not found")

    media_type, _ = mimetypes.guess_type(photo_path.name)
    if media_type is None:
        media_type = "application/octet-stream" 

    return FileResponse(photo_path, media_type=media_type)


# ---------------------
# DELETE PHOTO
# ---------------------
@router.post("/delete-photo")
def delete_photo(payload: dict, db: Session = Depends(get_db)):
    try:
        url = payload.get("url")
        if not url:
            return {"status": "error", "message": "No photo url provided"}

        photo = db.query(Photo).filter(Photo.url == url).first()
        if not photo:
            return {"status": "error", "message": f"No DB record found for {url}"}

        abs_path = DATA_ROOT / Path(url)
        deleted_files = []
        if abs_path.exists():
            try:
                abs_path.unlink()
                deleted_files.append(str(abs_path))
            except Exception as e:
                return {"status": "error", "message": f"Failed to delete file: {e}"}

        db.delete(photo)
        db.commit()

        return {"status": "success", "deleted": deleted_files}

    except Exception as e:
        db.rollback()
        logging.error(f"[DELETE PHOTO] {e}")
        return {"status": "error", "message": str(e)}
