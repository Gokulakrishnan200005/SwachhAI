from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .config import settings
from .database import engine, Base, SessionLocal
from .demo_data import seed_demo_database
from .routers import auth, reports, tasks, hotspots, analytics, assistant, notifications, audit, demo

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Waste Segregation, Collection Verification & Hotspot Intelligence"
)

# CORS setup for Vite frontend (running on port 5173 / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory for serving submitted photos
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR)), name="uploads")

# Include Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(tasks.router, prefix=settings.API_PREFIX)
app.include_router(hotspots.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(assistant.router, prefix=settings.API_PREFIX)
app.include_router(notifications.router, prefix=settings.API_PREFIX)
app.include_router(audit.router, prefix=settings.API_PREFIX)
app.include_router(demo.router, prefix=settings.API_PREFIX)

@app.on_event("startup")
def startup_event():
    # Ensure database is pre-seeded with rich demo dataset on first launch
    db = SessionLocal()
    try:
        seed_demo_database(db, force=False)
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "app": "SwachhAI",
        "description": "AI-Powered Waste Segregation, Collection Verification & Hotspot Intelligence",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "status": "online"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
