# 📋 TEMPLATES DE WHATSAPP - Configuración Exacta

## Meta Business Manager Template Setup
**WABA ID:** 1079539380992237
**Phone Number ID:** 763886130136831

---

## ⚠️ IMPORTANTE: Crear ANTES del video

**Estos templates DEBEN estar APPROVED antes de grabar el video.**

**Proceso:**
1. Ir a: https://business.facebook.com/
2. WhatsApp Manager → Message Templates
3. Create Template para cada uno de abajo
4. Esperar aprobación (24-48 horas)
5. Verificar status = "APPROVED"
6. **ENTONCES** grabar el video

---

## 📝 TEMPLATE 1: OTP Verification

### Información básica:
```
Template Name: otp_verification
Category: UTILITY
Language: Spanish (es_MX)
```

### Header:
```
Type: TEXT
Content: Código de Verificación
```

### Body:
```
Tu código de verificación para {{1}} es: {{2}}

Este código expira en 10 minutos.
```

### Footer:
```
Sabores de Origen - No compartas este código
```

### Buttons:
```
None (no buttons for OTP)
```

### Variables:
- `{{1}}` = Nombre de la app (Sabores de Origen)
- `{{2}}` = Código OTP (6 dígitos: 123456)

### Ejemplo completo:
```
━━━━━━━━━━━━━━━━━━━━━━━
📱 Código de Verificación

Tu código de verificación para Sabores de Origen es: 123456

Este código expira en 10 minutos.

━━━━━━━━━━━━━━━━━━━━━━━
Sabores de Origen - No compartas este código
```

### Sample Content para Meta:
```
Variable 1: Sabores de Origen
Variable 2: 123456
```

---

## 📝 TEMPLATE 2: Order Confirmation

### Información básica:
```
Template Name: order_confirmation
Category: UTILITY
Language: Spanish (es_MX)
```

### Header:
```
Type: TEXT
Content: 🎉 ¡Pedido Confirmado!
```

### Body:
```
Gracias por tu compra en Sabores de Origen.

Detalles del pedido:
• Número: {{1}}
• Total: ${{2}} MXN
• Entrega estimada: {{3}}

Estamos preparando tu pedido.
```

### Footer:
```
Sabores de Origen - Productos naturales a tu puerta
```

### Buttons:
```
Type: QUICK_REPLY
Text: Ver mi pedido
```

### Variables:
- `{{1}}` = Número de pedido (20251218-0947)
- `{{2}}` = Total (450.00)
- `{{3}}` = Tiempo estimado (45-60 minutos)

### Ejemplo completo:
```
━━━━━━━━━━━━━━━━━━━━━━━
🎉 ¡Pedido Confirmado!

Gracias por tu compra en Sabores de Origen.

Detalles del pedido:
• Número: 20251218-0947
• Total: $450.00 MXN
• Entrega estimada: 45-60 minutos

Estamos preparando tu pedido.

━━━━━━━━━━━━━━━━━━━━━━━
Sabores de Origen - Productos naturales a tu puerta

[📱 Ver mi pedido]
```

### Sample Content para Meta:
```
Variable 1: 20251218-0947
Variable 2: 450.00
Variable 3: 45-60 minutos
```

---

## 📝 TEMPLATE 3: Order Status Update

### Información básica:
```
Template Name: order_status_update
Category: UTILITY
Language: Spanish (es_MX)
```

### Header:
```
Type: TEXT
Content: 📦 Actualización de Pedido
```

### Body:
```
Tu pedido #{{1}} ha cambiado de estado.

Estado actual: {{2}}

{{3}}

¡Gracias por tu preferencia!
```

### Footer:
```
Sabores de Origen
```

### Buttons:
```
Type: QUICK_REPLY
Text: Rastrear pedido
```

### Variables:
- `{{1}}` = Número de pedido (20251218-0947)
- `{{2}}` = Estado (En camino / Preparando / Entregado)
- `{{3}}` = Información adicional (Tu repartidor llegará en 15 minutos)

### Ejemplos completos:

