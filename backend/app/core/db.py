from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.models import Cepa, User, ChatFeedback


async def init_db() -> None:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.db_name],
        document_models=[Cepa, User, ChatFeedback],
    )