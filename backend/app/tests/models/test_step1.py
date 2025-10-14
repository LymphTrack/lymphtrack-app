from app.models import models_step1
from app.db.database import SessionLocal

def main():
    db = SessionLocal()
    try:
        result = models_step1.train_step1_model(db)
        print(result)
    finally:
        db.close()

if __name__ == "__main__":
    main()
