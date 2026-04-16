from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.models import Cepa, User


async def init_db() -> None:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    document_models = [Cepa, User]

    if settings.IA_ENABLED:
        from app.ia.models import ChatFeedback
        document_models.append(ChatFeedback)

    await init_beanie(
        database=client[settings.db_name],
        document_models=document_models,
    )
