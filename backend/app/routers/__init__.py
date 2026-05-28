from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.alarms import router as alarms_router
from app.routers.expenses import router as expenses_router
from app.routers.admin import router as admin_router
from app.routers.recommendations import router as recommendations_router
from app.routers.my_cards import router as my_cards_router

__all__ = [
    "auth_router", "users_router", "alarms_router", "expenses_router",
    "admin_router", "recommendations_router", "my_cards_router",
]
