from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from fastapi.exceptions import RequestValidationError
from app.core.exceptions import AppError, app_error_handler, validation_error_handler
from app.routers import auth, districts, stocks, transfers, disaster, websocket

app = FastAPI(title="Kaiju API")
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(districts.router)
app.include_router(auth.router)
app.include_router(stocks.router)
app.include_router(transfers.router)
app.include_router(disaster.router)
app.include_router(websocket.router)