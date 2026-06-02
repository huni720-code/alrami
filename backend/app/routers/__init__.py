from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.alarms import router as alarms_router
from app.routers.expenses import router as expenses_router
from app.routers.admin import router as admin_router
from app.routers.recommendations import router as recommendations_router
from app.routers.my_cards import router as my_cards_router
from app.routers.dashboard import router as dashboard_router
from app.routers.import_router import router as import_router
from app.routers.contracts import router as contracts_router
from app.routers.switch_logs import router as switch_logs_router

__all__ = [
    "auth_router", "users_router", "alarms_router", "expenses_router",
    "admin_router", "recommendations_router", "my_cards_router", "dashboard_router",
    "import_router", "contracts_router", "switch_logs_router",
]
