# 📱 GUÍA COMPLETA: Aprobación WhatsApp Business API
## Meta Business - Sabores de Origen

**Fecha:** 2025-12-18
**App:** Sabores de Origen (FAMAC)
**WABA ID:** 1079539380992237
**Phone Number ID:** 763886130136831

---

## 🚨 POR QUÉ TE RECHAZARON

### **Problema principal:**
Tu video **NO mostró la experiencia completa** que describiste en el caso de uso.

### **Lo que el revisor necesita ver:**
> "You must show on the screencast video that the **OTP code received on the WhatsApp number is also visible on the app platform** in order to verify that the code received on WhatsApp is similar to what's on the app."

### **Traducción:**
Debes mostrar **SIMULTÁNEAMENTE**:
1. 📱 La app enviando el código OTP
2. 💬 WhatsApp (web o móvil) recibiendo ese MISMO código
3. ✅ Verificación del código en la app

**Lo que probablemente mostraste:** Solo la app funcionando.
**Lo que DEBES mostrar:** App + WhatsApp lado a lado.

---

## 📋 REQUISITOS ESPECÍFICOS DE META

### 1. **Idioma:** INGLÉS
- ❌ Tu app está en español
- ✅ Debes cambiar temporalmente a inglés O agregar subtítulos en inglés

### 2. **Elementos requeridos:**
- ✅ Flujo de login de Meta (si aplica)
- ✅ Usuario con acceso a la app
- ✅ Experiencia COMPLETA del caso de uso
- ✅ Subtítulos explicando cada acción
- ✅ Mostrar app Y WhatsApp simultáneamente

### 3. **Contenido del video:**
- ✅ Inicio de sesión (si aplica)
- ✅ Usuario completando acción que dispara WhatsApp
- ✅ **CRÍTICO:** Mostrar mensaje enviado desde app
- ✅ **CRÍTICO:** Mostrar mismo mensaje recibido en WhatsApp
- ✅ Verificación/confirmación

---

## 🎬 GUIÓN COMPLETO DEL VIDEO

### **Duración:** 2-3 minutos
### **Herramientas necesarias:**
- 📱 Celular con la app FAMAC instalada
- 💻 Computadora con WhatsApp Web abierto
- 🎥 Software de grabación (OBS Studio, QuickTime, etc.)
- 📝 Subtítulos en inglés

---

## 📝 GUIÓN DETALLADO PASO A PASO

### **ESCENA 1: Introducción (10 segundos)**

**Video muestra:**
- Pantalla dividida: App FAMAC (izquierda) + WhatsApp Web (derecha)
- App en pantalla de inicio/login

**Subtítulos en inglés:**
```
"Sabores de Origen - Food Delivery App"
"Demonstrating WhatsApp Business Messaging Integration"
"Use Case: OTP Verification for User Registration"
```

**Voz en off (opcional):**
> "This demo shows how Sabores de Origen uses WhatsApp Business API to send OTP verification codes to users during registration."

---

### **ESCENA 2: Caso de Uso #1 - OTP para Registro (60 segundos)**

#### **Paso 1: Iniciar registro**
**Video muestra:**
- Usuario hace clic en "Registrarse" o "Sign Up"
- Formulario de registro aparece

**Subtítulos:**
```
"Step 1: User taps 'Sign Up' button"
"User enters: Name, Email, Phone Number"
"Phone number format: +52 XXX XXX XXXX (Mexican number)"
```

**Lo que el usuario escribe:**
```
Name: John Test
Email: john.test@example.com
Phone: +52 564 785 1365
```

#### **Paso 2: Envío de OTP**
**Video muestra:**
- Usuario hace clic en "Enviar código" o "Send Code"
- **IMPORTANTE:** Mostrar loading/spinner

**Subtítulos:**
```
"Step 2: User taps 'Send Verification Code'"
"App sends OTP request to WhatsApp Business API"
"Loading... Sending OTP via WhatsApp"
```

#### **Paso 3: MOSTRAR WHATSAPP RECIBIENDO (CRÍTICO)**
**Video muestra:**
- **Lado derecho:** WhatsApp Web recibe el mensaje
- **Mensaje visible:** "Tu código de verificación para Sabores de Origen es: 123456"

**Subtítulos:**
```
"Step 3: WhatsApp receives OTP message"
"Message displays: 'Your verification code for Sabores de Origen is: 123456'"
"Note: This is a pre-approved template message"
```

