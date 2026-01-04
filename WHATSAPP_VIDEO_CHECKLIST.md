# ✅ CHECKLIST RÁPIDO: Video WhatsApp Business

## 🎬 ANTES DE GRABAR

### Configuración:
- [ ] WhatsApp Web abierto con número de prueba (+52 564 785 1365)
- [ ] App FAMAC en celular con cuenta de prueba
- [ ] OBS Studio configurado con pantalla dividida 50/50
- [ ] Templates aprobados en Meta Business Manager:
  - [ ] `otp_verification` - Status: APPROVED
  - [ ] `order_confirmation` - Status: APPROVED
- [ ] Subtítulos en inglés preparados
- [ ] Datos de prueba listos:
  - Nombre: John Test
  - Email: john.test@example.com
  - Teléfono: +52 564 785 1365

### Verificar backend:
```bash
cd "D:\OCCRPRODUCTOS\Occr_Prodcutos_App\Desarrollo\Backend LActeos y mas\foodbackend\foodbackend"
php test-otp-whatsapp.php 525647851365
```
- [ ] Mensaje llega a WhatsApp ✅
- [ ] Código OTP visible en WhatsApp ✅

---

## 📹 DURANTE LA GRABACIÓN

### Escena 1: OTP Verification (60 seg)
- [ ] 00:00 - Mostrar app + WhatsApp lado a lado
- [ ] 00:10 - Usuario hace clic "Sign Up"
- [ ] 00:15 - Usuario llena formulario (nombre, email, teléfono)
- [ ] 00:25 - Usuario hace clic "Send Verification Code"
- [ ] 00:30 - **CRÍTICO:** WhatsApp recibe mensaje con OTP
- [ ] 00:35 - **CRÍTICO:** Código OTP CLARAMENTE VISIBLE
- [ ] 00:40 - Usuario ingresa código en app
- [ ] 00:45 - Código coincide con WhatsApp
- [ ] 00:50 - Verificación exitosa ✅
- [ ] 00:60 - Usuario completa registro

### Escena 2: Order Confirmation (60 seg)
- [ ] 01:00 - Usuario navega productos
- [ ] 01:10 - Agrega productos al carrito
- [ ] 01:20 - Va a checkout
- [ ] 01:30 - Completa información de entrega
- [ ] 01:40 - Confirma pedido
- [ ] 01:45 - **CRÍTICO:** WhatsApp recibe confirmación
- [ ] 01:50 - Mensaje muestra: Pedido #, Total, Hora entrega
- [ ] 02:00 - Usuario ve confirmación en app también

### Subtítulos (INGLÉS) por escena:
- [ ] "Step 1: User taps Sign Up"
- [ ] "Step 2: User enters phone number"
- [ ] "Step 3: App sends OTP via WhatsApp Business API"
- [ ] "Step 4: WhatsApp receives OTP message"
- [ ] "OTP Code: 123456 (clearly visible)"
- [ ] "Step 5: User enters OTP in app"
- [ ] "Step 6: Verification successful"
- [ ] "Use Case 2: Order Confirmation"
- [ ] "WhatsApp sends order details automatically"

---

## ✅ DESPUÉS DE GRABAR

### Calidad del video:
- [ ] Duración: 2-3 minutos (no más de 5)
- [ ] Resolución: Mínimo 720p (preferible 1080p)
- [ ] Formato: MP4 o MOV
- [ ] Tamaño: Menor a 500MB
- [ ] Audio: Claro (si hay voz en off)
- [ ] Subtítulos: Legibles, en INGLÉS

### Contenido verificado:
- [ ] App visible en TODO momento
- [ ] WhatsApp Web visible en TODO momento
- [ ] Código OTP visible en WhatsApp ✅
- [ ] MISMO código ingresado en app ✅
- [ ] No hay información sensible (emails reales, etc.)
- [ ] Flujo completo sin interrupciones

---

## 📝 TEXTO PARA LA SOLICITUD

### Copiar y pegar en Meta App Review:

**Permission: whatsapp_business_messaging**

**Use Case (EN INGLÉS):**
```
1. OTP VERIFICATION FOR USER SIGNUP:
We send 6-digit OTP codes via WhatsApp to verify phone numbers
during registration. WhatsApp is the #1 messaging app in Mexico
with 90%+ adoption.

2. ORDER CONFIRMATIONS:
After checkout, users receive order confirmation with order number,
items, total, and delivery time via WhatsApp for instant notification.

3. ORDER STATUS UPDATES:
Real-time updates when order status changes (Preparing, In Transit,
Delivered).

IMPORTANT: This is a server-to-server app (no Meta login).
All messages use pre-approved templates. NO promotional messages.
```

**Permission: whatsapp_business_management**

**Use Case (EN INGLÉS):**
```
ACCOUNT MANAGEMENT:
- Create and manage message templates
- Monitor delivery rates
- Configure webhooks
- Manage phone number (ID: 763886130136831)
```

---

## 🚨 ERRORES FATALES - NO HAGAS ESTO

- ❌ Grabar solo la app sin WhatsApp
- ❌ No mostrar código OTP en WhatsApp
- ❌ Subtítulos en español (debe ser inglés)
- ❌ Video de más de 5 minutos
- ❌ Templates sin aprobar
- ❌ Baja calidad (menos de 720p)

---

## ✅ REGLA DE ORO

**El revisor debe ver:**
1. 📱 App enviando OTP
2. 💬 WhatsApp recibiendo MISMO OTP
3. 📱 App validando ese OTP

**Todo al MISMO TIEMPO en pantalla dividida**

---

## 📞 CONFIGURACIÓN OBS STUDIO

### Layout:
```
┌─────────────────────────────────────┐
│  📱 FAMAC APP    │   💬 WhatsApp  │
│   (Celular)      │   Web Browser   │
│   50% width      │   50% width     │
└─────────────────────────────────────┘
       Subtítulos en inglés abajo
```

### Fuentes:
1. Window Capture: WhatsApp Web (Chrome/Edge)
2. Display Capture: Celular via QuickTime/scrcpy
3. Text: Subtítulos en inglés

---

## 🎯 RESULTADO ESPERADO

✅ Video muestra CLARAMENTE que:
- OTP generado por la app
- OTP enviado a WhatsApp Business API
- MISMO OTP recibido en WhatsApp
- Usuario verifica OTP en la app
- Todo en inglés con subtítulos

**Meta verá:** "Esta app usa WhatsApp Business API correctamente para mensajes transaccionales que benefician al usuario"

---

**¡ÉXITO ASEGURADO!** 🎉

**Tiempo estimado:**
- Preparación: 30 minutos
- Grabación: 15 minutos (con práctica)
- Edición: 15 minutos
- **TOTAL: ~1 hora**
