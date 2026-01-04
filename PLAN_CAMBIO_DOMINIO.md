# 🌐 PLAN MAESTRO: MIGRACIÓN DE DOMINIO
## De `awsoccr.pixelcrafters.digital` a `occrproductos.com.mx`

---

## 📋 RESUMEN EJECUTIVO

**Dominio actual**: `awsoccr.pixelcrafters.digital`
**Dominio nuevo**: `occrproductos.com.mx`
**IP AWS**: `3.143.110.203`

**Sistemas afectados**:
- ✅ Backend Laravel (AWS)
- ✅ FAMAC App (React Native)
- ✅ Google OAuth
- ✅ Apple Sign-In
- ✅ Firebase Push Notifications
- ✅ Stripe Webhooks
- ✅ DNS y SSL

---

## 1️⃣ BACKEND LARAVEL (.env)

### Archivos a modificar:
- `D:/OCCRPRODUCTOS/Occr_Prodcutos_App/Desarrollo/Backend LActeos y mas/foodbackend/foodbackend/.env.aws`

### Cambios necesarios:

```env
# LÍNEA 5 - APP_URL
APP_URL=https://occrproductos.com.mx

# LÍNEA 34-37 - MAIL (si se usa email del dominio)
MAIL_USERNAME=occr@occrproductos.com.mx
MAIL_FROM_ADDRESS=occr@occrproductos.com.mx

# LÍNEA 73 - GOOGLE OAUTH REDIRECT
GOOGLE_REDIRECT_URI=https://occrproductos.com.mx/auth/google/callback
```

---

## 2️⃣ FAMAC APP (React Native)

### Archivo principal:
- `src/config/environment.js`

### Cambio necesario:

```javascript
production: {
  API_BASE_URL: 'https://occrproductos.com.mx',
  WS_BASE_URL: 'wss://occrproductos.com.mx',
  ENVIRONMENT_NAME: 'Producción',
}
```

### ⚠️ IMPORTANTE: Recompilar app
Después de este cambio, DEBES recompilar la app:
- Android: `npx react-native run-android --mode=release`
- iOS: `npx react-native run-ios --configuration Release`

---

## 3️⃣ GOOGLE OAUTH (Google Cloud Console)

### Consola: https://console.cloud.google.com/apis/credentials

**Proyecto**: `occrproductos-notificaciones` (o el proyecto actual)
**Client ID**: `1058559455264-cjeasg5r6l4m41o28c6k2ff1s66jr4d7.apps.googleusercontent.com`

### Pasos:

1. Ir a **APIs & Services** → **Credentials**
2. Editar **OAuth 2.0 Client ID** (Web application)
3. En **Authorized redirect URIs**, AGREGAR (NO reemplazar):
   ```
   https://occrproductos.com.mx/auth/google/callback
   ```
4. MANTENER la URI antigua temporalmente:
   ```
   https://occr.pixelcrafters.digital/auth/google/callback
   ```
5. **Guardar**

### ⏰ Después de verificar que funciona:
- Eliminar URI antigua
- Actualizar `.env.aws` línea 73

---

## 4️⃣ APPLE SIGN-IN (Apple Developer)

### Consola: https://developer.apple.com/account/resources/identifiers

**Service ID**: `com.occr.productos.signin`
**Team ID**: `A46VG5KH6R`

### Pasos:

1. Ir a **Certificates, Identifiers & Profiles**
2. **Identifiers** → Seleccionar `com.occr.productos.signin`
3. En **Website URLs**, AGREGAR:
   ```
   Domain: occrproductos.com.mx
   Return URL: https://occrproductos.com.mx/auth/apple/callback
   ```
4. MANTENER dominio antiguo temporalmente
5. **Save**

### ⏰ Después de verificar:
- Eliminar dominio antiguo

---

## 5️⃣ FIREBASE PUSH NOTIFICATIONS

### Consola: https://console.firebase.google.com

**Proyecto**: `occrproductos-notificaciones`

### Verificar:

1. **Project Settings** → **Cloud Messaging**
2. Verificar que el **Server key** siga siendo el mismo
3. NO requiere cambios de dominio (usa tokens de dispositivo)

### ✅ No se requiere acción
Firebase usa tokens de dispositivo, no dominios. Las credenciales en `.env.aws` líneas 87-91 son correctas.

---

## 6️⃣ STRIPE WEBHOOKS

### Dashboard: https://dashboard.stripe.com/webhooks

**Webhook actual**: Probablemente `https://awsoccr.pixelcrafters.digital/webhook/stripe`

### Pasos:

1. Ir a **Developers** → **Webhooks**
2. **Add endpoint**:
   ```
   https://occrproductos.com.mx/webhook/stripe
   ```
3. Seleccionar eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - etc. (los mismos que webhook antiguo)
4. **Add endpoint**
5. Copiar **Signing secret** (empieza con `whsec_`)
6. Actualizar `.env.aws` línea 61:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_NUEVO_SECRET
   ```

### ⏰ Después de verificar:
- Eliminar webhook antiguo

---

## 7️⃣ DNS CONFIGURATION

### Registrar DNS (Hostinger, GoDaddy, etc.)

### Records necesarios:

```dns
Tipo: A
Host: @
Value: 3.143.110.203
TTL: 3600

