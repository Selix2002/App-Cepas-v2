PROYECTO_CEPAS/
│
├── backend/
|   ├── alembic/                 # Migraciones de Alembic
│   |    ├── versions/           # Scripts de migración generados
|   |    ├── env.py/             # Script de arranque de Alembic
|   ├── app/
│   |    ├── __init__.py
│   |    ├── crud.py             # Funciones CRUD
│   |    ├── database.py         # Configuración de la base de datos
│   |    ├── main.py             # Script de ejemplo de uso
│   |    └── models.py           # Modelos SQLAlchemy (con las modificaciones solitadas)
|   |    data/
|   |    └── cepas_data.csv      #Datos de la base de datos
|   |    temp/
|   |    └── load_data.py       #Scrip para cargar los datos
|   ├── alembic.ini             # Configuración de Alembic
|   ├── dump.sql                # Dump de la base de datos
|   ├── pyproject.toml          # Dependencias del proyecto
|   ├── .python-version         # Versión de Python usada
|   ├── uv.lock                 # Lockfile de dependencias
|   └── README.md               # Este archivo
|
├── frontend/                  # Nueva carpeta para la aplicación de usuario
│   ├── public/                # Archivos estáticos (íconos, index.html, etc.)
│   │   └── index.html
│   ├── src/
│   │   ├── assets/            # Imágenes, fuentes, estilos globales
│   │   ├── components/        # Componentes reutilizables (Botón, Modal, Card…)
│   │   ├── layouts/           # Layouts generales (Navbar + Sidebar, etc.)
│   │   ├── pages/             # Vistas / rutas de tu app (ListCepa, DetailCepa…)
│   │   ├── services/          # Lógica de llamadas a la API (axios/fetch wrappers)
│   │   ├── hooks/             # Custom React hooks (useFetchCepas, useForm…)
│   │   ├── utils/             # Helpers y constantes
│   │   ├── App.jsx            # Componente raíz
│   │   └── main.jsx           # Punto de entrada (renderiza App en el DOM)
│   ├── tests/                 # Pruebas unitarias y de integración (Jest / Testing Library)
│   ├── package.json
│   ├── vite.config.js         # O next.config.js si usas Next.js
│   └── tsconfig.json          # Si trabajas con TypeScript
│
├── README.md
└── .gitignore

# Comando para ejecutar la app: uvicorn app:app --reload --app-dir backend