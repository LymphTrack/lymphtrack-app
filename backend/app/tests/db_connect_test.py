import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("DATABASE_URL").replace("+psycopg2", "")

try:
    conn = psycopg2.connect(url, sslmode="require")
    print("Connection successful to Supabase PostgreSQL!")
    conn.close()
except Exception as e:
    print("Connection error:", e)
