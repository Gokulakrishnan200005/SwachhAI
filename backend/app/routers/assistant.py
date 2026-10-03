from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..ai.civic_assistant import query_civic_assistant

router = APIRouter(prefix="/assistant", tags=["AI Civic Assistant"])

class ChatRequest(BaseModel):
    question: str

@router.post("/chat")
def chat_assistant(req: ChatRequest, db: Session = Depends(get_db)):
    result = query_civic_assistant(req.question, db)
    return result
