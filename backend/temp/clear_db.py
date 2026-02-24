from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# ------------------------------------------------------------------------
# Ajusta aquí tu URL de conexión si es necesario
# ------------------------------------------------------------------------
engine = create_engine(settings.database_url)
Session = sessionmaker(bind=engine)


def clear_all_tables():
    """
    Borra todos los registros de las tablas relacionadas con cepas
    y reinicia sus secuencias (autoincrementadores) a 1 usando TRUNCATE ... RESTART IDENTITY CASCADE.
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                TRUNCATE TABLE
                    proyectos,
                    caracterizacion_genetica,
                    resistencia_antibiotica,
                    crecimiento_temperatura,
                    actividad_enzimatica,
                    morfologia,
                    medios_cultivo,
                    almacenamiento,
                    cepas
                RESTART IDENTITY CASCADE;
                """
            )
        )
    print("✅ Todas las tablas fueron truncadas y sus secuencias reiniciadas.")


if __name__ == "__main__":
    clear_all_tables()

#PARA EJECUTAR CORRER DESDE BACKEND: python -m temp.clear_db