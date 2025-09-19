import requests

API_URL = "http://localhost:8000/patients"


# ---------------------
# CREATE PATIENT
# ---------------------

def test_create_patient():
    payload = {
        "age": 45,
        "gender": 1,
        "bmi": 23.5,
        "lymphedema_side": 1
    }
    r = requests.post(API_URL + "/", json=payload)
    print("CREATE:", r.status_code, r.json())
    return r.json().get("patient_id")


# ---------------------
# READ PATIENT BY ID
# ---------------------
def test_get_patient(patient_id):
    r = requests.get(f"{API_URL}/{patient_id}")
    print("GET:", r.status_code, r.json())


# ---------------------
# UPDATE PATIENT
# ---------------------
def test_update_patient(patient_id):
    payload = {
        "age": 50,
        "notes": "Mise à jour : suivi à 6 mois",
        "bmi": 25.1,
        "lymphedema_side": 3
    }
    r = requests.put(f"{API_URL}/{patient_id}", json=payload)
    print("UPDATE:", r.status_code, r.json())


# ---------------------
# READ ALL PATIENTS
# ---------------------

def test_get_all_patients():
    r = requests.get(API_URL + "/")
    print("GET ALL:", r.status_code, r.json())


# ---------------------
# EXPORT PATIENT FOLDER
# ---------------------

def test_export_patient_folder(patient_id):
    r = requests.get(f"{API_URL}/export-folder/MV001")
    print("EXPORT:", r.status_code)

    if r.status_code == 200 and r.headers.get("content-type") == "application/zip":
        filename = f"{patient_id}.zip"
        with open(filename, "wb") as f:
            f.write(r.content)
        print(f"ZIP sauvegardé en local sous {filename}")
    else:
        print("EXPORT response:", r.json())


# ---------------------
# DELETE PATIENT
# ---------------------

def test_delete_patient(patient_id):
    r = requests.delete(f"{API_URL}/{patient_id}")
    print("DELETE:", r.status_code, r.json())


# ---------------------
# MAIN
# ---------------------

if __name__ == "__main__":
    pid = test_create_patient()
    if pid:
        test_get_patient(pid)
        test_update_patient(pid)
        test_get_all_patients()
        # test_export_patient_folder(pid)
        test_delete_patient(pid)