**CRÍTICO:**
- El código OTP debe ser CLARAMENTE VISIBLE en WhatsApp
- Debe coincidir con el que el usuario ingresará en la app

#### **Paso 4: Ingresar OTP en la app**
**Video muestra:**
- Usuario regresa a la app (lado izquierdo)
- Campo de verificación OTP visible
- Usuario escribe: `123456`

**Subtítulos:**
```
"Step 4: User enters OTP code from WhatsApp"
"Code entered: 123456 (matches WhatsApp message)"
"App validates OTP against database"
```

#### **Paso 5: Verificación exitosa**
**Video muestra:**
- Mensaje de éxito: "✅ Verificación exitosa" o "✅ Verification Successful"
- Usuario completa registro

**Subtítulos:**
```
"Step 5: OTP verified successfully"
"User account created and activated"
"User can now place orders"
```

---

### **ESCENA 3: Caso de Uso #2 - Confirmación de Pedido (60 segundos)**

#### **Paso 1: Crear pedido**
**Video muestra:**
- Usuario navega por productos
- Agrega productos al carrito
- Va a checkout

**Subtítulos:**
```
"Use Case 2: Order Confirmation via WhatsApp"
"Step 1: User browses products and adds to cart"
"User proceeds to checkout"
```

#### **Paso 2: Completar orden**
**Video muestra:**
- Usuario completa información de entrega
- Selecciona método de pago
- Confirma pedido

**Subtítulos:**
```
"Step 2: User completes delivery information"
"User selects payment method (Stripe/OXXO)"
"Order ID: 20251218-0947 (automatic format)"
```

#### **Paso 3: WhatsApp recibe confirmación**
**Video muestra:**
- **WhatsApp Web:** Nuevo mensaje de confirmación
- Mensaje muestra:
  - Número de pedido
  - Productos comprados
  - Total
  - Hora de entrega estimada

**Subtítulos:**
```
"Step 3: WhatsApp sends order confirmation"
"Message includes: Order number, items, total, delivery time"
"Template name: order_confirmation (pre-approved)"
```

**Ejemplo de mensaje:**
```
🎉 ¡Pedido Confirmado!

Pedido: #20251218-0947
Total: $450.00 MXN
Entrega estimada: 45-60 minutos

¡Gracias por tu compra en Sabores de Origen!
```

#### **Paso 4: Actualización de estado**
**Video muestra:**
- Usuario puede ver estado del pedido en la app
- WhatsApp envía actualización: "Tu pedido está en camino"

**Subtítulos:**
```
"Step 4: Order status updates sent via WhatsApp"
"Updates include: Preparing, In Transit, Delivered"
"Real-time communication improves user experience"
```

---

### **ESCENA 4: Caso de Uso #3 - Gestión de Cuenta (30 segundos)**

#### **Templates de mensajes administrativos**
**Video muestra:**
- Panel de administración de WhatsApp Business
- Lista de templates aprobados

**Subtítulos:**
```
"WhatsApp Business Management Features:"
"1. Message Templates - Pre-approved by Meta"
"2. Phone Number Management - Verified business number"
"3. Account Configuration - WABA ID: 1079539380992237"
```

**Mostrar templates:**
1. `otp_verification` - UTILITY
2. `order_confirmation` - UTILITY
3. `order_status_update` - UTILITY
4. `delivery_notification` - UTILITY

---

### **ESCENA 5: Valor para el Usuario (20 segundos)**

**Video muestra:**
- Resumen de beneficios

**Subtítulos:**
```
"Benefits for Users:"
"✅ Instant OTP verification via WhatsApp (most used messaging app in Mexico)"
"✅ Real-time order updates without checking email"
"✅ Secure authentication with 6-digit codes"
"✅ Improved transparency - users always know order status"
```

**Texto en pantalla:**
```
📊 WhatsApp is #1 messaging app in Mexico (90%+ adoption)
🔒 All messages are transactional (user-initiated)
❌ NO spam - NO promotional messages
✅ Only pre-approved templates
```

---

## 🎯 CONFIGURACIÓN DE TEMPLATES REQUERIDA

### **Template 1: OTP Verification**
```
Name: otp_verification
Category: UTILITY
Language: Spanish (es_MX)
Status: APPROVED (debe estar aprobado)

Message:
Tu código de verificación para {{1}} es: {{2}}

Variables:
{{1}} = App name (Sabores de Origen)
{{2}} = OTP code (123456)

Example:
Tu código de verificación para Sabores de Origen es: 123456
```

