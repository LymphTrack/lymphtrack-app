from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.models import Photo, Operation
from app.db.database import get_db
import os
from dotenv import load_dotenv
from mega import Mega

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
    visit_str = f"{id_operation}-{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"

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
        raise HTTPException(status_code=404, detail="Visit folder not found in Mega")

    visit_subfolders = m.get_files_in_node(visit_folder)
    photos_folder = None
    for fid, meta in visit_subfolders.items():
        if meta["t"] == 1 and meta["a"]["n"] == "photos":
            photos_folder = fid
            break
    if not photos_folder:
        photos_folder = m.create_folder("photos", visit_folder)[0]

    try:
        local_path = f"/tmp/{file.filename}"
        with open(local_path, "wb") as buffer:
            buffer.write(file.file.read())

        uploaded = m.upload(local_path, photos_folder)
        link = m.get_link(uploaded)

        new_photo = Photo(
            id_operation=id_operation,
            url=link
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
