import requests
from pathlib import Path
from datetime import date

API_BASE = "http://localhost:8000"
PATIENTS_URL = f"{API_BASE}/patients"
OPERATIONS_URL = f"{API_BASE}/operations"
PHOTOS_URL = f"{API_BASE}/photos"

# ---------------------
# CONFIGURATION
# ---------------------
BASE_DIR = Path(__file__).resolve().parent
TEST_PHOTO = BASE_DIR.parents[2] / "test.jpg"  # Exemple : backend/test.jpg

def p(title):
    print("\n" + "=" * 12, title, "=" * 12)

def must_json(r):
    try:
        return r.json()
    except Exception:
        raise RuntimeError(f"Expected JSON, got: {r.status_code} {r.text[:200]}")

# ---------------------
# CREATE PATIENT
# ---------------------
def create_patient():
    p("CREATE PATIENT")
    payload = {
        "age": 40,
        "gender": 1,
        "bmi": 22.5,
        "lymphedema_side": 1,
        "notes": "E2E photo auto test"
    }
    r = requests.post(f"{PATIENTS_URL}/", json=payload)
    data = must_json(r)
    print("Status:", r.status_code)
    print("Response:", data)
    if "patient_id" not in data:
        raise RuntimeError("Failed to create patient")
    return data["patient_id"]

# ---------------------
# CREATE OPERATION
# ---------------------
def create_operation(patient_id):
    p("CREATE OPERATION")
    payload = {
        "patient_id": patient_id,
        "name": "Photo_Test",
        "operation_date": date.today().isoformat(),
        "notes": "Photo E2E upload test"
    }
    r = requests.post(f"{OPERATIONS_URL}/", json=payload)
    data = must_json(r)
    print("Status:", r.status_code)
    print("Response:", data)
    if "operation" not in data or "id_operation" not in data["operation"]:
        raise RuntimeError("Failed to create operation")
    return data["operation"]["id_operation"]

# ---------------------
# UPLOAD PHOTO
# ---------------------
def upload_photo(id_operation, file_path):
    p("UPLOAD PHOTO")
    if not Path(file_path).exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, "rb") as f:
        files = {"file": (Path(file_path).name, f, "image/jpeg")}
        r = requests.post(f"{PHOTOS_URL}/upload/{id_operation}", files=files)
        data = must_json(r)
        print("Status:", r.status_code)
        print("Response:", data)
        if data.get("status") != "success":
            raise RuntimeError("Upload failed")
        return data["photo"]
    

# ---------------------
# UPLOAD MULTIPLE PHOTOS
# ---------------------
def upload_multiple_photos(id_operation, files_paths):
    p("UPLOAD MULTIPLE PHOTOS")

    valid_files = [Path(pth) for pth in files_paths if Path(pth).exists()]
    if not valid_files:
        raise FileNotFoundError("No valid photo files found")

    files = []
    for pth in valid_files:
        mime = "image/jpeg" if pth.suffix.lower() in [".jpg", ".jpeg"] else "image/png"
        files.append(("files", (pth.name, open(pth, "rb"), mime)))

    r = requests.post(f"{PHOTOS_URL}/upload-multiple/{id_operation}", files=files)
    data = must_json(r)
    print("Status:", r.status_code)
    print("Response:", data)

    for _, f in files:
        f[1].close()  # important: ferme les fichiers

    if data.get("status") != "success":
        raise RuntimeError("Upload multiple photos failed")
    return data["photos"]


# ---------------------
# GET PHOTOS BY OPERATION
# ---------------------
def get_photos(id_operation):
    p("GET PHOTOS")
    r = requests.get(f"{PHOTOS_URL}/photos/{id_operation}")
    data = must_json(r)
    print("Status:", r.status_code)
    print("Count:", len(data.get("photos", [])))
    return data.get("photos", [])

# ---------------------
# DELETE PHOTO
# ---------------------
def delete_photo(id_operation, filename):
    p("DELETE PHOTO")
    r = requests.delete(f"{PHOTOS_URL}/photos/{id_operation}/{filename}")
    data = must_json(r)
    print("Status:", r.status_code)
    print("Response:", data)
    return data

# ---------------------
# CLEANUP HELPERS
# ---------------------
def delete_operation(id_operation):
    p("DELETE OPERATION")
    r = requests.delete(f"{OPERATIONS_URL}/{id_operation}")
    print("Status:", r.status_code, "Response:", must_json(r))

def delete_patient(patient_id):
    p("DELETE PATIENT")
    r = requests.delete(f"{PATIENTS_URL}/{patient_id}")
    print("Status:", r.status_code, "Response:", must_json(r))

# ---------------------
# MAIN E2E FLOW
# ---------------------
if __name__ == "__main__":
    print("=== E2E PHOTO MULTI-UPLOAD START ===")
    patient_id = None
    id_operation = None

    try:
        patient_id = create_patient()
        id_operation = create_operation(patient_id)

        multi_photos = upload_multiple_photos(id_operation, [
            TEST_PHOTO,
            BASE_DIR.parents[2] / "test2.jpg"
        ])

        print("Uploaded photos:", [p["filename"] for p in multi_photos])

        photos = get_photos(id_operation)
        print("Photos found:", [p["filename"] for p in photos])

    finally:
        if id_operation:
            delete_operation(id_operation)
        if patient_id:
            delete_patient(patient_id)

    print("\n=== E2E PHOTO MULTI-UPLOAD COMPLETED ===")

