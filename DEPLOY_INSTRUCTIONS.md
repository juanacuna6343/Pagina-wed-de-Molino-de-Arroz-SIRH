# 🚀 Instrucciones de Despliegue en Render

## Pasos para Desplegar el SIRH Molino de Arroz en Render

### 1. Preparación del Proyecto
- ✅ El proyecto ya está configurado para Render
- ✅ Variables de entorno configuradas
- ✅ Archivo `render.yaml` creado

### 2. Configuración en Render

1. **Crear cuenta en Render**: Ve a [render.com](https://render.com) y crea una cuenta
2. **Conectar repositorio**: Conecta tu repositorio de GitHub
3. **Crear Web Service**: 
   - Selecciona "New Web Service"
   - Conecta tu repositorio: `https://github.com/juanacuna6343/Pagina-wed-de-Molino-de-Arroz-SIRH`

### 3. Configuración del Servicio

**Configuración básica:**
- **Name**: `sirh-molino-arroz`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free

### 4. Variables de Entorno (CRÍTICO)

Debes configurar estas variables en Render Dashboard:

```
NODE_ENV=production
PORT=10000
FIREBASE_PROJECT_ID=proyecto1-1dc6c
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@proyecto1-1dc6c.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[AQUÍ VA TU PRIVATE KEY COMPLETA DE FIREBASE]
-----END PRIVATE KEY-----"
GMAIL_USER=juan.acuna6343@gmail.com
GMAIL_APP_PASSWORD=ntoohohcpjrrmaqd
```

### 5. Obtener la Private Key de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `proyecto1-1dc6c`
3. Ve a **Project Settings** > **Service Accounts**
4. Haz clic en **Generate new private key**
5. Descarga el archivo JSON
6. Copia el valor del campo `private_key` (incluyendo `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`)

### 6. Configurar Variables en Render

1. En tu servicio de Render, ve a **Environment**
2. Agrega cada variable una por una
3. Para `FIREBASE_PRIVATE_KEY`, pega toda la clave privada incluyendo los headers

### 7. Deploy

1. Haz clic en **Deploy Latest Commit**
2. Espera a que termine el build (puede tomar 5-10 minutos)
3. Tu aplicación estará disponible en: `https://sirh-molino-arroz.onrender.com`

## ⚠️ Problemas Comunes

### Error de Firebase
- **Problema**: "No se encontraron credenciales válidas"
- **Solución**: Verifica que todas las variables de Firebase estén correctamente configuradas

### Error de Puerto
- **Problema**: La aplicación no inicia
- **Solución**: Render asigna automáticamente el puerto, asegúrate de usar `process.env.PORT`

### Error de Build
- **Problema**: `npm install` falla
- **Solución**: Verifica que `package.json` esté en la raíz del proyecto

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render Dashboard
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que el repositorio de GitHub esté actualizado

## 🎉 ¡Listo!

Una vez desplegado, tu SIRH estará disponible 24/7 en Render con todas las funcionalidades:
- ✅ Login con recuperación de contraseña
- ✅ CRUD de empleados
- ✅ CRUD de contratos
- ✅ Búsqueda y exportación PDF/XLSX
- ✅ Base de datos Firebase Firestore