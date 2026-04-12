# Proyecto DB Cepas

Aplicación web para la gestión e investigación de cepas microbiológicas aisladas de cuerpos de agua de la Patagonia. Compuesta por un **backend** en Python (Litestar, Beanie, MongoDB) y un **frontend** en React con TypeScript y TailwindCSS. Incluye un módulo de consulta inteligente mediante lenguaje natural con búsqueda semántica híbrida.

---

## 📋 Requisitos Previos

- **Git**
- **Python 3.13**
- **Node.js 18+** y **npm**
- **MongoDB 6+**
- **Redis 7+**
- **uv** (gestor de paquetes Python): `pip install uv`

---

## 🗂️ Estructura del Proyecto

```
ProyectoDB_CEPAS/
├── backend/
│   ├── app/
│   │   ├── api/            # Controladores y rutas (Litestar)
│   │   ├── core/           # Configuración, seguridad, DB, Redis
│   │   ├── models/         # Modelos Beanie (MongoDB)
│   │   ├── repositories/   # Capa de acceso a datos
│   │   ├── schema/         # DTOs (Pydantic)
│   │   └── services/       # Lógica de negocio e IA
│   ├── scripts/            # Utilidades (seed_admin, debug)
│   ├── temp/               # Scripts de carga de datos
│   ├── data/               # Archivos CSV de cepas
│   ├── tests/              # Suite de pruebas del chat IA
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── features/       # Módulos por funcionalidad (auth, cepas, dashboard, chat)
│   │   ├── shared/         # Interfaces, componentes y assets reutilizables
│   │   └── app/            # Router, estilos globales, tokens de diseño
│   └── package.json
└── README.md
```

---

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/Selix2002/ProyectoDB_cepas
cd ProyectoDB_CEPAS
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `backend/` con las siguientes variables:

```dotenv
# MongoDB
MONGODB_URI=mongodb://localhost:27017
DB_NAME=db_cepas

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
SECRET_KEY=tu_clave_secreta_aqui
```

---

## 🚀 Backend

### 1. Crear y activar entorno virtual

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Linux/macOS
# .venv\Scripts\activate         # Windows
```

### 2. Instalar dependencias

```bash
uv sync
```

### 3. Crear el usuario administrador inicial

```bash
uv run python -m scripts.seed_admin --username admin --password tu_contraseña
```

### 4. Cargar datos desde CSV

```bash
cd temp
python load_data.py
```

> El script hace `POST /cepas` por cada fila del CSV. Requiere que el servidor esté corriendo y que uses las credenciales del admin creado en el paso anterior.

### 5. Iniciar servidor

```bash
cd ..
uvicorn app.main:app --reload
```

La API REST estará disponible en `http://localhost:8000`.  
La documentación interactiva (OpenAPI) en `http://localhost:8000/schema`.

---

## 🌐 Frontend

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Ejecutar en modo desarrollo

```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`.

---

## 🔐 Autenticación y Roles

- El sistema distingue **usuarios** (`is_admin: false`) y **administradores** (`is_admin: true`).
- Solo los administradores pueden crear, editar o eliminar cepas y gestionar usuarios.
- La autenticación usa **JWT** vía OAuth2 Password Bearer (endpoint `POST /auth/login`).
- El login tiene **rate limiting** protegido con Redis: máximo 5 intentos por minuto por IP.
- Para crear el primer administrador usa el script `scripts/seed_admin.py` (ver sección Backend).

---

## 🤖 Módulo de Consulta Inteligente (Chat IA)

El sistema incluye un asistente conversacional que permite consultar la colección de cepas en **lenguaje natural**. Las consultas se clasifican automáticamente en tres modos:

| Modo | Descripción | Ejemplo |
|------|-------------|---------|
| **Estadístico** | Conteos exactos con filtros MongoDB | *"¿Cuántas cepas son Gram negativas?"* |
| **Híbrido** | Filtros estructurados + similitud vectorial | *"Cepas resistentes a tetraciclina con sus características"* |
| **Semántico** | Búsqueda vectorial pura sobre toda la colección | *"¿Qué cepa recomendarías para biorremediación?"* |

### Pruebas del módulo IA

```bash
cd backend
uv run python -m tests.run_tests
```

---

## 🧰 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend framework | Litestar |
| Base de datos | MongoDB 6+ |
| ODM | Beanie + Motor (async) |
| Caché / Rate limit | Redis 7+ |
| Embeddings | sentence-transformers |
| Auth | JWT (OAuth2 Password Bearer) |
| Frontend | React + TypeScript + Vite |
| Estilos | TailwindCSS |
| Package manager | uv (Python) / npm (Node) |