### **Template 2: Order Confirmation**
```
Name: order_confirmation
Category: UTILITY
Language: Spanish (es_MX)
Status: APPROVED

Message:
🎉 ¡Pedido Confirmado!

Pedido: {{1}}
Total: ${{2}} MXN
Entrega estimada: {{3}}

¡Gracias por tu compra en Sabores de Origen!

Variables:
{{1}} = Order number
{{2}} = Total amount
{{3}} = Estimated delivery time
```

### **Template 3: Order Status Update**
```
Name: order_status_update
Category: UTILITY
Language: Spanish (es_MX)

Message:
📦 Actualización de Pedido #{{1}}

Estado: {{2}}
{{3}}

Sabores de Origen

Variables:
{{1}} = Order number
{{2}} = Status (Preparando/En camino/Entregado)
{{3}} = Additional info
```

---

## 📹 CONFIGURACIÓN DE GRABACIÓN

### **Opción 1: OBS Studio (Recomendado - GRATIS)**

**Configuración:**
1. Descargar: https://obsproject.com/
2. Crear escena con 2 fuentes:
   - **Fuente 1:** Pantalla de celular (via QuickTime/scrcpy)
   - **Fuente 2:** WhatsApp Web en navegador
3. Layout: 50/50 split screen
4. Grabar en 1080p, 30fps
5. Formato: MP4

**Pasos:**
```
1. Abrir OBS Studio
2. Agregar "Window Capture" para WhatsApp Web
3. Agregar "Display Capture" para celular (via QuickTime)
4. Ajustar posiciones (50% cada uno)
5. Agregar subtítulos (Text source)
6. Grabar
```

### **Opción 2: QuickTime + iMovie (Mac)**

**Pasos:**
```
1. QuickTime Player → New Screen Recording (WhatsApp Web)
2. QuickTime Player → New Movie Recording (iPhone via cable)
3. Grabar ambos simultáneamente
4. Importar a iMovie
5. Editar: pantalla dividida 50/50
6. Agregar subtítulos
7. Exportar
```

### **Opción 3: Screencast-O-Matic / Loom**

**Pasos:**
```
1. Abrir WhatsApp Web en navegador
2. Conectar celular via QuickTime (Mac) o scrcpy (Windows)
3. Usar Loom para grabar ambas ventanas
4. Agregar subtítulos en editor de Loom
5. Exportar
```

---

## ✅ CHECKLIST PRE-ENVÍO

### **Antes de grabar:**
- [ ] WhatsApp Web abierto y loggeado con el número de prueba
- [ ] App FAMAC instalada en celular
- [ ] Templates `otp_verification` y `order_confirmation` APROBADOS en Meta
- [ ] Número de prueba puede recibir mensajes de WhatsApp Business
- [ ] Software de grabación configurado (OBS/QuickTime)
- [ ] Subtítulos en inglés preparados

### **Durante la grabación:**
- [ ] Ambas pantallas visibles simultáneamente (app + WhatsApp)
- [ ] Código OTP claramente visible en WhatsApp
- [ ] Mismo código ingresado en la app
- [ ] Mensajes de confirmación visibles
- [ ] Subtítulos en inglés en cada paso
- [ ] Audio claro (si usas voz en off)
- [ ] Sin información sensible visible (emails reales, etc.)

### **Después de grabar:**
- [ ] Video dura 2-3 minutos
- [ ] Resolución mínimo 720p (preferible 1080p)
- [ ] Formato MP4 o MOV
- [ ] Tamaño menor a 500MB
- [ ] Subtítulos legibles
- [ ] Audio sincronizado (si hay voz)

### **En la solicitud de Meta:**
- [ ] Descripción del caso de uso en INGLÉS
- [ ] Mencionar que es app de servidor a servidor (si no hay login de Meta)
- [ ] Especificar templates usados
- [ ] Explicar por qué WhatsApp beneficia al usuario
- [ ] Incluir estadística: "WhatsApp is #1 in Mexico with 90%+ adoption"

---

## 📝 TEXTO PARA LA SOLICITUD (EN INGLÉS)

### **whatsapp_business_messaging**

**App Description:**
```
Sabores de Origen is a food delivery platform serving customers in Mexico City.
We use WhatsApp Business API for critical transactional messages that improve
user experience and security.
```

