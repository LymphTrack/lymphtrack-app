import requests

API_URL = "http://localhost:8000/results"


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
    r = requests.get(f"{API_URL}/{id_operation}")
    print("GET RESULTS BY OPERATION:", r.status_code, r.json())


# ---------------------
# READ RESULTS BY PATIENT
# ---------------------

def test_get_results_by_patient(patient_id):
    r = requests.get(f"{API_URL}/{patient_id}")
    print("GET RESULTS BY PATIENT:", r.status_code, r.json())


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
    results = test_get_all_results()

    if results:
        sample = results[0]
        id_operation = sample.get("id_operation")
        position = sample.get("position")
        file_path = sample.get("file_path")

        if id_operation:
            test_get_results_by_operation(id_operation)
        if "patient_id" in sample:
            test_get_results_by_patient(sample["patient_id"])
        if id_operation and position:
            test_get_results_by_operation_position(id_operation, position)
        if file_path:
            test_delete_measurement(file_path)
