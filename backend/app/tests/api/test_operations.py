import requests

API_URL = "http://localhost:8000/operations"

# ---------------------
# CREATE OPERATION
# ---------------------

def test_create_operation():
    payload = {
        "patient_id": "MV131",
        "name": "PreOp",
        "operation_date": "2025-09-16",
        "notes": "First Visit"
    }
    r = requests.post(API_URL + "/", json=payload)
    print("CREATE:", r.status_code, r.json())
    return r.json().get("id_operation")


# ---------------------
# READ OPERATION BY ID
# ---------------------

def test_get_operation(id_operation):
    r = requests.get(f"{API_URL}/{id_operation}")
    print("GET ONE:", r.status_code, r.json())


# ---------------------
# READ OPERATIONS BY PATIENT
# ---------------------

def test_get_operations_by_patient(patient_id):
    r = requests.get(f"{API_URL}/by_patient/{patient_id}")
    print("GET BY PATIENT:", r.status_code, r.json())


# ---------------------
# READ ALL OPERATIONS (limit 20)
# ---------------------

def test_get_all_operations(limit=20):
    r = requests.get(API_URL + "/")
    if r.status_code == 200:
        data = r.json()
        print("GET ALL:", r.status_code, f"{len(data)} operations (showing {min(len(data), limit)})")
        print(data[:limit])
    else:
        print("GET ALL ERROR:", r.status_code, r.text)


# ---------------------
# UPDATE OPERATION
# ---------------------

def test_update_operation(id_operation):
    payload = {
        "name": "Updated Visit",
        "notes": "Update of the visit"
    }
    r = requests.put(f"{API_URL}/{id_operation}", json=payload)
    print("UPDATE:", r.status_code, r.json())


# ---------------------
# DELETE OPERATION
# ---------------------

def test_delete_operation(id_operation):
    r = requests.delete(f"{API_URL}/{id_operation}")
    print("DELETE:", r.status_code, r.json())


# ---------------------
# MAIN
# ---------------------

if __name__ == "__main__":
    op_id = test_create_operation()
    if op_id:
        test_get_operation(op_id)
        #test_update_operation(op_id)
        #test_get_operations_by_patient("MV001")
        #test_get_all_operations()
        test_delete_operation(op_id)
