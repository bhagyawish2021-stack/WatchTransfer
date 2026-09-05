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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


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
