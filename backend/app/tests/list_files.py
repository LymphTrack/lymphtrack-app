import boto3
from botocore.config import Config
from dotenv import load_dotenv
import os

# Charger les variables d'environnement (.env)
load_dotenv()

B2_ENDPOINT = os.getenv("ENDPOINT_URL_YOUR_BUCKET")
B2_KEY_ID = os.getenv("KEY_ID_YOUR_ACCOUNT")
B2_APP_KEY = os.getenv("APPLICATION_KEY_YOUR_ACCOUNT")
B2_BUCKET = "lymphtrack-data"

# Connexion au service S3-compatible Backblaze
s3 = boto3.client(
    "s3",
    endpoint_url=B2_ENDPOINT,
    aws_access_key_id=B2_KEY_ID,
    aws_secret_access_key=B2_APP_KEY,
    config=Config(signature_version="s3v4"),
)

# Lister les objets du bucket
try:
    response = s3.list_objects_v2(Bucket=B2_BUCKET)

    if "Contents" in response:
        print(f"📂 Contenu du bucket '{B2_BUCKET}':")
        for obj in response["Contents"]:
            print(f"- {obj['Key']} ({obj['Size']} octets)")
    else:
        print(f"📂 Le bucket '{B2_BUCKET}' est vide.")
except Exception as e:
    print(f"❌ Erreur pendant la liste des fichiers : {e}")