**Use Case Description:**
```
1. OTP VERIFICATION FOR USER SIGNUP:
When users register, we send a 6-digit OTP code via WhatsApp for phone number
verification. This prevents fraud and ensures only the phone owner can create
an account. WhatsApp is preferred as it's the #1 messaging app in Mexico
(90%+ adoption rate).

2. ORDER CONFIRMATIONS:
After successful checkout, we send order confirmation with order number, items,
total amount, and estimated delivery time. This provides instant confirmation
without requiring users to check email.

3. ORDER STATUS UPDATES:
We notify customers when order status changes (Preparing → In Transit → Delivered).
Real-time updates via WhatsApp improve transparency and reduce customer service
inquiries.

IMPORTANT NOTES:
- This is a server-to-server app (no Meta login flow)
- All messages use pre-approved templates
- Messages are transactional only (user-initiated actions)
- NO promotional or marketing messages
- Users can opt-out anytime via app settings
```

**Why WhatsApp:**
```
- WhatsApp has 90%+ market penetration in Mexico
- Users prefer WhatsApp over SMS (more reliable, free, familiar interface)
- Instant delivery verification with read receipts
- Secure platform for OTP codes (end-to-end encrypted)
- Reduces email dependency (many users don't check email regularly)
```

---

### **whatsapp_business_management**

**Use Case Description:**
```
WHATSAPP BUSINESS ACCOUNT MANAGEMENT:

1. MESSAGE TEMPLATES:
We need to create, update, and manage message templates for:
- OTP verification (otp_verification)
- Order confirmations (order_confirmation)
- Status updates (order_status_update)
- Delivery notifications (delivery_notification)

2. PHONE NUMBER MANAGEMENT:
Manage verified business phone number associated with our WABA account:
- Phone Number ID: 763886130136831
- Verify webhook configuration
- Update settings as needed

3. ACCOUNT MONITORING:
- Monitor message delivery rates
- Review template approval status
- Configure webhook endpoints for message status updates
- Manage business profile information

This permission is essential for operational management of our WhatsApp
Business integration and ensuring smooth message delivery to customers.
```

---

## 🎥 SCRIPT DE VOZ EN OFF (OPCIONAL)

```
[0:00 - 0:10]
"Hello, this is a demonstration of Sabores de Origen, a food delivery app
that uses WhatsApp Business API for transactional messaging."

[0:10 - 0:20]
"I'll show you three use cases: OTP verification, order confirmations, and
status updates. Please note both screens - the mobile app on the left and
WhatsApp Web on the right."

[0:20 - 0:45]
"First, OTP verification. When a user signs up, they enter their phone number.
After tapping 'Send Code', the app sends a request to WhatsApp Business API.
As you can see on the right, WhatsApp receives the message with a 6-digit code."

[0:45 - 1:00]
"The user then enters this code in the app. Notice the code matches exactly
what was received in WhatsApp. After validation, the account is created."

[1:00 - 1:30]
"Second use case: order confirmations. After a user places an order, they
immediately receive a WhatsApp message with order details - number, items,
total, and estimated delivery time."

[1:30 - 1:50]
"Third use case: status updates. As the order progresses, customers receive
real-time notifications via WhatsApp when the status changes."

[1:50 - 2:10]
"All messages use pre-approved templates and are purely transactional -
triggered only by user actions. We never send promotional or spam messages."

[2:10 - 2:20]
"WhatsApp is the preferred channel in Mexico with over 90% adoption, making it
the most reliable way to reach our customers."

[2:20 - 2:30]
"Thank you for reviewing our app. This integration significantly improves user
experience and security for our customers."
```

---

## 🔧 CONFIGURACIÓN TÉCNICA EN EL BACKEND

### **Archivo: .env o .env.aws**

```bash
# WhatsApp Business API
WHATSAPP_ENABLED=true
WHATSAPP_API_URL=https://graph.facebook.com/v22.0
WHATSAPP_API_TOKEN=tu_token_de_acceso_temporal
WHATSAPP_PHONE_NUMBER_ID=763886130136831
WHATSAPP_WABA_ID=1079539380992237

# OTP Configuration
OTP_METHOD=whatsapp
OTP_WHATSAPP_TEMPLATE=otp_verification
```

### **Verificar que templates estén aprobados:**

```bash
cd "D:\OCCRPRODUCTOS\Occr_Prodcutos_App\Desarrollo\Backend LActeos y mas\foodbackend\foodbackend"
php list-whatsapp-templates.php
```

**Output esperado:**
```
✅ Templates encontrados:

📝 Nombre: otp_verification
   Idioma: es_MX
   Estado: APPROVED
   Categoría: UTILITY

📝 Nombre: order_confirmation
   Idioma: es_MX
   Estado: APPROVED
   Categoría: UTILITY
```