**Ejemplo 1: En preparación**
```
━━━━━━━━━━━━━━━━━━━━━━━
📦 Actualización de Pedido

Tu pedido #20251218-0947 ha cambiado de estado.

Estado actual: Preparando

Estamos reuniendo tus productos frescos.

¡Gracias por tu preferencia!

━━━━━━━━━━━━━━━━━━━━━━━
Sabores de Origen

[📍 Rastrear pedido]
```

**Ejemplo 2: En camino**
```
━━━━━━━━━━━━━━━━━━━━━━━
📦 Actualización de Pedido

Tu pedido #20251218-0947 ha cambiado de estado.

Estado actual: En camino

Tu repartidor llegará en aproximadamente 15 minutos.

¡Gracias por tu preferencia!

━━━━━━━━━━━━━━━━━━━━━━━
Sabores de Origen

[📍 Rastrear pedido]
```

**Ejemplo 3: Entregado**
```
━━━━━━━━━━━━━━━━━━━━━━━
📦 Actualización de Pedido

Tu pedido #20251218-0947 ha cambiado de estado.

Estado actual: Entregado

¡Disfruta tus productos naturales! ¿Cómo fue tu experiencia?

¡Gracias por tu preferencia!

━━━━━━━━━━━━━━━━━━━━━━━
Sabores de Origen

[📍 Rastrear pedido]
```

### Sample Content para Meta:
```
Variable 1: 20251218-0947
Variable 2: En camino
Variable 3: Tu repartidor llegará en aproximadamente 15 minutos.
```

---

## 📝 TEMPLATE 4: Delivery Notification (OPCIONAL)

### Información básica:
```
Template Name: delivery_nearby
Category: UTILITY
Language: Spanish (es_MX)
```

### Header:
```
Type: TEXT
Content: 🚗 Tu pedido está cerca
```

### Body:
```
¡Tu pedido #{{1}} está por llegar!

Tu repartidor {{2}} se encuentra a {{3}} de distancia.

Tiempo estimado de llegada: {{4}}
```

### Footer:
```
Sabores de Origen
```

### Buttons:
```
None
```

### Variables:
- `{{1}}` = Número de pedido
- `{{2}}` = Nombre del repartidor
- `{{3}}` = Distancia (500 metros)
- `{{4}}` = Tiempo (3-5 minutos)

### Ejemplo completo:
```
━━━━━━━━━━━━━━━━━━━━━━━
🚗 Tu pedido está cerca

¡Tu pedido #20251218-0947 está por llegar!

Tu repartidor Juan Pérez se encuentra a 500 metros de distancia.

Tiempo estimado de llegada: 3-5 minutos

━━━━━━━━━━━━━━━━━━━━━━━
Sabores de Origen
```

---

## 🔧 VERIFICAR TEMPLATES EN BACKEND

### Archivo: `.env` o `.env.aws`

Agregar estas líneas:
```bash
# WhatsApp Templates
WHATSAPP_TEMPLATE_OTP=otp_verification
WHATSAPP_TEMPLATE_ORDER_CONFIRMATION=order_confirmation
WHATSAPP_TEMPLATE_STATUS_UPDATE=order_status_update
WHATSAPP_TEMPLATE_DELIVERY_NEARBY=delivery_nearby
```

### Verificar templates aprobados:

```bash
cd "D:\OCCRPRODUCTOS\Occr_Prodcutos_App\Desarrollo\Backend LActeos y mas\foodbackend\foodbackend"
php list-whatsapp-templates.php
```

**Output esperado:**
```
✅ Templates encontrados:

📝 Nombre: otp_verification
   Idioma: es_MX
   Estado: APPROVED ✅
   Categoría: UTILITY

📝 Nombre: order_confirmation
   Idioma: es_MX
   Estado: APPROVED ✅
   Categoría: UTILITY

📝 Nombre: order_status_update
   Idioma: es_MX
   Estado: APPROVED ✅
   Categoría: UTILITY
```

**Si dice "PENDING" o "IN_REVIEW":**
```
⏳ Espera 24-48 horas
⏳ Revisa email de Meta
⏳ NO grabes el video hasta que diga APPROVED
```

---

## 🧪 PROBAR TEMPLATES

### Test OTP:
```bash
php test-otp-whatsapp.php 525647851365
```

