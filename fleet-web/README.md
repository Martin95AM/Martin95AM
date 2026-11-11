# ABM de flota en GitHub Pages

La flota funciona en **Blazor WebAssembly (.NET 10)** dentro del navegador. GitHub Pages sirve los archivos estáticos; no hace falta iniciar ni contratar una API o base de datos.

Permite alta, consulta, modificación, baja, búsqueda y filtro de autos, embarcaciones y aviones. Los registros se guardan en el almacenamiento local del navegador. **No se sincronizan entre usuarios o dispositivos** y pueden perderse al borrar los datos del navegador. Los botones **Exportar JSON** e **Importar JSON** permiten hacer una copia y moverla manualmente.

El flujo `.github/workflows/deploy.yml` compila esta aplicación, copia la salida a `frontend/public/fleet/`, construye el sitio Vite y publica todo junto en GitHub Pages.

## Prueba local

Desde la raíz del repositorio, con el SDK de .NET 10 instalado:

```powershell
dotnet publish fleet-web/fleet-web.csproj -c Release -o fleet-web/publish
New-Item -ItemType Directory -Force frontend/public/fleet | Out-Null
Copy-Item fleet-web/publish/wwwroot/* frontend/public/fleet -Recurse -Force
npm run dev
```

Abrí `http://localhost:5173/Martin95AM/` y pulsá **Flota internacional**. En esta copia del proyecto, también se puede usar el SDK local con `.\.dotnet\dotnet.exe` en lugar de `dotnet`.
