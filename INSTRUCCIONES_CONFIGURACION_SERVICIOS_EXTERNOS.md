# 🔐 INSTRUCCIONES: Configuración de Servicios Externos
## Migración a occrproductos.com.mx

**Fecha:** 10 de diciembre de 2025
**Estado Backend:** ✅ COMPLETADO
**Estado Frontend:** ✅ COMPLETADO
**Pendiente:** Configuraciones externas

---

## 1️⃣ GOOGLE OAUTH (URGENTE)

### Acceso:
- **URL:** https://console.cloud.google.com/apis/credentials
- **Proyecto:** occrproductos-notificaciones (o el proyecto actual)
- **Client ID:** `1058559455264-cjeasg5r6l4m41o28c6k2ff1s66jr4d7.apps.googleusercontent.com`

### Pasos:
1. Ir a **APIs & Services** → **Credentials**
2. Buscar y editar el **OAuth 2.0 Client ID** (Web application)
3. En **"Authorized redirect URIs"**, hacer clic en **"ADD URI"**
4. **AGREGAR** (sin eliminar las existentes):
   ```
   https://occrproductos.com.mx/auth/google/callback
   ```
5. **VERIFICAR** que estas URIs estén presentes:
   - ✅ `https://occr.pixelcrafters.digital/auth/google/callback` (antigua - mantener temporalmente)
   - ✅ `https://occrproductos.com.mx/auth/google/callback` (nueva - recién agregada)
6. Hacer clic en **"Save"**
7. Esperar 5 minutos para que los cambios se propaguen

### ✅ Verificación:
- Ambas URIs deben estar activas
- No eliminar la URI antigua hasta confirmar que la nueva funciona

---

## 2️⃣ APPLE SIGN-IN

### Acceso:
- **URL:** https://developer.apple.com/account/resources/identifiers
- **Team ID:** A46VG5KH6R
- **Service ID:** `com.occr.productos.signin`

### Pasos:
1. Ir a **Certificates, Identifiers & Profiles**
2. Seleccionar **Identifiers** en el menú lateral
3. Buscar y seleccionar `com.occr.productos.signin`
4. En la sección **"Website URLs"**, hacer clic en **"+"** para agregar nuevo dominio
5. **AGREGAR**:
   ```
   Domain: occrproductos.com.mx
   Return URL: https://occrproductos.com.mx/auth/apple/callback
   ```
6. **VERIFICAR** que estos dominios estén presentes:
   - ✅ Dominio antiguo (mantener temporalmente)
   - ✅ `occrproductos.com.mx` (nuevo - recién agregado)
7. Hacer clic en **"Save"** o **"Continue"**
8. Confirmar los cambios

### ✅ Verificación:
- Ambos dominios deben estar activos
- No eliminar el dominio antiguo hasta confirmar que el nuevo funciona

---

## 3️⃣ STRIPE WEBHOOK

### Acceso:
- **URL:** https://dashboard.stripe.com/webhooks
- **Cuenta:** Producción (LIVE mode)

### Pasos:
1. Ir a **Developers** → **Webhooks**
2. Hacer clic en **"Add endpoint"**
3. En **"Endpoint URL"**, ingresar:
   ```
   https://occrproductos.com.mx/webhook/stripe
   ```
4. En **"Events to send"**, seleccionar los mismos que el webhook antiguo:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.succeeded`
   - ✅ `charge.failed`
   - ✅ (cualquier otro evento que tengas configurado actualmente)

5. Hacer clic en **"Add endpoint"**
6. **IMPORTANTE:** Copiar el **"Signing secret"** que aparece (empieza con `whsec_...`)
   ```
   COPIAR ESTE VALOR: whsec_XXXXXXXXXXXXXXXXXXXXXX
   ```
7. **NO ELIMINAR** el webhook antiguo todavía

### 📋 Después de crear el webhook:
**ENVIARME** el signing secret para actualizarlo en el servidor:
```
whsec_[EL_SECRET_QUE_COPIASTE]
```

---

## 4️⃣ EMAIL (OPCIONAL)

### Situación actual:
- Email actual: `occr@pixelcrafters.digital`
- Email deseado: `occr@occrproductos.com.mx`

### Si ya tienes la cuenta configurada:
Proporcionarme:
- **Email:** occr@occrproductos.com.mx
- **Contraseña:** [la contraseña del email]
- **Host SMTP:** (probablemente `smtp.hostinger.com`)

### Si NO tienes la cuenta:
Podemos dejarlo con el email actual temporalmente. El sistema funcionará igual.

---

## 5️⃣ WHATSAPP BUSINESS (VERIFICAR)

### Acceso:
- **URL:** https://business.facebook.com/
- **WABA ID:** 1079539380992237
- **Phone Number ID:** 763886130136831

### Pasos:
1. Ir a **Meta Business Manager**
2. Navegar a **WhatsApp** → **Settings** → **Webhooks**
3. **VERIFICAR** si hay webhooks configurados
4. Si HAY webhooks configurados:
   - Editar el webhook existente
   - **AGREGAR** el nuevo dominio:
     ```
     https://occrproductos.com.mx/webhook/whatsapp
     ```
   - Mantener el antiguo temporalmente

5. Si NO hay webhooks: No hacer nada

### ⚠️ Nota:
Según documentación, WhatsApp está en revisión de permisos. Solo necesitamos actualizar si ya hay webhooks activos.

---

## 📊 CHECKLIST DE PROGRESO

### ✅ Completado:
- [x] DNS configurado
- [x] Certificado SSL generado
- [x] Nginx configurado
- [x] Backend .env actualizado
- [x] Frontend environment.js actualizado

### ⏳ Pendiente (TÚ):
- [ ] Google OAuth - Agregar redirect URI
- [ ] Apple Sign-In - Agregar dominio
- [ ] Stripe - Crear webhook y copiar secret
- [ ] WhatsApp - Verificar webhooks (si existen)
- [ ] Email - Proporcionar credenciales (opcional)

---

## 🎯 ORDEN RECOMENDADO

1. **PRIMERO:** Google OAuth (5 minutos)
2. **SEGUNDO:** Apple Sign-In (5 minutos)
3. **TERCERO:** Stripe Webhook (5 minutos)
4. **CUARTO:** WhatsApp verificación (3 minutos)
5. **QUINTO:** Email (opcional)

**Tiempo total estimado:** 20-25 minutos

---

## 📞 DESPUÉS DE COMPLETAR

**Avisarme cuando hayas terminado** para que yo:
1. Actualice el Stripe webhook secret en el servidor
2. Hagamos testing completo de todas las funcionalidades
3. Recompilemos la app FAMAC

---

## ⚠️ IMPORTANTE

- **NO ELIMINAR** configuraciones antiguas hasta que confirmemos que las nuevas funcionan
- **Ambos dominios** deben coexistir temporalmente (1-2 semanas)
- **Copiar exactamente** las URLs que proporciono (sin espacios extra)

---

**¿Necesitas ayuda con alguna de estas configuraciones?** Puedo guiarte paso a paso en cada una.
