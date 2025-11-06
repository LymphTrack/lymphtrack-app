import requests
import os
from pathlib import Path

API_URL = "http://localhost:8000/results"
BASE_DIR = Path(__file__).resolve().parent
TEST_FILE = BASE_DIR.parents[2] / "VNA_test.xls" 
TEST_OPERATION_ID = 1              
TEST_PATIENT_ID = "MV001"            
TEST_POSITION = 84446


# ---------------------
# CREATE RESULT
# ---------------------
def test_create_result():
    print("\n=== CREATE RESULT ===")
    if not TEST_FILE.exists():
        print(f"Test file not found: {TEST_FILE}")
        return

    files = [("files", (TEST_FILE.name, open(TEST_FILE, "rb"), "application/vnd.ms-excel"))]
    r = requests.post(f"{API_URL}/process-results/{TEST_OPERATION_ID}/{TEST_POSITION}", files=files)
    try:
        print("Status:", r.status_code)
        print("Response:", r.json())
    except Exception:
        print("Raw:", r.status_code, r.text)


# ---------------------
# GET ALL RESULTS
# ---------------------
def test_get_all_results(limit=10):
    print("\n=== GET ALL RESULTS ===")
    r = requests.get(f"{API_URL}/")
    if r.status_code == 200:
        data = r.json()
        print(f"Found {len(data)} results (showing {min(len(data), limit)})")
        print(data[:limit])
        return data
    else:
        print("Error:", r.status_code, r.text)
        return []


# ---------------------
# GET RESULTS BY OPERATION
# ---------------------
def test_get_results_by_operation():
    print("\n=== GET RESULTS BY OPERATION ===")
    r = requests.get(f"{API_URL}/by_operation/{TEST_OPERATION_ID}")
    print("Status:", r.status_code)
    try:
        print("Response:", r.json())
    except Exception:
        print("Raw:", r.text)


# ---------------------
# GET RESULTS BY PATIENT
# ---------------------
def test_get_results_by_patient():
    print("\n=== GET RESULTS BY PATIENT ===")
    r = requests.get(f"{API_URL}/by_patient/{TEST_PATIENT_ID}")
    print("Status:", r.status_code)
    try:
        print("Response:", r.json())
    except Exception:
        print("Raw:", r.text)


# ---------------------
# GET RESULTS BY OPERATION + POSITION
# ---------------------
def test_get_results_by_operation_position():
    print("\n=== GET RESULTS BY OPERATION + POSITION ===")
    r = requests.get(f"{API_URL}/{TEST_OPERATION_ID}/{TEST_POSITION}")
    print("Status:", r.status_code)
    try:
        data = r.json()
        print("Response:", data)
        return data
    except Exception:
        print("Raw:", r.text)
        return []


# ---------------------
# PLOT DATA
# ---------------------
def test_get_plot_data():
    print("\n=== GET PLOT DATA ===")
    r = requests.get(f"{API_URL}/plot-data/{TEST_OPERATION_ID}/{TEST_POSITION}")
    print("Status:", r.status_code)
    try:
        print("Response:", r.json())
    except Exception:
        print("Raw:", r.text)


# ---------------------
# DELETE MEASUREMENT
# ---------------------
def test_delete_measurement(file_path):
    print("\n=== DELETE MEASUREMENT ===")
    payload = {"file_path": file_path}
    r = requests.post(f"{API_URL}/delete-measurements", json=payload)
    print("Status:", r.status_code)
    try:
        print("Response:", r.json())
    except Exception:
        print("Raw:", r.text)


# ---------------------
# MAIN TEST SEQUENCE
# ---------------------
if __name__ == "__main__":
    print("=== TEST RESULTS API (LOCAL MODE) ===")

    # Create a result
    test_create_result()

    # List all results
    #all_data = test_get_all_results()

    # By operation
    #test_get_results_by_operation()

    # By patient
    #test_get_results_by_patient()

    # By operation + position
    data = test_get_results_by_operation_position()

    # Plot data (graph API)
    #test_get_plot_data()

    # Delete the test file (if found)
