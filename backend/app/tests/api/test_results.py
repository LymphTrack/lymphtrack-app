import requests, os

API_URL = "http://localhost:8000/results"


# ---------------------
# CREATE RESULT
# ---------------------

def test_create_results(id_operation, position, file_path):
    files = {
        "files": (os.path.basename(file_path), open(file_path, "rb"), "application/vnd.ms-excel")
    }
    r = requests.post(f"{API_URL}/process-results/{id_operation}/{position}", files=files)
    try:
        print("CREATE RESULTS:", r.status_code, r.json())
    except Exception:
        print("CREATE RESULTS (raw):", r.status_code, r.text)



# ---------------------
# READ ALL RESULTS (limit 20)
# ---------------------

def test_get_all_results(limit=20):
    r = requests.get(API_URL + "/")
    if r.status_code == 200:
        data = r.json()
        print("GET ALL RESULTS:", r.status_code, f"{len(data)} results (showing {min(len(data), limit)})")
        print(data[:limit])
        return data
    else:
        print("ERROR:", r.status_code, r.text)
        return []


# ---------------------
# READ RESULTS BY OPERATION
# ---------------------

def test_get_results_by_operation(id_operation):
    r = requests.get(f"{API_URL}/by_operation/{id_operation}")
    print("GET RESULTS BY OPERATION:", r.status_code, r.json())


# ---------------------
# READ RESULTS BY PATIENT
# ---------------------

def test_get_results_by_patient(patient_id):
    r = requests.get(f"{API_URL}/by_patient/{patient_id}")
    print("GET RESULTS BY PATIENT:", r.status_code, r.text)


# ---------------------
# READ RESULTS BY OPERATION + POSITION
# ---------------------

def test_get_results_by_operation_position(id_operation, position):
    r = requests.get(f"{API_URL}/{id_operation}/{position}")
    print("GET RESULTS BY OPERATION+POSITION:", r.status_code, r.json())


# ---------------------
# DELETE MEASUREMENT
# ---------------------

def test_delete_measurement(file_path):
    payload = {"file_path": file_path}
    r = requests.post(f"{API_URL}/delete-measurements", json=payload)
    print("DELETE MEASUREMENT:", r.status_code, r.json())


# ---------------------
# MAIN
# ---------------------

if __name__ == "__main__":
    test_file = "backend/VNA_test.xls"      
    test_operation_id = 6625               
    test_position = 1

    #test_create_results(test_operation_id, test_position, test_file)
    #test_get_results_by_patient(test_patient)
    test_delete_measurement("MV131/1-PreOp_19082025/1/VNA_test.xls")


