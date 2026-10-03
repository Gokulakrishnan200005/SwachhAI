import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "SwachhAI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    BASE_DIR: Path = BASE_DIR
    UPLOADS_DIR: Path = UPLOADS_DIR
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "swachhai_super_secret_hackathon_jwt_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days for demo
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/swachhai.db")
    
    # Upload limits
    MAX_FILE_SIZE_MB: int = 15
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}
    
    # Municipal Zones
    ZONES: list = [
        "Zone 1 - Central Market",
        "Zone 2 - Gandhi Nagar",
        "Zone 3 - Station Road",
        "Zone 4 - Anna Salai",
        "Zone 5 - Industrial Area",
        "Zone 6 - Lakeview Colony"
    ]

settings = Settings()