Tipo: A
Host: www
Value: 3.143.110.203
TTL: 3600
```

### Verificación:
```bash
nslookup occrproductos.com.mx
# Debe responder: 3.143.110.203
```

---

## 8️⃣ SSL CERTIFICATE (AWS)

### Opción 1: Let's Encrypt (Certbot) - RECOMENDADO

```bash
ssh -i "C:\.ssh\lacteos-y-mas-key.pem" ubuntu@3.143.110.203

# Instalar certbot
sudo apt update
sudo apt install certbot python3-certbot-apache -y

# Generar certificado
sudo certbot --apache -d occrproductos.com.mx -d www.occrproductos.com.mx

# Responder preguntas:
# Email: jlelpella@gmail.com
# Terms: Agree
# Redirect HTTP to HTTPS: Yes
```

### Opción 2: Certificado existente (si aplica)

Si ya tienes un certificado para `occrproductos.com.mx`, copiarlo a:
```
/etc/ssl/certs/occrproductos.crt
/etc/ssl/private/occrproductos.key
```

Y configurar Apache VirtualHost.

---

## 9️⃣ APACHE VIRTUALHOST (AWS)

### Archivo: `/etc/apache2/sites-available/occr.conf`

### Actualizar ServerName:

```apache
<VirtualHost *:80>
    ServerName occrproductos.com.mx
    ServerAlias www.occrproductos.com.mx

    Redirect permanent / https://occrproductos.com.mx/
</VirtualHost>

<VirtualHost *:443>
    ServerName occrproductos.com.mx
    ServerAlias www.occrproductos.com.mx

    DocumentRoot /var/www/html/foodbackend/public

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/occrproductos.com.mx/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/occrproductos.com.mx/privkey.pem

    # ... resto de configuración
</VirtualHost>
```

### Comandos:
```bash
sudo a2ensite occr.conf
sudo systemctl reload apache2
```

---

## 🔟 TESTING CHECKLIST

### Backend:
- [ ] `https://occrproductos.com.mx` responde
- [ ] `/api/productscats` devuelve productos
- [ ] Panel admin `/login` funciona

### Google OAuth:
- [ ] Login con Google en FAMAC funciona
- [ ] Redirect correcto después de login

### Apple Sign-In:
- [ ] Login con Apple en FAMAC funciona
- [ ] Redirect correcto después de login

### Stripe:
- [ ] Crear pago de prueba
- [ ] Verificar webhook recibido en Stripe Dashboard
- [ ] Orden se marca como pagada en backend

### Push Notifications:
- [ ] Enviar notificación de prueba desde admin
- [ ] Dispositivo recibe notificación

### FAMAC App:
- [ ] Login funciona (Email, Google, Apple)
- [ ] Ver productos funciona
- [ ] Agregar al carrito funciona
- [ ] Completar pago funciona
- [ ] Ver órdenes funciona
- [ ] Recibir notificaciones funciona

---

## 📝 ORDEN DE EJECUCIÓN RECOMENDADO

### FASE 1: Preparación (sin downtime)
1. ✅ Configurar DNS → `occrproductos.com.mx` apuntando a `3.143.110.203`
2. ✅ Esperar propagación DNS (24-48h, pero usualmente 1-2h)
3. ✅ Generar SSL con Certbot
4. ✅ Configurar Apache VirtualHost

### FASE 2: APIs externas (sin downtime)
5. ✅ Google OAuth: AGREGAR nuevo redirect URI (mantener antiguo)
6. ✅ Apple Sign-In: AGREGAR nuevo dominio (mantener antiguo)
7. ✅ Stripe: CREAR nuevo webhook (mantener antiguo)

### FASE 3: Backend (5 min downtime)
8. ✅ Actualizar `.env.aws` local
9. ✅ Subir `.env` a AWS
10. ✅ Limpiar cache: `php artisan config:clear && php artisan cache:clear`

### FASE 4: FAMAC App (requiere update de usuarios)
11. ✅ Actualizar `src/config/environment.js`
12. ✅ Recompilar y publicar nueva versión
13. ✅ Usuarios deben actualizar app

### FASE 5: Cleanup (después de 1 semana)
14. ✅ Google OAuth: eliminar redirect URI antiguo
15. ✅ Apple Sign-In: eliminar dominio antiguo
16. ✅ Stripe: eliminar webhook antiguo
17. ✅ Desconfigurar VirtualHost antiguo (si aplica)

---

## 🚨 ROLLBACK PLAN

Si algo falla, revertir en orden inverso:

1. FAMAC App: volver a compilar con dominio antiguo
2. Backend: restaurar `.env.backup` y limpiar cache
3. APIs externas: usar URIs/dominios antiguos temporalmente
4. DNS: apuntar a servidor antiguo (si existía)

---

## 📞 SOPORTE

**DNS Issues**: Verificar en https://dnschecker.org
**SSL Issues**: `sudo certbot renew --dry-run`
**Apache Issues**: `sudo apache2ctl configtest`
**Laravel Issues**: `tail -f /var/www/html/foodbackend/storage/logs/laravel.log`

---

**Fecha creación**: 2025-12-03
**Autor**: Claude Code
**Versión**: 1.0
