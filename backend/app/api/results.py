from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.models import Result
from app.db.database import get_db

router = APIRouter()

@router.get("/{id_operation}/{position}")
def get_results(id_operation: int, position: int, db: Session = Depends(get_db)):
    return (
        db.query(Result)
        .filter(Result.id_operation == id_operation, Result.position == position)
        .order_by(Result.measurement_number.asc())
        .all()
    )

@router.post("/{id_operation}/{position}")
def process_results(id_operation: int, position: int, db: Session = Depends(get_db)):
    # ⚠️ Ici tu mets ta logique "process-results"
    # par exemple parser les fichiers importés et remplir les résultats
    # pour le moment, on fait un simple placeholder
    results = db.query(Result).filter(Result.id_operation == id_operation, Result.position == position).all()
    return {"results": results}
