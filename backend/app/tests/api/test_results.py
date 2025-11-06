import requests
from pathlib import Path
from datetime import date

API_BASE = "http://localhost:8000"
PATIENTS_URL = f"{API_BASE}/patients"
OPERATIONS_URL = f"{API_BASE}/operations"
RESULTS_URL = f"{API_BASE}/results"

BASE_DIR = Path(__file__).resolve().parent
TEST_FILE = BASE_DIR.parents[2] / "VNA_test.xls"     

def p(title):
    print("\n" + "="*12, title, "="*12)

def must_json(r):
    try:
        return r.json()
    except Exception:
        raise RuntimeError(f"Expected JSON, got: {r.status_code} {r.text[:200]}")

def create_patient():
    p("CREATE PATIENT")
    payload = {
        "age": 42,
        "gender": 1,
        "bmi": 23.1,
        "lymphedema_side": 1,
        "notes": "E2E auto test"
    }
    r = requests.post(f"{PATIENTS_URL}/", json=payload)
    print("Status:", r.status_code)
    data = must_json(r)
    print("Response:", data)
    if r.status_code != 200 or "patient_id" not in data:
        raise RuntimeError("Failed to create patient")
    return data["patient_id"]

def create_operation(patient_id):
    p("CREATE OPERATION")
    payload = {
        "patient_id": patient_id,
        "name": "Visit_1",
        "operation_date": date.today().isoformat(),  # YYYY-MM-DD
        "notes": "E2E operation"
    }
    r = requests.post(f"{OPERATIONS_URL}/", json=payload)
    print("Status:", r.status_code)
    data = must_json(r)
    print("Response:", data)
    if r.status_code != 200 or "operation" not in data or "id_operation" not in data["operation"]:
        raise RuntimeError("Failed to create operation")
    return data["operation"]["id_operation"]

def upload_results(id_operation, position=1, files_paths=None):
    p("UPLOAD RESULT(S)")
    if not files_paths:
        files_paths = [TEST_FILE]
    for pth in files_paths:
        if not Path(pth).exists():
            raise FileNotFoundError(f"Test file not found: {pth}")

    files = []
    for pth in files_paths:
        mime = "application/vnd.ms-excel" if str(pth).lower().endswith(".xls") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        files.append(("files", (Path(pth).name, open(pth, "rb"), mime)))

    r = requests.post(f"{RESULTS_URL}/process-results/{id_operation}/{position}", files=files)
    print("Status:", r.status_code)
    data = must_json(r)
    print("Response:", data)
    if r.status_code != 200 or data.get("status") != "success":
        raise RuntimeError("Failed to process results")
    return data["results"]  # liste de résultats (payload sérialisé)

def get_results_by_operation(id_operation):
    p("GET RESULTS BY OPERATION")
    r = requests.get(f"{RESULTS_URL}/by_operation/{id_operation}")
    print("Status:", r.status_code)
    data = must_json(r)
    print("Count:", len(data))
    return data

def get_results_by_patient(patient_id):
    p("GET RESULTS BY PATIENT")
    r = requests.get(f"{RESULTS_URL}/by_patient/{patient_id}")
    print("Status:", r.status_code)
    data = must_json(r)
    print("Count:", len(data))
    return data

def get_results_by_op_pos(id_operation, position):
    p("GET RESULTS BY OP + POS")
    r = requests.get(f"{RESULTS_URL}/{id_operation}/{position}")
    print("Status:", r.status_code)
    data = must_json(r)
    print("Response:", data)
    return data

def get_plot_data(id_operation, position):
    p("GET PLOT DATA")
    r = requests.get(f"{RESULTS_URL}/plot-data/{id_operation}/{position}")
    print("Status:", r.status_code)
    data = must_json(r)
    print("Points:", len(data))
    return data

def delete_measurement(file_path):
    p("DELETE MEASUREMENT")
    payload = {"file_path": file_path}
    r = requests.post(f"{RESULTS_URL}/delete-measurements", json=payload)
    print("Status:", r.status_code)
    data = must_json(r)
    print("Response:", data)
    return data

def delete_operation(id_operation):
    p("DELETE OPERATION")
    r = requests.delete(f"{OPERATIONS_URL}/{id_operation}")
    print("Status:", r.status_code)
    print("Response:", must_json(r))

def delete_patient(patient_id):
    p("DELETE PATIENT")
    r = requests.delete(f"{PATIENTS_URL}/{patient_id}")
    print("Status:", r.status_code)
    print("Response:", must_json(r))

if __name__ == "__main__":
    print("=== E2E FLOW: patient -> operation -> results -> cleanup ===")
    patient_id = None
    id_operation = None

    try:
        patient_id = create_patient()

        id_operation = create_operation(patient_id)

        results_payload = upload_results(id_operation, position=1, files_paths=[TEST_FILE])

        _ = get_results_by_operation(id_operation)
        _ = get_results_by_patient(patient_id)
        op_pos_data = get_results_by_op_pos(id_operation, 1)
        _ = get_plot_data(id_operation, 1)

        if op_pos_data:
            fp = op_pos_data[-1]["file_path"].replace("\\", "/")
            delete_measurement(fp)

    finally:
        if id_operation is not None:
            try:
                delete_operation(id_operation)
            except Exception as e:
                print("WARN: delete_operation failed:", e)
        if patient_id is not None:
            try:
                delete_patient(patient_id)
            except Exception as e:
                print("WARN: delete_patient failed:", e)

    print("\n=== E2E COMPLETED ===")
