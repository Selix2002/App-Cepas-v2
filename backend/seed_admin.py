#!/usr/bin/env python
"""
Crea el primer usuario administrador en la base de datos.

Uso:
    uv run python -m scripts.seed_admin
    uv run python -m scripts.seed_admin --username admin --password secreto123
"""
import asyncio
import argparse

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.models import User, Cepa
from app.repositories.user_repository import UserRepository, UserAlreadyExistsError
from app.schema.user_dto import UserCreateDTO


async def seed_admin(username: str, password: str) -> None:
    # Inicializar conexión
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.db_name],
        document_models=[User, Cepa],
    )

    repo = UserRepository()

    try:
        user = await repo.create(UserCreateDTO(
            username=username,
            password=password,
            is_admin=True,
        ))
        print(f"✓ Admin creado exitosamente: '{user.username}' (id: {user.id})")
    except UserAlreadyExistsError:
        print(f"✗ Ya existe un usuario con username '{username}'")
    finally:
        client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Crear usuario admin inicial")
    parser.add_argument("--username", default="admin", help="Username del admin (default: admin)")
    parser.add_argument("--password", required=True, help="Contraseña del admin (mínimo 8 caracteres)")
    args = parser.parse_args()

    asyncio.run(seed_admin(args.username, args.password))


if __name__ == "__main__":
    main()