import requests

API_URL = "http://localhost:8000/users" 

# --------- 1. CREATE USER ---------
def test_create_user():
    payload = {
        "email": "testuser2@example.com",
        "password": "TestPass123!",
        "name": "Test User",
        "role": "Researcher",
        "institution": "LymphTrack Lab"
    }
    r = requests.post(API_URL + "/", json=payload)

    print("CREATE status:", r.status_code)
    return r.json().get("auth_user_id")

# --------- 2. READ ONE USER ---------
def test_get_user(user_id):
    r = requests.get(f"{API_URL}/{user_id}")
    print("GET:", r.status_code, r.json())

# --------- 3. UPDATE USER ---------
def test_update_user(user_id):
    payload = {
        "name": "Updated User",
        "role": "Doctor",
        "institution": "Updated Institution"
    }
    r = requests.put(f"{API_URL}/{user_id}", json=payload)
    print("UPDATE:", r.status_code, r.json())

# --------- 4. READ ALL USERS ---------
def test_get_all_users():
    r = requests.get(API_URL + "/")
    print("GET ALL:", r.status_code, r.json())

# --------- 5. DELETE USER ---------
def test_delete_user(user_id):
    r = requests.delete(f"{API_URL}/{user_id}")
    print("DELETE:", r.status_code, r.json())

# --------- MAIN ---------
if __name__ == "__main__":
    uid = test_create_user()
    if uid:
        test_get_user(uid)
        test_update_user(uid)
        test_get_all_users()
        test_delete_user(uid)
