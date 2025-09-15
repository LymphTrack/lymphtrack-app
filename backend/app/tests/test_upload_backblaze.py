import boto3
from botocore.config import Config
from dotenv import load_dotenv
import os

# Charger variables .env
load_dotenv()

B2_ENDPOINT = os.getenv("ENDPOINT_URL_YOUR_BUCKET")
B2_KEY_ID = os.getenv("KEY_ID_YOUR_ACCOUNT")
B2_APP_KEY = os.getenv("APPLICATION_KEY_YOUR_ACCOUNT")
B2_BUCKET = "lymphtrack-data"

s3 = boto3.client(
    "s3",
    endpoint_url=B2_ENDPOINT,
    aws_access_key_id=B2_KEY_ID,
    aws_secret_access_key=B2_APP_KEY,
    config=Config(signature_version="s3v4"),
)

local_file = r"C:\Users\simon\Documents\movies_on_yt.docx"
remote_name = "tests/movies_on_yt.docx"

s3.upload_file(local_file, B2_BUCKET, remote_name)
print(f"✅ Fichier uploadé vers {B2_BUCKET}/{remote_name}")
