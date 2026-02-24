# Proyecto DB Cepas

Este repositorio alberga una aplicación para la gestión de cepas microbiológicas, compuesta por un **backend** en Python (Litestar, SQLAlchemy, Alembic) y un **frontend** en React con TypeScript y TailwindCSS.

---

## 📋 Requisitos Previos

- **Git**  
- **Python 3.13**  
- **Node.js 18+** y **npm**  
- **PostgreSQL 14+**  

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
# Datos de conexión a PostgreSQL
DATABASE_URL=postgresql+psycopg2://<usuario>:<contraseña>@localhost/db_cepas
```

> **Tip**: Sustituye `<usuario>` y `<contraseña>` por tus credenciales de PostgreSQL. Se sugiere, crear un user `postgres` con contraseña `sebas` para evitar realizar cambios en el codigo del proyecto.


### 3. Configurar la base de datos

Abre una consola de PostgreSQL y ejecuta:

```sql
CREATE DATABASE db_cepas;
```

---

## 🚀 Backend

1. **Crear y activar entorno virtual**

   ```bash
   cd backend
   python -m venv .venv
   # Linux/macOS\   
   source .venv/bin/activate
   ```

2. **Instalar dependencias**
    Debe tener instalado uv (pip install uv)

   ```bash
   uv sync 
   ```

3. **Ejecutar migraciones**

   ```bash
   alembic upgrade head
   ```
4. **Cargar datos**
   Para cargar los datos desde un archivo, ejecutar:

   ```bash
   cd temp
   python load_data.py   
   ```

5. **Iniciar servidor**

   ```bash
   cd ..
   uvicorn app.main:app --reload
   ```

   El API REST estará disponible en `http://localhost:8000`.

---

## 🌐 Frontend

1. **Instalar dependencias**

   ```bash
   cd ../frontend
   npm install
   ```

2. **Ejecutar en modo desarrollo**

   ```bash
   npm run dev
   ```

   La aplicación se abrirá en `http://localhost:5173`.

---

## 🔐 Autenticación y Roles

- El sistema distingue **usuarios** y **administradores** (`is_admin`).
- Solo los administradores pueden añadir nuevas cepas y atributos.
- Utiliza el endpoint `/auth/login` para obtener el token JWT.
- Para esta version del proyecto, se encuentra habilitada la creacion de usuarios atraves de la url `http://localhost:8000/schema#tag/user/post/users/create` sin necesidad de autenticación.