**Resultado esperado:**
```
✅ ÉXITO: OTP enviado correctamente
📬 Message ID: wamid.XXXXXX
💡 Revisa WhatsApp en el número +525647851365
```

### Test manual con curl:

```bash
curl -X POST "https://graph.facebook.com/v22.0/763886130136831/messages" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "525647851365",
    "type": "template",
    "template": {
      "name": "otp_verification",
      "language": {
        "code": "es_MX"
      },
      "components": [
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": "Sabores de Origen"
            },
            {
              "type": "text",
              "text": "123456"
            }
          ]
        }
      ]
    }
  }'
```

---

## 📊 STATUS DE TEMPLATES - CHECKLIST

Antes de grabar el video, verificar:

### Template: otp_verification
- [ ] Creado en Meta Business Manager
- [ ] Status: APPROVED ✅
- [ ] Probado con curl o script PHP
- [ ] Mensaje llega a WhatsApp correctamente
- [ ] Variables se reemplazan bien ({{1}} y {{2}})

### Template: order_confirmation
- [ ] Creado en Meta Business Manager
- [ ] Status: APPROVED ✅
- [ ] Probado manualmente
- [ ] Botón "Ver mi pedido" funciona (opcional)
- [ ] Variables se reemplazan bien

### Template: order_status_update
- [ ] Creado en Meta Business Manager
- [ ] Status: APPROVED ✅
- [ ] Probado con diferentes estados
- [ ] Variables dinámicas funcionan

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Problema: Template rechazado

**Razones comunes:**
1. ❌ Mensaje suena promocional
2. ❌ Falta información de opt-out
3. ❌ Variables no están claras
4. ❌ Categoría incorrecta (debe ser UTILITY, no MARKETING)

**Solución:**
- Usar categoría UTILITY
- Agregar footer claro
- Variables descriptivas
- Sin emojis excesivos
- Sin mensajes de venta

### Problema: Template en PENDING por mucho tiempo

**Solución:**
1. Esperar 48 horas
2. Si sigue pendiente, editar y reenviar
3. Contactar soporte de Meta

### Problema: No puedo crear templates

**Verificar:**
- [ ] Cuenta de WhatsApp Business verificada
- [ ] Número de teléfono verificado
- [ ] Permisos de administrador en WABA
- [ ] Business Manager aprobado

---

## ✅ CHECKLIST FINAL

### Antes del video:
- [ ] 3 templates creados (mínimo 2: OTP + Order Confirmation)
- [ ] Todos con status APPROVED ✅
- [ ] Probados con script PHP
- [ ] Mensajes llegan a WhatsApp correctamente
- [ ] Variables se reemplazan bien
- [ ] Backend configurado (.env)

### Durante el video:
- [ ] Usar template `otp_verification` para mostrar OTP
- [ ] Usar template `order_confirmation` para pedido
- [ ] Mostrar que mensajes usan templates aprobados

### En la solicitud de Meta:
- [ ] Mencionar nombres de templates exactos:
  - `otp_verification`
  - `order_confirmation`
  - `order_status_update`
- [ ] Explicar que son UTILITY (no marketing)
- [ ] Mencionar que están pre-aprobados

---

## 📞 CONTACTO META SUPPORT

**Si necesitas ayuda:**

1. **Meta Business Help Center:**
   https://business.facebook.com/business/help

2. **WhatsApp Business API Support:**
   https://developers.facebook.com/support/

3. **Template Guidelines:**
   https://developers.facebook.com/docs/whatsapp/message-templates/guidelines

---

## 🎯 RESUMEN RÁPIDO

**3 Templates OBLIGATORIOS:**

1. ✅ `otp_verification` - Para códigos de verificación
2. ✅ `order_confirmation` - Para confirmaciones de pedido
3. ✅ `order_status_update` - Para actualizaciones de estado

**Todos deben ser:**
- Category: UTILITY
- Language: es_MX (Spanish - Mexico)
- Status: APPROVED ✅

**Sin templates aprobados = Video rechazado automáticamente**

---

**IMPORTANTE:** NO grabes el video hasta que veas "APPROVED" en los 3 templates.

**Tiempo de aprobación promedio:** 24-48 horas (puede ser más rápido)

**¡Buena suerte!** 🍀
