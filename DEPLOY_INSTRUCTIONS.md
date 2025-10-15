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
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=tu-client-email@tu-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
[TU_CLAVE_PRIVADA_COMPLETA_AQUI]
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
   - Nombre: `FIREBASE_PROJECT_ID`, Valor: `tu-project-id`
- Nombre: `FIREBASE_CLIENT_EMAIL`, Valor: `tu-client-email@tu-project-id.iam.gserviceaccount.com`
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