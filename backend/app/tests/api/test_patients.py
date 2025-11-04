import requests
import json

API_URL = "http://localhost:8000/patients"

# ---------------------
# CREATE PATIENT
# ---------------------
def test_create_patient():
    payload = {
        "age": 45,
        "gender": 1,
        "bmi": 23.5,
        "lymphedema_side": 1,
        "notes": "Premier test automatique"
    }
    r = requests.post(API_URL + "/", json=payload)
    print("\n=== CREATE PATIENT ===")
    print("Status:", r.status_code)
    print("Response:", r.json())

    if r.status_code == 200:
        return r.json().get("patient_id")
    else:
        return None


# ---------------------
# READ PATIENT BY ID
# ---------------------
def test_get_patient(patient_id):
    r = requests.get(f"{API_URL}/{patient_id}")
    print("\n=== GET PATIENT ===")
    print("Status:", r.status_code)
    print("Response:", r.json())


# ---------------------
# UPDATE PATIENT
# ---------------------
def test_update_patient(patient_id):
    payload = {
        "age": 50,
        "notes": "Mise à jour après 6 mois",
        "bmi": 25.1,
        "lymphedema_side": 2
    }
    r = requests.put(f"{API_URL}/{patient_id}", json=payload)
    print("\n=== UPDATE PATIENT ===")
    print("Status:", r.status_code)
    print("Response:", r.json())


# ---------------------
# READ ALL PATIENTS
# ---------------------
def test_get_all_patients():
    r = requests.get(API_URL + "/")
    print("\n=== GET ALL PATIENTS ===")
    print("Status:", r.status_code)
    patients = r.json()
    print(f"Total patients: {len(patients)}")
    print(json.dumps(patients, indent=2))


# ---------------------
# EXPORT ONE PATIENT
# ---------------------
def test_export_patient_folder(patient_id):
    r = requests.get(f"{API_URL}/export-folder/{patient_id}")
    print("\n=== EXPORT PATIENT FOLDER ===")
    print("Status:", r.status_code)

    if r.status_code == 200 and "application/zip" in r.headers.get("content-type", ""):
        filename = f"{patient_id}.zip"
        with open(filename, "wb") as f:
            f.write(r.content)
        print(f"ZIP sauvegardé sous '{filename}'")
    else:
        try:
            print("Response:", r.json())
        except:
            print("Response (raw):", r.text)


# ---------------------
# EXPORT MULTIPLE PATIENTS
# ---------------------
def test_export_multiple_patients(ids):
    payload = {"patient_ids": ids}
    r = requests.post(f"{API_URL}/export-multiple/", json=payload)
    print("\n=== EXPORT MULTIPLE PATIENTS ===")
    print("Status:", r.status_code)

    if r.status_code == 200 and "application/zip" in r.headers.get("content-type", ""):
        filename = f"patients_export_{len(ids)}.zip"
        with open(filename, "wb") as f:
            f.write(r.content)
        print(f"ZIP multiple sauvegardé sous '{filename}'")
    else:
        try:
            print("Response:", r.json())
        except:
            print("Response (raw):", r.text)


# ---------------------
# DELETE PATIENT
# ---------------------
def test_delete_patient(patient_id):
    r = requests.delete(f"{API_URL}/{patient_id}")
    print("\n=== DELETE PATIENT ===")
    print("Status:", r.status_code)
    print("Response:", r.json())


# ---------------------
# MAIN TEST SEQUENCE
# ---------------------
if __name__ == "__main__":
    print("===== TEST BACKEND PATIENTS API =====")

    # Création d’un patient
    pid = test_create_patient()
    if not pid:
        print("Erreur: impossible de créer un patient.")
        exit(1)

    # Lecture du patient créé
    test_get_patient(pid)

    # Mise à jour
    test_update_patient(pid)

    # Liste complète
    # test_get_all_patients()

    # Export du patient individuel
    test_export_patient_folder("MV001")

    # Export multiple (tu peux en ajouter d’autres)
    test_export_multiple_patients(["MV002", "MV001"])

    # Suppression du patient
    test_delete_patient(pid)
