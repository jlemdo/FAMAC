# 🎫 Sistema de Cupones - Especificación Backend

## 📋 Resumen
Sistema de cupones de descuento que permite a los usuarios aplicar códigos promocionales para obtener descuentos en sus pedidos.

---

## 🗃️ **Estructura de Base de Datos**

### Tabla: `coupons`
```sql
CREATE TABLE coupons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,           -- Código del cupón (ej: 'queso25')
  description VARCHAR(255) NOT NULL,          -- Descripción (ej: '25% de descuento')
  discount_type ENUM('percentage', 'fixed') NOT NULL, -- Tipo de descuento
  discount_value DECIMAL(10,2) NOT NULL,      -- Valor del descuento (25 para 25%, o 50 para $50)
  min_amount DECIMAL(10,2) DEFAULT 0,         -- Monto mínimo requerido
  max_discount DECIMAL(10,2) NULL,            -- Descuento máximo (solo para porcentajes)
  usage_limit INT DEFAULT NULL,               -- Límite de usos (NULL = ilimitado)
  used_count INT DEFAULT 0,                   -- Cantidad de veces usado
  valid_from DATETIME NOT NULL,               -- Fecha de inicio
  valid_until DATETIME NOT NULL,              -- Fecha de vencimiento
  is_active BOOLEAN DEFAULT TRUE,             -- Estado activo/inactivo
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Tabla: `coupon_usage` (Opcional - para trackear uso por usuario)
```sql
CREATE TABLE coupon_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,          -- Email del usuario (Guest o registrado)
  order_id INT NULL,                         -- ID del pedido donde se usó
  discount_amount DECIMAL(10,2) NOT NULL,    -- Monto del descuento aplicado
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  INDEX idx_coupon_user (coupon_id, user_email)
);
```

---

## 🛠️ **Endpoints Requeridos**

### 1. **Validar Cupón**
```
POST /api/coupons/validate
```

**Request Body:**
```json
{
  "code": "queso25",
  "subtotal": 250.00,
  "user_email": "user@example.com" // Para validar límites por usuario
}
```

**Response Exitosa (200):**
```json
{
  "success": true,
  "coupon": {
    "id": 1,
    "code": "queso25",
    "description": "25% de descuento",
    "discount_type": "percentage",
    "discount_value": 25,
    "discount_amount": 62.50,  // Calculado: 250 * 0.25 = 62.50
    "min_amount": 100
  },
  "message": "Cupón válido"
}
```

**Response de Error (400/404):**
```json
{
  "success": false,
  "error": "INVALID_COUPON",
  "message": "Cupón no válido o vencido"
}
```

**Posibles Errores:**
- `COUPON_NOT_FOUND` - Cupón no existe
- `COUPON_EXPIRED` - Cupón vencido
- `COUPON_INACTIVE` - Cupón desactivado
- `MIN_AMOUNT_NOT_MET` - No cumple monto mínimo
- `USAGE_LIMIT_EXCEEDED` - Límite de uso superado
- `USER_ALREADY_USED` - Usuario ya usó este cupón (si aplica)

### 2. **Aplicar Cupón en Orden** (Cuando se hace el pago)
```
POST /api/coupons/apply
```

**Request Body:**
```json
{
  "coupon_code": "queso25",
  "order_id": 123,
  "user_email": "user@example.com",
  "subtotal": 250.00,
  "discount_amount": 62.50
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cupón aplicado correctamente"
}
```

---

## 🧮 **Lógica de Cálculo de Descuentos**

### Descuento Porcentual
```php
$discount_amount = ($subtotal * $coupon->discount_value) / 100;