---

## 🚀 PASOS FINALES

### **1. Preparar templates (ANTES del video)**
```
1. Ir a Meta Business Manager
2. WhatsApp Manager → Message Templates
3. Crear templates:
   - otp_verification (UTILITY)
   - order_confirmation (UTILITY)
   - order_status_update (UTILITY)
4. Esperar aprobación (24-48 horas)
```

### **2. Probar en tu celular**
```
1. Ejecutar test: php test-otp-whatsapp.php 525647851365
2. Verificar que llegue el mensaje a WhatsApp
3. Probar la app en real
4. Confirmar que todo funciona
```

### **3. Grabar el video**
```
1. Configurar OBS con pantalla dividida
2. Practicar el flujo 2-3 veces
3. Grabar versión final (2-3 minutos)
4. Agregar subtítulos en inglés
5. Exportar en MP4 1080p
```

### **4. Completar solicitud**
```
1. Ir a Meta App Dashboard
2. App Review → Permissions and Features
3. Agregar: whatsapp_business_messaging
4. Agregar: whatsapp_business_management
5. Pegar descripción en INGLÉS (arriba)
6. Subir video
7. Seleccionar "Server-to-server app" si no hay login de Meta
8. Enviar
```

### **5. Esperar revisión**
```
- Tiempo de revisión: 3-5 días hábiles
- Revisar email de Meta diariamente
- Si piden cambios, aplicar y reenviar rápido
```

---

## 🎯 ERRORES COMUNES A EVITAR

### ❌ **NO HAGAS ESTO:**
1. ❌ Grabar solo la app sin mostrar WhatsApp
2. ❌ Usar video en español sin subtítulos
3. ❌ Enviar video de baja calidad (menos de 720p)
4. ❌ No mostrar el código OTP recibido en WhatsApp
5. ❌ Templates no aprobados antes de grabar
6. ❌ Descripción genérica sin detalles
7. ❌ Video muy largo (más de 5 minutos)
8. ❌ Mostrar información sensible (emails reales, passwords)

### ✅ **SÍ HAGAS ESTO:**
1. ✅ Pantalla dividida: App + WhatsApp simultáneamente
2. ✅ Subtítulos en INGLÉS en cada paso
3. ✅ Mostrar código OTP CLARAMENTE en WhatsApp
4. ✅ Mostrar MISMO código ingresado en app
5. ✅ Templates aprobados y funcionando
6. ✅ Descripción detallada en inglés
7. ✅ Video 2-3 minutos, directo al grano
8. ✅ Usar datos de prueba (john.test@example.com)

---

## 📞 SOPORTE

### **Si tienes dudas:**

**Documentación oficial:**
- https://developers.facebook.com/docs/whatsapp/business-management-api
- https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages

**App Review:**
- https://developers.facebook.com/docs/app-review

**Templates:**
- https://developers.facebook.com/docs/whatsapp/message-templates

---

## ✅ RESUMEN EJECUTIVO

### **Lo que necesitas hacer:**

1. **Crear templates en Meta Business Manager** (si no existen)
   - `otp_verification` (UTILITY)
   - `order_confirmation` (UTILITY)
   - Esperar aprobación (24-48h)

2. **Grabar video correcto**
   - Pantalla dividida: App (izquierda) + WhatsApp Web (derecha)
   - Mostrar OTP enviado desde app
   - Mostrar MISMO OTP recibido en WhatsApp
   - Subtítulos en INGLÉS
   - Duración: 2-3 minutos

3. **Completar solicitud en inglés**
   - Descripción detallada del caso de uso
   - Por qué WhatsApp es necesario
   - Mencionar "server-to-server app"
   - Subir video correcto

4. **Enviar y esperar**
   - Revisión en 3-5 días
   - Aplicar feedback si lo piden
   - ¡Listo!

---

**Fecha de creación:** 2025-12-18
**Última actualización:** 2025-12-18
**Autor:** Claude Code
**Estado:** LISTO PARA IMPLEMENTAR

---

## 🎉 ¡ÉXITO!

Siguiendo esta guía paso a paso, tu solicitud tiene alta probabilidad de aprobación.

**Recuerda:**
- 📱 App + WhatsApp simultáneamente
- 🔢 Código OTP visible en AMBOS lados
- 🇬🇧 Subtítulos en inglés
- 📝 Templates aprobados primero
- 🎥 Video 2-3 minutos, directo

**¡Mucha suerte!** 🍀
