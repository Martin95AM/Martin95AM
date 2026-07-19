# 🎮 MARTIN95AM - Martin Quest

[![Jugar Ahora](https://img.shields.io/badge/🎮_JUGAR_AHORA-Click_Aquí-brightgreen?style=for-the-badge&logo=gamepad&logoColor=white)](https://martin95am.github.io/Martin95AM/)

---

## 🚀 Cómo subir este proyecto a tu GitHub y activarlo

Para guardar este proyecto en tu cuenta de GitHub y hacer que **se ejecute automáticamente (se despliegue en la web) al entrar al repositorio**, sigue estos sencillos pasos:

### Paso 1: Crear un repositorio en GitHub
1. Ve a tu cuenta de [GitHub](https://github.com/) y haz clic en **New** (Nuevo repositorio).
2. Ponle el nombre que quieras (por ejemplo, `MARTIN95AM`).
3. Déjalo como **Public** (Público) para que GitHub Pages funcione de forma gratuita.
4. **No** agregues README, .gitignore ni licencia (ya los tenemos creados aquí).
5. Haz clic en **Create repository**.

### Paso 2: Vincular y subir el código desde tu terminal
Abre tu terminal en la carpeta raíz del proyecto y ejecuta los siguientes comandos:

```powershell
# 1. Inicializar git (si no está inicializado) y añadir los archivos
git add .

# 2. Crear el primer commit
git commit -m "feat: setup project and github pages workflow"

# 3. Cambiar la rama principal a 'main'
git branch -M main

# 4. Vincular tu repositorio local con el de GitHub
# (Reemplaza 'TU_USUARIO' y 'TU_REPOSITORIO' con tus datos reales)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 5. Subir el código a GitHub
git push -u origin main
```

---

## 🌐 Cómo se ejecuta automáticamente al entrar (GitHub Pages)

Hemos configurado un flujo de trabajo automatizado con **GitHub Actions** (`.github/workflows/deploy.yml`) y optimizado la configuración de Vite (`frontend/vite.config.js`).

Una vez que subas el código a GitHub, sigue estos pasos para activar la web:

1. En tu repositorio de GitHub, ve a la pestaña **Settings** (Configuración).
2. En el menú de la izquierda, haz clic en **Pages**.
3. En la sección **Build and deployment** -> **Source**, selecciona **GitHub Actions**.
4. ¡Listo! Cada vez que hagas un `git push`, GitHub compilará automáticamente el juego y lo publicará.
5. Podrás ver el enlace de tu juego en la pestaña **Actions** o en la página principal de tu repositorio en la sección **Environments** (a la derecha).

---

## 💻 Ejecución en Local

### Frontend (Phaser + Vite)
1. Entra a la carpeta del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre tu navegador en `http://localhost:5173`.

### Backend (Spring Boot)
1. Asegúrate de tener instalado Java 17+ y Maven.
2. Entra a la carpeta del backend:
   ```bash
   cd backend
   ```
3. Ejecuta la aplicación:
   ```bash
   mvn spring-boot:run
   ```
"@