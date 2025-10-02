from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from app.db.database import Base
import enum
from datetime import datetime, timezone


# ---------------------
# USERS
# ---------------------

class UserTypeEnum(str, enum.Enum):
    admin = "admin"
    user = "user"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) 
    email = Column(String)
    name = Column(String)
    role = Column(String)
    created_at = Column(DateTime) 
    institution = Column(String)
    user_type = Column(Enum(UserTypeEnum), nullable=False, default=UserTypeEnum.user)


# ---------------------
# SICK PATIENTS
# ---------------------
class SickPatient(Base):
    __tablename__ = "sick_patients"

    patient_id = Column(String, primary_key=True, index=True)
    age = Column(Integer)
    gender = Column(Integer)
    lymphedema_side = Column(Integer)
    bmi = Column(Float)
    notes = Column(String)


# ---------------------
# HEALTHY PATIENTS
# ---------------------
class HealthyPatient(Base):
    __tablename__ = "healthy_patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer)
    position = Column(Integer)
    average_min_frequency_hz = Column(Float)
    average_min_return_loss_db = Column(Float)
    average_bandwidth_hz = Column(Float)


# ---------------------
# HEALTHY METADATA
# ---------------------
class HealthyMetadata(Base):
    __tablename__ = "healthy_metadata"

    patient_id = Column(Integer, primary_key=True, index=True)
    healthy_side = Column(String) 


# ---------------------
# OPERATIONS
# ---------------------
class Operation(Base):
    __tablename__ = "operations"

    id_operation = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String)
    name = Column(String)
    operation_date = Column(DateTime)
    notes = Column(String)


# ---------------------
# RESULTS
# ---------------------
class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_operation = Column(Integer, ForeignKey("operations.id_operation"))
    position = Column(Integer)
    measurement_number = Column(Integer)
    min_return_loss_db = Column(Float)
    min_frequency_hz = Column(Float)
    bandwidth_hz = Column(Float)
    file_path = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)


# ---------------------
# PHOTOS
# ---------------------
class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_operation = Column(Integer, ForeignKey("operations.id_operation"), nullable=False)
    url = Column(String, nullable=False)             
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
