from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.models import Operation, Result
from app.db.database import get_db
import boto3, os
from dotenv import load_dotenv
from botocore.config import Config

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

router = APIRouter()

@router.get("/by_patient/{patient_id}")
def get_operations(patient_id: str, db: Session = Depends(get_db)):
    ops = db.query(Operation).filter(Operation.patient_id == patient_id).all()
    return ops

@router.get("/{id_operation}")
def get_operation(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    return op

@router.get("/{id_operation}/results")
def get_results(id_operation: int, db: Session = Depends(get_db)):
    results = (
        db.query(Result)
        .filter(Result.id_operation == id_operation)
        .order_by(Result.position, Result.measurement_number)
        .all()
    )
    return results

@router.delete("/{id_operation}")
def delete_operation(id_operation: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    patient_id = op.patient_id

    all_ops = (
        db.query(Operation)
        .filter(Operation.patient_id == patient_id)
        .order_by(Operation.operation_date.asc())
        .all()
    )
    visit_number = {o.id_operation: idx + 1 for idx, o in enumerate(all_ops)}[op.id_operation]
    visit_str = f"{visit_number}_{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"
    visit_prefix = f"{patient_id}/{visit_str}/"

    try:
        continuation_token = None
        while True:
            if continuation_token:
                response = s3.list_objects_v2(
                    Bucket=B2_BUCKET, Prefix=visit_prefix, ContinuationToken=continuation_token
                )
            else:
                response = s3.list_objects_v2(Bucket=B2_BUCKET, Prefix=visit_prefix)

            if "Contents" in response:
                delete_keys = [{"Key": obj["Key"]} for obj in response["Contents"]]
                s3.delete_objects(Bucket=B2_BUCKET, Delete={"Objects": delete_keys})

            if response.get("IsTruncated"):
                continuation_token = response.get("NextContinuationToken")
            else:
                break

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting visit files: {str(e)}")

    db.delete(op)
    db.commit()

    return {
        "message": f"Operation {id_operation} deleted successfully",
        "patient_id": patient_id,
        "deleted_folder": visit_prefix
    }


@router.put("/{id_operation}")
def update_operation(id_operation: int, updated_data: dict, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id_operation == id_operation).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    old_name = op.name
    old_date = op.operation_date

    for key, value in updated_data.items():
        if hasattr(op, key):
            setattr(op, key, value)

    db.commit()
    db.refresh(op)

    if op.name != old_name or op.operation_date != old_date:
        try:
            patient_id = op.patient_id
            all_ops = (
                db.query(Operation)
                .filter(Operation.patient_id == patient_id)
                .order_by(Operation.operation_date.asc())
                .all()
            )
            visit_number = {o.id_operation: idx + 1 for idx, o in enumerate(all_ops)}[op.id_operation]

            old_visit_str = f"{visit_number}_{old_name.replace(' ', '_')}_{old_date.strftime('%d%m%Y')}"
            new_visit_str = f"{visit_number}_{op.name.replace(' ', '_')}_{op.operation_date.strftime('%d%m%Y')}"

            old_prefix = f"{patient_id}/{old_visit_str}/"
            new_prefix = f"{patient_id}/{new_visit_str}/"

            objects = s3.list_objects_v2(Bucket=B2_BUCKET, Prefix=old_prefix)
            if "Contents" in objects:
                for obj in objects["Contents"]:
                    old_key = obj["Key"]
                    new_key = old_key.replace(old_prefix, new_prefix, 1)

                    s3.copy_object(
                        Bucket=B2_BUCKET,
                        CopySource={"Bucket": B2_BUCKET, "Key": old_key},
                        Key=new_key
                    )

                delete_keys = [{"Key": obj["Key"]} for obj in objects["Contents"]]
                s3.delete_objects(Bucket=B2_BUCKET, Delete={"Objects": delete_keys})

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error renaming folder in B2: {e}")

    return op


@router.post("/")
def create_operation(op_data: dict = Body(...), db: Session = Depends(get_db)):
    try:
        new_op = Operation(**op_data)
        db.add(new_op)
        db.commit()
        db.refresh(new_op)

        patient_id = new_op.patient_id
        
        all_ops = (
            db.query(Operation)
            .filter(Operation.patient_id == patient_id)
            .order_by(Operation.operation_date.asc())
            .all()
        )
        visit_number = {op.id_operation: idx + 1 for idx, op in enumerate(all_ops)}[new_op.id_operation]

        visit_name = new_op.name.replace(" ", "_")
        visit_str = f"{visit_number}_{visit_name}_{new_op.operation_date.strftime('%d%m%Y')}"

        for pos in range(1, 7):
            folder_key = f"{patient_id}/{visit_str}/{pos}/"
            s3.put_object(Bucket=B2_BUCKET, Key=folder_key)

        return {
            "status": "success",
            "operation": new_op,
            "visit_folder": f"{patient_id}/{visit_str}/"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating operation: {e}")
