import os
from dotenv import load_dotenv
from mega import Mega

load_dotenv()

EMAIL = os.getenv("MEGA_EMAIL")
PASSWORD = os.getenv("MEGA_PASSWORD")

try:
    mega = Mega()
    m = mega.login(EMAIL, PASSWORD)
    print("Connexion réussie à Mega.nz")
except Exception as e:
    print("Erreur de connexion:", e)
