from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.models import Photo, Operation
from app.db.database import get_db
import os, tempfile, re
from dotenv import load_dotenv
from mega import Mega
from datetime import datetime, timezone

load_dotenv()

router = APIRouter()

EMAIL = os.getenv("MEGA_EMAIL")
PASSWORD = os.getenv("MEGA_PASSWORD")

mega = Mega()
m = mega.login(EMAIL, PASSWORD)


# ---------------------
# UPLOAD PHOTO
# ---------------------
@router.post("/{id_operation}")
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

    patient_folder = m.find(f"lymphtrack-data/{patient_id}")
    if not patient_folder:
        raise HTTPException(status_code=404, detail="Patient folder not found in Mega")

    subfolders = m.get_files_in_node(patient_folder[0])

    visit_folder = None
    for fid, meta in subfolders.items():
        if meta["t"] == 1 and meta["a"]["n"] == visit_str:
            visit_folder = fid
            break
    if not visit_folder:
        raise HTTPException(status_code=404, detail=f"Visit folder {visit_str} not found in Mega")

    visit_subfolders = m.get_files_in_node(visit_folder)
    photos_folder = None
    for fid, meta in visit_subfolders.items():
        if meta["t"] == 1 and meta["a"]["n"] == "photos":
            photos_folder = fid
            break

    if not photos_folder:
        node = m.create_folder("photos", visit_folder)
        if isinstance(node, dict) and "f" in node:
            photos_folder = node["f"][0]["h"]
        elif isinstance(node, dict) and "h" in node:
            photos_folder = node["h"]
        elif isinstance(node, dict) and "photos" in node: 
            photos_folder = node["photos"]
        elif isinstance(node, str):
            photos_folder = node
        else:
            raise HTTPException(status_code=500, detail=f"Unexpected Mega response when creating photos folder: {node}")

    try:
        safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename or "upload.jpg")

        tmpdir = tempfile.gettempdir()
        local_path = os.path.join(tmpdir, safe_filename)

        with open(local_path, "wb") as buffer:
            buffer.write(file.file.read())

        uploaded = m.upload(local_path, photos_folder)

        try:
            link = m.get_link(uploaded)
        except Exception:
            link = f"{patient_id}/{visit_str}/photos/{file.filename}"

        os.remove(local_path)

        new_photo = Photo(
            id_operation=id_operation,
            url=link,
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_photo)
        db.commit()
        db.refresh(new_photo)

        return {"status": "success", "photo": {"id": new_photo.id, "url": new_photo.url}}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading photo: {e}")


# ---------------------
# GET PHOTOS BY OPERATION
# ---------------------

@router.get("/{id_operation}")
def get_photos(id_operation: int, db: Session = Depends(get_db)):
    photos = db.query(Photo).filter(Photo.id_operation == id_operation).all()
    return photos
