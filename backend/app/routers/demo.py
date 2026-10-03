from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..demo_data import seed_demo_database

router = APIRouter(prefix="/demo", tags=["Demo Management"])

@router.post("/load")
def load_demo_data(force: bool = True, db: Session = Depends(get_db)):
    result = seed_demo_database(db, force=force)
    return result
