# backend/app/main.py
from litestar import Litestar
from litestar.config.cors import CORSConfig
from litestar.openapi.config import OpenAPIConfig
from litestar.openapi.plugins import ScalarRenderPlugin
from litestar.openapi.spec import Server
from litestar.middleware import DefineMiddleware
from app.core.security import oauth2_auth
from app.core.db import init_db          # <-- nuevo
from app.core.config import settings
from app.api.routes_cepas import CepaController
from app.api.routes_users import UserController
from app.api.routes_auth import AuthController
from app.core.redis_config import redis_client
from app.middleware.login_rate_limit import LoginRateLimitMiddleware
from app.core.logging_config import setup_logging

rate_limit_logger = setup_logging()

cors = CORSConfig(
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
    allow_credentials=True,
)

openapi_config = OpenAPIConfig(
    title="Backend Cepas",
    description="API para la gestión de cepas",
    version="1.0.0",
    root_schema_site="scalar",
    render_plugins=[ScalarRenderPlugin()],
    servers=[Server(url="http://localhost:8000", description="Desarrollo local")],
    path="/schema",
)

middleware = [
    DefineMiddleware(
        LoginRateLimitMiddleware,
        max_requests=5,
        window_seconds=60,
        redis_client=redis_client,
    ),
]

app = Litestar(
    route_handlers=[CepaController, UserController, AuthController],
    openapi_config=openapi_config,
    on_app_init=[oauth2_auth.on_app_init],
    on_startup=[init_db],               # <-- nuevo, reemplaza sql_plugin
    cors_config=cors,
    middleware=middleware,
    debug=settings.debug,
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        app_dir="backend",
    )
