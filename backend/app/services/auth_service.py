from app.models.models import User
from app.repositories.user_repository import UserRepository


async def authenticate_user(
    repo: UserRepository,
    username: str,
    password: str,
) -> User | None:
    user = await repo.get_by_username(username)
    if not user:
        return None
    if not repo.verify_password(password, user.password):
        return None
    return user