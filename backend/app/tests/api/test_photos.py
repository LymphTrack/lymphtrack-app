import requests, os
from pathlib import Path
from datetime import date

API_BASE = "http://localhost:8000"
PATIENTS_URL = f"{API_BASE}/patients"
OPERATIONS_URL = f"{API_BASE}/operations"
PHOTOS_URL = f"{API_BASE}/photos"

# === CONFIGURATION ===
TEST_FILE = Path("backend/test.jpg")

def p(title):
    print("\n" + "="*12, title, "="*12)

def must_json(r):
    try:
        return r.json()
    except Exception:
        print("Raw response:", r.status_code, r.text)
        raise RuntimeError("Expected JSON")

# ---------------------
# CREATE PATIENT
# ---------------------
def create_patient():
    p("CREATE PATIENT")
    payload = {
        "age": 40,
        "gender": 1,
        "bmi": 21.5,
        "lymphedema_side": 1,
        "notes": "Auto E2E photo test"
    }
    r = requests.post(f"{PATIENTS_URL}/", json=payload)
    data = must_json(r)
    print("Status:", r.status_code, "Response:", data)
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
        "notes": "Test photo upload"
    }
    r = requests.post(f"{OPERATIONS_URL}/", json=payload)
    data = must_json(r)
    print("Status:", r.status_code, "Response:", data)
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

    files = {
        "file": (os.path.basename(file_path), open(file_path, "rb"), "image/jpeg")
    }
    r = requests.post(f"{PHOTOS_URL}/{id_operation}", files=files)
    data = must_json(r)
    print("Status:", r.status_code, "Response:", data)
    if data.get("status") != "success":
        raise RuntimeError("Upload failed")
    return data["photo"]

# ---------------------
# GET PHOTOS
# ---------------------
def get_photos(id_operation):
    p("GET PHOTOS")
    r = requests.get(f"{PHOTOS_URL}/{id_operation}")
    data = must_json(r)
    print("Status:", r.status_code, "Count:", len(data))
    return data

# ---------------------
# DELETE PHOTO
# ---------------------
def delete_photo(url):
    p("DELETE PHOTO")
    payload = {"url": url}
    r = requests.post(f"{PHOTOS_URL}/delete-photo", json=payload)
    data = must_json(r)
    print("Status:", r.status_code, "Response:", data)
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
    print("=== E2E PHOTO TEST START ===")
    patient_id = None
    id_operation = None

    try:
        patient_id = create_patient()

        id_operation = create_operation(patient_id)

        photo = upload_photo(id_operation, TEST_FILE)

        photos = get_photos(id_operation)

        if photos:
            url = photos[-1]["url"].replace("\\", "/")
            delete_photo(url)

    finally:
        if id_operation:
            try:
                delete_operation(id_operation)
            except Exception as e:
                print("WARN: delete_operation failed:", e)
        if patient_id:
            try:
                delete_patient(patient_id)
            except Exception as e:
                print("WARN: delete_patient failed:", e)

    print("\n=== E2E PHOTO TEST COMPLETED ===")
