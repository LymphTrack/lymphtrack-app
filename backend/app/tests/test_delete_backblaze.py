import boto3
from botocore.config import Config
from dotenv import load_dotenv
import os

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

remote_name = "tests/movies_on_yt.docx"

# Lister toutes les versions
versions = s3.list_object_versions(Bucket=B2_BUCKET, Prefix=remote_name)

if "Versions" in versions:
    for v in versions["Versions"]:
        print(f"Suppression version {v['VersionId']}")
        s3.delete_object(Bucket=B2_BUCKET, Key=remote_name, VersionId=v["VersionId"])

if "DeleteMarkers" in versions:
    for v in versions["DeleteMarkers"]:
        print(f"Suppression delete marker {v['VersionId']}")
        s3.delete_object(Bucket=B2_BUCKET, Key=remote_name, VersionId=v["VersionId"])

print(f"✅ Toutes les versions de '{remote_name}' ont été supprimées de {B2_BUCKET}")