// Si hay límite máximo
if ($coupon->max_discount && $discount_amount > $coupon->max_discount) {
    $discount_amount = $coupon->max_discount;
}
```

### Descuento Fijo
```php
$discount_amount = min($coupon->discount_value, $subtotal);
// No puede ser mayor al subtotal
```

---

## ✅ **Validaciones Requeridas**

1. **Cupón Existe**: El código existe en la base de datos
2. **Activo**: `is_active = TRUE`
3. **Vigencia**: Fecha actual entre `valid_from` y `valid_until`
4. **Monto Mínimo**: `subtotal >= min_amount`
5. **Límite de Uso**: `used_count < usage_limit` (si no es NULL)
6. **Uso por Usuario**: Verificar en `coupon_usage` si el usuario ya lo usó (opcional)

---

## 📊 **Modificaciones en Tabla de Órdenes**

### Agregar campos a tabla `orders`:
```sql
ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) NULL;
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN original_total DECIMAL(10,2) NULL; -- Total antes del descuento
```

---

## 🎯 **Cupones de Prueba Iniciales**

```sql
INSERT INTO coupons (code, description, discount_type, discount_value, min_amount, valid_from, valid_until) VALUES
('queso25', '25% de descuento', 'percentage', 25.00, 100.00, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR)),
('envio50', '$50 de descuento', 'fixed', 50.00, 200.00, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR)),
('bienvenido10', '10% de descuento de bienvenida', 'percentage', 10.00, 0.00, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR));
```

---

## 📱 **Frontend Implementation Status**

### ✅ **Completado:**
- ✅ Componente `CouponInput` creado
- ✅ Integración en `Cart.jsx`
- ✅ Estados de cupón aplicado (`appliedCoupon`)
- ✅ Cálculos de descuento frontend
- ✅ Actualización de totales en tiempo real
- ✅ UI/UX completa con validación visual
- ✅ Cupones de prueba funcionales

### 🔄 **Pendiente (requiere backend):**
- ❌ Validación de cupones real via API
- ❌ Aplicación de descuento en proceso de pago
- ❌ Historial de cupones usados
- ❌ Administración de cupones

---

## 🔄 **Flujo Completo**

### Frontend a Backend:
1. **Usuario ingresa código** → Frontend valida formato
2. **Frontend llama** → `POST /api/coupons/validate`
3. **Backend valida** → Reglas de negocio + DB
4. **Backend responde** → Cupón válido/inválido + descuento calculado
5. **Frontend aplica** → Actualiza totales y muestra descuento
6. **Usuario procede al pago** → Frontend incluye cupón en orden
7. **Backend registra uso** → `POST /api/coupons/apply` + actualiza contadores

### Estados del Cupón:
- **Sin cupón**: Estado inicial
- **Validando**: Loading state durante API call
- **Válido**: Cupón aplicado, descuento visible
- **Error**: Mensaje de error específico
- **Aplicado**: Cupón usado exitosamente en orden

---

## 📋 **Testing Checklist**

### Funcionalidad:
- [ ] Validar cupón existente
- [ ] Rechazar cupón inexistente
- [ ] Verificar fechas de vigencia
- [ ] Validar monto mínimo
- [ ] Calcular descuento porcentual
- [ ] Calcular descuento fijo
- [ ] Aplicar límite máximo de descuento
- [ ] Verificar límite de uso
- [ ] Registrar uso correctamente
- [ ] Actualizar contadores

### Edge Cases:
- [ ] Cupón con descuento mayor al subtotal
- [ ] Múltiples intentos del mismo usuario
- [ ] Cupones vencidos
- [ ] Cupones desactivados
- [ ] Descuentos de $0
- [ ] Caracteres especiales en códigos

---

## 💡 **Características Avanzadas (Futuras)**

### Fase 2:
- **Cupones por categoría**: Solo ciertos productos
- **Cupones de envío gratis**: `free_shipping = TRUE`
- **Cupones por usuario**: Códigos únicos generados
- **Cupones por primera compra**: `first_order_only = TRUE`

### Fase 3:
- **Admin panel**: Crear/editar/desactivar cupones
- **Analytics**: Uso de cupones, conversión, revenue impact
- **Cupones automáticos**: Se aplican automáticamente por condiciones
- **Cupones por geolocalización**: Solo ciertas zonas

---

## 🚨 **Notas Importantes**

1. **Seguridad**: Validar cupones SIEMPRE en backend, nunca confiar en frontend
2. **Race Conditions**: Usar transacciones para aplicar cupones y actualizar contadores
3. **Logs**: Registrar todos los intentos de uso (exitosos y fallidos)
4. **Cache**: Considerar cache para cupones válidos frecuentemente usados
5. **Monitoreo**: Alertas si un cupón se usa más de lo esperado

---

**Fecha de Creación**: 2025-08-27  
**Estado**: Frontend completado, Backend pendiente  
**Prioridad**: Media - funcionalidad lista para desarrollo backend