# backend/app/services/user_service.py
from __future__ import annotations

from typing import Any, Dict, List

from advanced_alchemy.exceptions import NotFoundError
from sqlalchemy.orm import Session

from app.models.models import User
from app.repositories.repositories import UserRepository


def list_users(user_repo: UserRepository) -> List[User]:
    """Devuelve la lista completa de usuarios."""
    return user_repo.list()


def create_user_with_next_id(user_repo: UserRepository, user: User) -> User:
    """
    Calcula el próximo ID disponible, lo asigna al usuario y lo guarda
    con la contraseña hasheada.
    """
    next_id = user_repo.get_next_table_id("users")
    user.id = next_id
    return user_repo.add_with_password_hash(user, auto_commit=True)


def update_user_by_id(
    user_repo: UserRepository,
    user_id: int,
    data: Dict[str, Any],
) -> User:
    """
    Actualiza un usuario usando get_and_update de Advanced Alchemy.
    """
    try:
        user, _ = user_repo.get_and_update(
            match_fields="id",
            id=user_id,
            auto_commit=True,
            **data,
        )
        return user
    except NotFoundError:
        # Que el controller traduzca a HTTP 404
        raise


def delete_user_and_resequence(
    user_repo: UserRepository,
    user_id: int,
) -> int:
    """
    Elimina un usuario y luego re-secuencia los IDs de la tabla 'users',
    reiniciando la secuencia. Devuelve el siguiente ID que tendrá la secuencia.
    """
    try:
        # Mantengo la semántica original: primero delete con auto_commit=True
        user_repo.delete(user_id, auto_commit=True)
    except NotFoundError:
        raise

    session: Session = user_repo.session
    next_id = user_repo.resequence_table_ids(
        table_name="users",
        sequence_name="users_id_seq",
        deleted_id=user_id,
    )
    session.commit()
    return next_id
