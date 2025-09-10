from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str

    SECRET_KEY: str = "3f6d9a2c41f248f49b9a68c31fcb1a897f82e39a3c11b7dd57b9e3a1f7e5c2b3"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    APP_NAME: str = "LymphTrack Backend"
    DEBUG: bool = True

    class Config:
        env_file = "backend/.env" 

settings = Settings()
