from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine

from .routers import (
    patients,
    clinicians,
    requests,
    handoffs,
    results,
    notifications
)

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WatchTransfer Backend",
    description="A clinical notification responsibility system.",
    version="1.0.0"
)

# Setup CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For MVP, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(patients.router)
app.include_router(clinicians.router)
app.include_router(requests.router)
app.include_router(handoffs.router)
app.include_router(results.router)
app.include_router(notifications.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to WatchTransfer Backend! Go to /docs for the API Swagger."}
