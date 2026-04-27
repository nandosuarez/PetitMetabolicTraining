# Petit Metabolic Training · App Administrativa

Esta version ya no depende de `localStorage`. Ahora corre con:

- Frontend web estatico
- Backend Node.js con Express
- Base de datos PostgreSQL

## Estructura principal

- [index.html](C:\Users\josef\OneDrive\Desktop\JFSS\Gimnasio\Proyectos\App\index.html): interfaz
- [app.js](C:\Users\josef\OneDrive\Desktop\JFSS\Gimnasio\Proyectos\App\app.js): logica del frontend
- [styles.css](C:\Users\josef\OneDrive\Desktop\JFSS\Gimnasio\Proyectos\App\styles.css): estilos
- [server.js](C:\Users\josef\OneDrive\Desktop\JFSS\Gimnasio\Proyectos\App\server.js): API REST
- [schema.sql](C:\Users\josef\OneDrive\Desktop\JFSS\Gimnasio\Proyectos\App\schema.sql): tablas y seed inicial
- [server\db.js](C:\Users\josef\OneDrive\Desktop\JFSS\Gimnasio\Proyectos\App\server\db.js): conexion PostgreSQL
- [render.yaml](C:\Users\josef\OneDrive\Desktop\JFSS\Gimnasio\Proyectos\App\render.yaml): blueprint de Render

## Que guarda en PostgreSQL

- Movimientos de gimnasio y restaurante
- Listas maestras editables
- Observaciones de informe diario
- Observaciones de informe semanal
- Usuarios, sesiones y estados de cambio de contraseña

## Configuracion local

1. Crea un archivo `.env` en la raiz del proyecto.
2. Usa como base [\.env.example](C:\Users\josef\OneDrive\Desktop\JFSS\Gimnasio\Proyectos\App\.env.example).

Ejemplo:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/petit_metabolic_training
DATABASE_SSL=false
TZ=America/Bogota
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=TuClaveSegura#2026
BOOTSTRAP_ADMIN_FULL_NAME=Administrador Petit
```

## Zona horaria

- La app esta configurada para mostrar fechas y horas en `America/Bogota`.
- Al publicar en Render, el blueprint ya fija `TZ=America/Bogota`.

## Instalacion

```powershell
npm install
```

## Inicializar la base

```powershell
npm run db:init
```

## Verificar conexion

```powershell
npm run db:check
```

## Ejecutar la app

```powershell
npm start
```

Luego abre:

- [http://localhost:3000](http://localhost:3000)

## Notas

- El servidor falla al arrancar si `DATABASE_URL` no existe o no conecta.
- La validacion de `Pagado`, `Parcial` y `Pendiente` se hace en frontend y backend.
- El resumen mensual, cartera e informes se calculan con los movimientos almacenados en PostgreSQL.
- Los usuarios creados desde la administracion quedan con contraseña temporal y deben cambiarla al primer ingreso.
- El administrador puede reasignar una contraseña temporal a cualquier usuario activo si olvida su clave.
- En produccion, si la base esta vacia, el servidor exige `BOOTSTRAP_ADMIN_USERNAME` y `BOOTSTRAP_ADMIN_PASSWORD` para crear el primer administrador.

## Despliegue en Render

- El blueprint listo para Render esta en [render.yaml](C:\Users\josef\OneDrive\Desktop\JFSS\Gimnasio\Proyectos\App\render.yaml).
- El web service queda configurado con:
  - `runtime: node`
  - `buildCommand: npm install`
  - `preDeployCommand: npm run db:init`
  - `startCommand: npm start`
  - `healthCheckPath: /api/health`
- La base PostgreSQL queda definida en el mismo blueprint con:
  - base `petit_metabolic_training`
  - usuario `metabolic`
  - PostgreSQL `17`
  - region `virginia`
  - acceso externo bloqueado (`ipAllowList: []`)
- En el primer despliegue Render te pedira la variable secreta `BOOTSTRAP_ADMIN_PASSWORD`.
- El usuario inicial queda por defecto como `admin` y debe cambiar su contraseña temporal al primer ingreso.

## Siguiente iteracion recomendada

- Cargar el historico desde el Excel inicial
- Aplicar logo, paleta y componentes visuales del gimnasio
- Importar historicos y adjuntos directamente desde la plataforma
