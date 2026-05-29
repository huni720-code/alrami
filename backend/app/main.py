from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401 - 모델 등록
from app.routers import auth_router, users_router, alarms_router, expenses_router, admin_router, recommendations_router, my_cards_router, dashboard_router, import_router
from app.services.alarm_scheduler import start_scheduler, stop_scheduler

app = FastAPI(title="알라미 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(alarms_router, prefix="/api")
app.include_router(expenses_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")
app.include_router(my_cards_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(import_router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()


@app.get("/")
def root():
    return {"message": "알라미 API 서버가 실행 중입니다."}


@app.get("/health")
def health_check():
    return {"status": "ok"}
