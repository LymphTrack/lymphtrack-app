from fastapi import APIRouter, BackgroundTasks, Depends
from app.db.database import get_db
from app.models import models_step1, models_step2, models_step3

router = APIRouter(
    prefix="/outcomes",
    tags=["Outcomes"],
)

# === STEP 1 ===
@router.get("/step1")
def get_step1_results():
    """Renvoie les résultats du Step 1 (sans recalcul)"""
    return models_step1.run_step1()


@router.post("/step1/train")
def train_step1(background_tasks: BackgroundTasks, db=Depends(get_db)):
    """
    Lance le recalcul du modèle Step 1 en tâche de fond.
    Appelé automatiquement après ajout d'un fichier Excel,
    ou manuellement via cet endpoint.
    """
    background_tasks.add_task(models_step1.train_step1_model, db)
    return {"status": "queued", "message": "Recalculation started in background"}


# === STEP 2 ===
@router.get("/step2")
def get_step2_results():
    return models_step2.run_step2()


# === STEP 3 ===
@router.get("/step3")
def get_step3_results():
    return models_step3.run_step3()
