# Auditoría Completa del Sistema de Cupones - FAMAC

**Fecha:** 2026-02-09
**Estado:** ✅ COMPLETADO

---

## RESUMEN EJECUTIVO

El sistema de cupones maneja dos tipos de promociones:
1. **Sistema 1 - Cupones** (`is_coupon = true`) - Usuario ingresa código manualmente
2. **Sistema 2 - Promociones** (`is_coupon = false`) - Se aplican automáticamente

---

## BUGS CRÍTICOS ENCONTRADOS Y CORREGIDOS

### Bug 1: Envío se ponía en $0 con cupones de 100%
**Archivo:** `src/cart/Cart.jsx`

**Problema:** Cuando se aplicaba un cupón de 100% de descuento en el total, el cálculo del envío usaba `getSubtotal() - getDiscountAmount()` lo cual resultaba en $0, y el sistema interpretaba esto como "carrito vacío" poniendo el envío en $0.

**Comportamiento incorrecto:**
- Subtotal: $500
- Cupón 100%: -$500
- Subtotal para envío: $0 → Envío: $0
- **Total: $0** (incorrecto)

**Comportamiento correcto (después del fix):**
- Subtotal: $500
- Cupón 100%: -$500
- Subtotal para envío: $500 → Envío: $50 (calculado sobre subtotal original)
- **Total: $50** (solo envío)

**Fix aplicado:** Cambiar de `getSubtotal() - getDiscountAmount()` a `getSubtotal()` en 5 ubicaciones.

---

### Bug 2: Backend no consideraba `applies_to` para recalcular total
**Archivo:** `RegisteredUserController.php`

**Problema:** La fórmula `$recalculatedTotal` siempre restaba el descuento del subtotal, ignorando si el cupón aplicaba a envío.

**Fix aplicado:**
```php
if ($validatedCouponAppliesTo === 'shipping') {
    $discountedShipping = max(0, $shippingCost - $validatedDiscountAmount);
    $recalculatedTotal = max(0, $subtotal + $discountedShipping);
} else {
    $recalculatedTotal = max(0, $subtotal - $validatedDiscountAmount + $shippingCost);
}
```

---

### Bug 3: Campo `coupon_applies_to` no se enviaba en la orden
**Archivo:** `src/cart/Cart.jsx`

**Problema:** El frontend no enviaba el campo `coupon_applies_to` al crear la orden.

**Fix aplicado:** Agregar al payload:
```javascript
coupon_applies_to: couponValid ? (appliedCoupon.appliesTo || 'total') : null,
```

---

### Bug 4: Campo `max_uses` faltaba en formulario de admin
**Archivos:** `addnew.blade.php`, `edit.blade.php`

**Problema:** El formulario de creación/edición de cupones no tenía el campo para configurar límite de usos.

**Fix aplicado:** Agregar campo `max_uses` con indicador de usos actuales.

---

### Bug 5: Órdenes canceladas bloqueaban reutilización de cupón
**Archivo:** `ControllsController.php`, `RegisteredUserController.php`

**Problema:** La validación de uso único contaba órdenes canceladas.

**Fix aplicado:**
```php
->whereNotIn('status', ['Cancelled', 'Processing Payment', 'Cancelado', 'Procesando pago'])
```

---

## ESTRUCTURA DEL SISTEMA

### Base de Datos (tabla `proposalbatteries`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | bigint | ID único |
| `name` | string | Nombre del cupón |
| `coupon_code` | string(50) | Código único (ej: "LACTEOS15") |
| `discount` | decimal(10,2) | Valor del descuento |
| `discount_type` | enum | 'percentage' o 'fixed' |
| `applies_to` | enum | 'total' o 'shipping' |
| `minimum_amount` | decimal | Monto mínimo requerido |
| `from` / `to` | date | Fechas de validez |
| `max_uses` | int | Límite global de usos (NULL = ilimitado) |
| `current_uses` | int | Usos actuales |
| `is_coupon` | bool | true=cupón, false=promoción auto |
| `benefits` | JSON | Beneficios múltiples (opcional) |

### Flujo de Validación Completo

