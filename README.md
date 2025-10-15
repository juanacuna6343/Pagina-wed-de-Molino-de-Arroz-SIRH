# SIRH Molino de Arroz (Node.js + Express + Firebase + HTML/CSS/JS)

Aplicación web para gestión de Recursos Humanos del molino de arroz (SIRH), con:

- Login y recuperación de contraseña por correo (Firebase Auth – usuarios creados desde consola/Admin).
- CRUD de empleados (Firestore no relacional).
- CRUD de contratos vinculados a empleados.
- Búsqueda por documento o nombre, con conteo de contratos y exportación PDF/XLSX.

## Requisitos

- Node.js 18+
- Un proyecto Firebase (Firestore habilitado y Auth con Email/Password).

## Configuración

1. Copia `.env.example` a `.env` y rellena con credenciales del **Admin SDK** (Service Account):

```
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_CLIENT_EMAIL=tu-client-email@tu-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nABCDEF...\n-----END PRIVATE KEY-----\n
PORT=3000
```

2. En `public/config.js` coloca la **configuración Web** de tu app Firebase:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

3. Instala dependencias y ejecuta:

```
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Modelo de datos (Firestore)

- Colección `employees` (documentos con campos):
  - `NRO_DOCUMENTO` (string)
  - `NOMBRE`, `APELLIDO` (string)
  - `EDAD` (number)
  - `GENERO` (string)
  - `CARGO` (string)
  - `CORREO` (string)
  - `NRO_CONTACTO` (string)
  - `ESTADO` ("activo" | "retirado")
  - `OBSERVACIONES` (string)

- Colección `contracts`:
  - `Fecha_inicio` (string: YYYY-MM-DD)
  - `Fecha_fin` (string: YYYY-MM-DD)
  - `Valor` (number)
  - `employeeId` (string: id del empleado)
  - `Empleado` (string: nombre del empleado)

## Seguridad

Todas las rutas `/api/*` verifican el `ID Token` de Firebase enviado vía `Authorization: Bearer <token>`, obtenido tras el login en el frontend.

## Deploy sugerido

- Render/Railway/Glitch:
  - Crear servicio Node, añadir variables de entorno del `.env`.
  - `build` no requerido, `start` con `npm start`.

- Firebase Hosting + Cloud Run (opcional):
  - Contenerizar esta app y desplegar en Cloud Run; Hosting puede hacer proxy al servicio.

## Notas

- Los usuarios NO se registran desde la app; créalos en Firebase Auth (Consola) o vía Admin SDK.
- Ajusta estilos en `public/styles.css` para la identidad visual del molino.