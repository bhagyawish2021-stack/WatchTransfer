from fastapi import FastAPI

from database import engine, Base

from routers import patients
from routers import clinicians
from routers import requests
from routers import handoffs

import models

app = FastAPI(
    title="WatchTransfer API",
    description="Responsibility-aware clinical notification system",
    version="1.0.0"
)


Base.metadata.create_all(bind=engine)


app.include_router(patients.router)
app.include_router(clinicians.router)
app.include_router(requests.router)
app.include_router(handoffs.router)


@app.get("/")
def root():
    return {
        "message": "WatchTransfer API is running"
    }
