import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000"
PATIENTS_URL = f"{API_BASE}/patients"
OPERATIONS_URL = f"{API_BASE}/operations"

def print_section(title):
    print("\n" + "=" * 30)
    print(title)
    print("=" * 30)

# ---------------------
# PATIENT CREATION
# ---------------------
def create_patient():
    payload = {
        "age": 40,
        "gender": 1,
        "bmi": 24.5,
        "lymphedema_side": 2,
        "notes": "test patient for operations"
    }
    r = requests.post(f"{PATIENTS_URL}/", json=payload)
    print_section("CREATE PATIENT")
    print("Status:", r.status_code)
    print("Response:", r.json())
    if r.status_code == 200:
        return r.json()["patient_id"]
    raise RuntimeError("Failed to create patient")

# ---------------------
# CREATE OPERATION
# ---------------------
def create_operation(patient_id, name, date_str):
    payload = {
        "patient_id": patient_id,
        "name": name,
        "operation_date": date_str,
        "notes": "operation test"
    }
    r = requests.post(f"{OPERATIONS_URL}/", json=payload)
    print_section(f"CREATE OPERATION ({name})")
    print("Status:", r.status_code)
    print("Response:", r.json())
    if r.status_code == 200:
        return r.json()["operation"]["id_operation"]
    raise RuntimeError("Failed to create operation")

# ---------------------
# GET OPERATION
# ---------------------
def get_operation(id_operation):
    r = requests.get(f"{OPERATIONS_URL}/{id_operation}")
    print_section(f"GET OPERATION {id_operation}")
    print("Status:", r.status_code)
    print("Response:", r.json())

# ---------------------
# UPDATE OPERATION
# ---------------------
def update_operation(id_operation, new_name):
    payload = {
        "name": new_name
    }
    r = requests.put(f"{OPERATIONS_URL}/{id_operation}", json=payload)
    print_section(f"UPDATE OPERATION {id_operation}")
    print("Status:", r.status_code)
    print("Response:", r.json())

# ---------------------
# EXPORT OPERATION
# ---------------------
def export_operation(id_operation):
    r = requests.get(f"{OPERATIONS_URL}/export-folder/{id_operation}")
    print_section(f"EXPORT OPERATION {id_operation}")
    print("Status:", r.status_code)
    if r.status_code == 200 and "application/zip" in r.headers.get("content-type", ""):
        filename = f"operation_{id_operation}.zip"
        with open(filename, "wb") as f:
            f.write(r.content)
        print(f"Saved zip: {filename}")
    else:
        print("Response:", r.text)

# ---------------------
# EXPORT POSITION
# ---------------------
def export_position(id_operation, position):
    r = requests.get(f"{OPERATIONS_URL}/export-position/{id_operation}/{position}")
    print_section(f"EXPORT POSITION {position} of OP {id_operation}")
    print("Status:", r.status_code)
    if r.status_code == 200 and "application/zip" in r.headers.get("content-type", ""):
        filename = f"operation_{id_operation}_pos{position}.zip"
        with open(filename, "wb") as f:
            f.write(r.content)
        print(f"Saved zip: {filename}")
    else:
        print("Response:", r.text)

# ---------------------
# DELETE OPERATION
# ---------------------
def delete_operation(id_operation):
    r = requests.delete(f"{OPERATIONS_URL}/{id_operation}")
    print_section(f"DELETE OPERATION {id_operation}")
    print("Status:", r.status_code)
    print("Response:", r.json())

# ---------------------
# DELETE PATIENT
# ---------------------
def delete_patient(patient_id):
    r = requests.delete(f"{PATIENTS_URL}/{patient_id}")
    print_section(f"DELETE PATIENT {patient_id}")
    print("Status:", r.status_code)
    print("Response:", r.json())

# ---------------------
# MAIN TEST
# ---------------------
if __name__ == "__main__":
    # create patient
    pid = create_patient()

    # create two operations
    op1 = create_operation(pid, "Visit_1", "2024-06-01")
    op2 = create_operation(pid, "Visit_2", "2024-09-15")

    # get operations
    get_operation(op1)
    get_operation(op2)

    # update one
    update_operation(op1, "Visit_1_updated")

    # export one operation (will create and delete zip)
    export_operation(op1)

    # export a position folder (if one exists)
    export_position(op1, 1)

    # delete an operation
    delete_operation(op1)

    # delete the patient
    delete_patient(pid)

    print("\nAll tests completed.")
