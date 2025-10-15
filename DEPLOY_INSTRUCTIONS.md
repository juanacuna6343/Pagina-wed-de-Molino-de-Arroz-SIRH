# 🚀 Instrucciones de Despliegue en Render

## ⚠️ SOLUCIÓN AL ERROR DE DESPLIEGUE

**Error encontrado**: `No se encontraron credenciales válidas para Firebase Admin`

**Causa**: Render no lee automáticamente el archivo `.env` - las variables deben configurarse en el Dashboard.

## Pasos para Corregir y Desplegar

### 1. Configurar Variables de Entorno en Render Dashboard

**IMPORTANTE**: Ve a tu servicio en Render Dashboard → **Environment** y agrega estas variables:

```
NODE_ENV=production
PORT=3000
FIREBASE_PROJECT_ID=proyecto1-1dc6c
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@proyecto1-1dc6c.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAaSCBKcwggSjAgEAAoIBAQDJIOQbL1a5haVF
VZ+mMe6y7ZnVOk+abwZ+wM8W2agKAnDA5wF/csFuFI0Y0A6ZLZurMXLhqLuDATVc
es0nKwsACMJWvM4ti1JNGYT2AgxbenDEqHI+R548LbiTuYKTMfmu1D6fO+oa/XR5
h6HtBvMYocmMO8L5zHM9CORgz0dEbVKYItlhpzR/DAikgH99As81l7wdirNXT2aj
ar7XunJ1TpAovb6B8PglADYIWA93Ngu//RiAOSzAWlNj0oSMs1Td+XM7+7cI/Vpw
D3FBcFp42adVogyZ27J+V+SDy/xlQB+KXe3PcASDVspxQAGVrEyDy31lcUfhsT2A
S6qpdSBXAgMBAAECggEAUXtMPkEu4skkfBLks0leWUnN/Sb68edR288T9r9mBuwX
LudHYZElkQmtYeSETYU/IBtP3eDkWn4GVrl/XINhGPnzdX1XD/d197tDdQC+bd8M
SXeulNGh5uJk+R/6KNThwPTGi+8TeCy/X67VqHecy5lb1D6vzlCITS1JjHjc9/iU
JSee7A++ZTA4w0IxEpJJFG/gUsNNPwcxIi2pD7Adf9RyMNc3ahpdhp/cW3ADstCx
GWFV3wq5ckcA54lqLQPJV17oWPb5D2K0X2zJu6BfEIYRoAm2NrqUcSQzzYOM2KCR
YhH2hJAC2kZtAdscmkIuvWG2TlXsaM3PYA8J5UJWeQKBgQDtkEWgeavxOCNSOb7A
V/XvZ5ooz2V2emypDI0ZkoojWHAe2K3Iy/hHIrjrLOzubiuaV3pZkmM81hNQQ5zW
g7+BMqQqFAhpYpWMEvuEVlsJRRPvdU3cd4uHRj2MN/+ln9XYOaX2UtwAb8WfC938
JRhlxA6RpuESjBCNbkIwm/K+qQKBgQDYvMFVAYuw1vgVF4+tZ92s2DJvaB/n117+
2jtNBfbiYCf6J3N8pwOV7e9ZDpDSuYAJpmOPp84OEM/oWX6cIWUxrp5hMxplhmV0
rpvraP9HT4BfHaTYhInJrHdN0qIlmti2kXdV5qAfTX0chnzRGDX6h2ewRuE2mGuo
7BPI1a9G/wKBgQCpWrBINnTdAagsdf4GIK6yfKjpbvBmBeBwowHzuQPBLsq/Mriw
7LeR/q7U+LHvR5rN7I7MTA9yzyn1jj3ArytWb0OYu69DcYQq1112ehlsAlKz4mwf
Pxm41doKm+EjsU5BVtd5QpiTtxqqx0r49XjvE1VPgCfzkOY77N5CyOnEAQKBgB1Y
4azK+slFMm5YtGG8kK2Y0Kt5I+jWpsxHbIQvbJCWiJM8yEx2qOuiPiiG6mE+MPId
j5miFSqeaCiEBbrKYtNpW5S5wLdCjXZRNleX7gkP4MgAUZPnzmh6a+UjwkTpRLLj
247MHZ5fdbNpGnmNl7GGqCmcT15/IQTMgplNJeCtAoGAfkKPg/AuS0ANe0IIDMpJ
erX7UiJ+rlTbGcoD85PzNOmwGb6kemw4I7yNR+u8qGq27/+jdHv6RKk/I0bY1SRc
8wp9GlSLTsp65Hx9YvwkIZW22R294LKHK8Ku3bcSU904zLnOeaXEMZksGKW3MHX4
/H1hKlJaF2M++hBc8mq+Jj0=
-----END PRIVATE KEY-----
GMAIL_USER=juan.acuna6343@gmail.com
GMAIL_APP_PASSWORD=ntoohohcpjrrmaqd
```

### 2. Pasos Detallados para Configurar Variables

1. **Accede a tu servicio en Render**
2. **Ve a la pestaña "Environment"**
3. **Haz clic en "Add Environment Variable"**
4. **Agrega cada variable una por una:**
   - Nombre: `NODE_ENV`, Valor: `production`
   - Nombre: `PORT`, Valor: `3000`
   - Nombre: `FIREBASE_PROJECT_ID`, Valor: `proyecto1-1dc6c`
   - Nombre: `FIREBASE_CLIENT_EMAIL`, Valor: `firebase-adminsdk-fbsvc@proyecto1-1dc6c.iam.gserviceaccount.com`
   - Nombre: `FIREBASE_PRIVATE_KEY`, Valor: [copia toda la clave privada de arriba]
   - Nombre: `GMAIL_USER`, Valor: `juan.acuna6343@gmail.com`
   - Nombre: `GMAIL_APP_PASSWORD`, Valor: `ntoohohcpjrrmaqd`

### 3. Redeploy del Servicio

1. **Guarda todas las variables**
2. **Ve a la pestaña "Deploys"**
3. **Haz clic en "Deploy Latest Commit"**
4. **Espera a que termine el despliegue**

### 4. Verificación

El despliegue debería mostrar:
```
✅ Firebase Admin inicializado con variables de entorno
✅ Servidor escuchando en puerto asignado por Render
```

## Configuración Original del Servicio

**Configuración básica:**
- **Name**: `sirh-molino-arroz`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free

## ⚠️ Problemas Comunes y Soluciones

### Error: "No se encontraron credenciales válidas"
- **Causa**: Variables de entorno no configuradas en Render
- **Solución**: Configurar todas las variables en Render Dashboard (no en archivo .env)

### Error: "Invalid PEM formatted message"
- **Causa**: Formato incorrecto de FIREBASE_PRIVATE_KEY
- **Solución**: Copiar la clave completa incluyendo `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`

### Error de Puerto
- **Causa**: Puerto hardcodeado
- **Solución**: El código ya usa `process.env.PORT || 3000` correctamente

## 🎉 Resultado Esperado

Una vez configuradas las variables correctamente, tu aplicación estará disponible en:
`https://sirh-molino-arroz.onrender.com`

Con todas las funcionalidades:
- ✅ Login con recuperación de contraseña
- ✅ CRUD de empleados y contratos
- ✅ Búsqueda y exportación PDF/XLSX
- ✅ Firebase Firestore funcionando