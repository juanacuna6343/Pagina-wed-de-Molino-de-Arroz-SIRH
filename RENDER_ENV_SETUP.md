# Configuración de Variables de Entorno para Render

## 🚨 IMPORTANTE: Configuración Requerida para el Despliegue

Para que tu aplicación funcione correctamente en Render, **DEBES** configurar las siguientes variables de entorno en el Dashboard de Render:

### 📋 Variables de Entorno Obligatorias

1. **NODE_ENV**
   - Valor: `production`
   - Descripción: Configura el entorno de producción

2. **PORT**
   - Valor: `3000`
   - Descripción: Puerto donde se ejecutará la aplicación

3. **FIREBASE_PROJECT_ID**
   - Valor: `tu_project_id_real`
   - Descripción: ID de tu proyecto de Firebase
   - ⚠️ Reemplaza con tu ID real de Firebase

4. **FIREBASE_CLIENT_EMAIL**
   - Valor: `tu-service-account@tu-project.iam.gserviceaccount.com`
   - Descripción: Email de la cuenta de servicio de Firebase
   - ⚠️ Reemplaza con tu email real de la cuenta de servicio

5. **FIREBASE_PRIVATE_KEY**
   - Valor: `-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_COMPLETA\n-----END PRIVATE KEY-----`
   - Descripción: Clave privada de la cuenta de servicio de Firebase
   - ⚠️ **MUY IMPORTANTE**: Incluye los saltos de línea como `\n`

6. **GMAIL_USER**
   - Valor: `tu_correo@gmail.com`
   - Descripción: Correo Gmail para envío de OTP

7. **GMAIL_APP_PASSWORD**
   - Valor: `xxxxxxxxxxxxxxxx`
   - Descripción: App Password de Gmail (16 caracteres)

## 🔧 Cómo Configurar en Render

1. Ve a tu servicio en el Dashboard de Render
2. Navega a la pestaña **"Environment"**
3. Haz clic en **"Add Environment Variable"**
4. Agrega cada variable una por una con sus valores correspondientes

## 📝 Obtener Credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Project Settings** (⚙️)
4. Pestaña **"Service accounts"**
5. Haz clic en **"Generate new private key"**
6. Descarga el archivo JSON
7. Usa los valores del JSON para las variables de entorno

## ⚠️ Notas Importantes

- **NUNCA** subas credenciales reales al repositorio de Git
- Las credenciales deben configurarse **SOLO** en Render
- El archivo `.env` local es solo para desarrollo
- Asegúrate de que `FIREBASE_PRIVATE_KEY` tenga los saltos de línea correctos (`\n`)

## 🔍 Troubleshooting

Si ves el error "No se encontraron credenciales válidas para Firebase Admin":
1. Verifica que todas las variables estén configuradas en Render
2. Asegúrate de que `FIREBASE_PRIVATE_KEY` tenga el formato correcto
3. Confirma que el `FIREBASE_PROJECT_ID` sea correcto
4. Redeploya el servicio después de configurar las variables