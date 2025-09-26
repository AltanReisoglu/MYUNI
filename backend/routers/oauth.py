from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid
from core.model import normalize_school_name, get_collection_info, generate_session_token, create_rag_agent, client, active_sessions, DB_NAME

oauther = APIRouter(tags=["auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    schoolName: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    ragCollectionId: str | None = None
    sessionToken: str | None = None
    user: dict | None = None

@oauther.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    try:
        email = request.email
        school_name = request.schoolName.strip()

        if not email or not school_name:
            raise HTTPException(status_code=400, detail="E-posta ve okul adı gereklidir")

        school_code = normalize_school_name(school_name)
        collection_name, _ = get_collection_info(school_code)
        collection = client[DB_NAME][collection_name]

        if collection.count_documents({}) == 0 and school_code != "general":
            raise HTTPException(status_code=404, detail="Bu okul sisteme kayıtlı değil.")

        session_token = generate_session_token(email, school_name)
        session_id = str(uuid.uuid4())

        rag_agent = create_rag_agent(school_name)
        config = {"configurable": {"thread_id": session_id}}

        active_sessions[session_id] = {
            "school_name": school_name,
            "school_code": school_code,
            "rag_agent": rag_agent,
            "config": config,
            "email": email,
            "created_at": datetime.utcnow()
        }

        return LoginResponse(
            success=True,
            message="Giriş başarılı",
            ragCollectionId=f"rag_collection_{school_code}",
            sessionToken=session_token,
            user={"email": email, "schoolName": school_name, "sessionId": session_id}
        )
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Sunucu hatası oluştu")