```
Usuario ingresa código
        ↓
Frontend: CouponInput.jsx
        ↓
POST /api/validate-coupon (ControllsController.php:1667)
        ↓
Backend valida:
  1. ✅ ¿Existe el cupón?
  2. ✅ ¿Es cupón (is_coupon=true)?
  3. ✅ ¿Está activo (fechas from/to)?
  4. ✅ ¿Cumple monto mínimo?
  5. ✅ ¿No ha excedido max_uses?
  6. ✅ ¿Usuario no lo ha usado antes? (excluye canceladas)
        ↓
Retorna datos del cupón (code, discount, type, applies_to, etc.)
        ↓
Frontend aplica descuento localmente (Cart.jsx:getDiscountAmount)
        ↓
Al hacer checkout: Backend RE-VALIDA (RegisteredUserController.php:validateCouponInternal)
        ↓
Si pago exitoso: Webhook incrementa current_uses (ControllsController.php:221)
```

### Cálculo de Descuentos (Frontend)

**Archivo:** `Cart.jsx:423-448`

```javascript
const getDiscountAmount = () => {
  if (!appliedCoupon) return 0;

  const subtotalForCoupon = getSubtotalForCoupons();

  // Validar monto mínimo
  if (subtotalForCoupon < appliedCoupon.minAmount) return 0;

  // Determinar base según applies_to
  const appliesTo = appliedCoupon.appliesTo || 'total';
  const baseAmount = appliesTo === 'shipping' ? shippingCost : subtotalForCoupon;

  // Calcular descuento
  let discountAmount = 0;
  if (appliedCoupon.type === 'percentage') {
    discountAmount = (baseAmount * appliedCoupon.discount) / 100;
  } else {
    discountAmount = appliedCoupon.discount;
  }

  // Protección: no exceder base
  return Math.min(discountAmount, baseAmount);
};
```

---

## VERIFICACIÓN COMPLETADA ✅

### Backend
- [x] Validación de existencia de cupón
- [x] Validación de fechas de vigencia
- [x] Validación de monto mínimo
- [x] Validación de límite global de usos (`max_uses`)
- [x] Validación de uso único por usuario (excluyendo canceladas)
- [x] Incremento de `current_uses` en webhook Stripe (con protección anti-duplicados)
- [x] Incremento de `current_uses` para órdenes gratuitas
- [x] Re-validación de cupón al procesar orden
- [x] Campo `applies_to` correctamente procesado en cálculo de total
- [x] Campo `max_uses` guardado en create/update

### Frontend
- [x] Componente CouponInput envía email de usuario para tracking
- [x] Campo `coupon_applies_to` enviado en payload de orden
- [x] Cálculo de descuento respeta `applies_to`
- [x] Cálculo de envío usa subtotal ORIGINAL (no afectado por cupón)
- [x] Monitoreo dinámico de validez de cupón al cambiar carrito

### Admin
- [x] Formulario de creación tiene campo `max_uses`
- [x] Formulario de edición tiene campo `max_uses`
- [x] Indicador de usos actuales visible en edición

---

## ARCHIVOS MODIFICADOS

| Archivo | Cambios |
|---------|---------|
| `FAMAC/src/cart/Cart.jsx` | 5 fixes de cálculo de envío + coupon_applies_to en payload |
| `Backend2026/Controllers/Auth/RegisteredUserController.php` | Fix recalculatedTotal para applies_to + exclusión de canceladas |
| `Backend2026/Controllers/ControllsController.php` | max_uses en validación/guardado + exclusión de canceladas |
| `Backend2026/views/admin/proposalbattery/addnew.blade.php` | Campo max_uses agregado |
| `Backend2026/views/admin/proposalbattery/edit.blade.php` | Campo max_uses + indicador de usos + info en Estado Actual |

---

## PRÓXIMOS PASOS

1. ⬜ Subir cambios al servidor de producción
2. ⬜ Probar creación de cupón nuevo con todas las opciones
3. ⬜ Probar cupón con limite de usos
4. ⬜ Probar cupón de tipo envío
5. ⬜ Probar cupón de tipo total

---

*Auditoría completada - 2026-02-09*
