from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base

from routers import patients
from routers import clinicians
from routers import requests
from routers import handoffs
from routers import results
from routers import notifications
from routers import audit

import models

app = FastAPI(
    title="WatchTransfer API",
    description="Responsibility-aware clinical notification system",
    version="1.0.0"
)

import os

cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
extra_origins = os.getenv("CORS_ORIGINS")
if extra_origins:
    cors_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*" if os.getenv("ALLOW_ALL_HTTPS", "true").lower() == "true" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from migrate import run_migrations

Base.metadata.create_all(bind=engine)
run_migrations()


app.include_router(patients.router)
app.include_router(clinicians.router)
app.include_router(requests.router)
app.include_router(handoffs.router)
app.include_router(results.router)
app.include_router(notifications.router)
app.include_router(audit.router)


@app.get("/")
def root():
    return {
        "message": "WatchTransfer API is running"
    }


@app.get("/health")
def health():
    return {"status": "ok"}
