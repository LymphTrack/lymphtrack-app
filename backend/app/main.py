from fastapi import FastAPI
from app.core.config import settings
from app.api import users
from app.api import patients
from app.api import operations
from app.api import results
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://lymphtrack-app.vercel.app",
        "http://localhost:19006", 
        "http://localhost:3000"     
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(patients.router, prefix="/patients", tags=["Patients"])
app.include_router(operations.router, prefix="/operations", tags=["Operations"])
app.include_router(results.router, prefix="/results", tags=["Results"])


