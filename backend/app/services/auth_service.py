import bcrypt

from app.models.models import User
from app.repositories.user_repository import UserRepository

# S9: pre-computed hash used to consume constant time when the username doesn't exist,
# preventing timing-based user enumeration attacks.
_DUMMY_HASH = bcrypt.hashpw(b"dummy_password_for_timing_safety", bcrypt.gensalt()).decode()


async def authenticate_user(
    repo: UserRepository,
    username: str,
    password: str,
) -> User | None:
    user = await repo.get_by_username(username)
    if not user:
        # S9: run bcrypt even on missing user so response time doesn't reveal existence
        await repo.verify_password(password, _DUMMY_HASH)
        return None
    if not await repo.verify_password(password, user.password):
        return None
    return user