import requests, os

API_URL = "http://localhost:8000/photos"

# ---------------------
# UPLOAD PHOTO
# ---------------------
def test_upload_photo(id_operation, file_path):
    files = {
        "file": (os.path.basename(file_path), open(file_path, "rb"), "image/jpeg")
    }
    r = requests.post(f"{API_URL}/{id_operation}", files=files)
    try:
        print("UPLOAD PHOTO:", r.status_code, r.json())
    except Exception:
        print("UPLOAD PHOTO (raw):", r.status_code, r.text)


# ---------------------
# GET PHOTOS BY OPERATION
# ---------------------
def test_get_photos_by_operation(id_operation):
    r = requests.get(f"{API_URL}/{id_operation}")
    try:
        print("GET PHOTOS:", r.status_code, r.json())
    except Exception:
        print("GET PHOTOS (raw):", r.status_code, r.text)


# ---------------------
# MAIN
# ---------------------
if __name__ == "__main__":
    test_file = "backend/test.jpg"  
    test_operation_id = 6669    

    test_upload_photo(test_operation_id, test_file)
    test_get_photos_by_operation(test_operation_id)
