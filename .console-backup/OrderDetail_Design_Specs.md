# Especificaciones de Diseño - OrderDetail
*Documentación para replicar el diseño en emails y otras implementaciones*

## 🎨 **Paleta de Colores Principal**

### Colores Base
- **Background Principal**: `#F2EFE4` (Beige claro)
- **Background Cards**: `#FFF` (Blanco)
- **Texto Principal**: `#2F2F2F` (Gris oscuro)
- **Texto Secundario**: `#666` / `#6C757D` (Gris medio)
- **Color de Marca**: `#8B5E3C` (Marrón tierra)
- **Color de Acento**: `#D27F27` (Naranja)

### Colores de Estado
- **Verde Éxito**: `#33A744` / `#4CAF50`
- **Azul Información**: `#2196F3`
- **Naranja Advertencia**: `#FF9800`
- **Rojo Error**: `#E63946`

## 📝 **Tipografía**

### Jerarquía de Fuentes
- **Header Principal**: `fonts.bold`, `fonts.size.XL` (30px), `#2F2F2F`
- **Títulos de Sección**: `fonts.bold`, `fonts.size.medium`, `#8B5E3C`
- **Títulos de Estado**: `fonts.bold`, `fonts.size.large`, colores según estado
- **Texto Normal**: `fonts.regular`, `fonts.size.medium`, `#2F2F2F`
- **Texto Secundario**: `fonts.regular`, `fonts.size.small`, `#666`
- **IDs/Números**: `fonts.numeric` + `letterSpacing: 0.5`
- **Precios**: `fonts.priceBold`

### Colores de Texto por Tipo
- **IDs de Orden**: `#D27F27`
- **Precios**: `#33A744` (total), `#D27F27` (items), `#28A745` (descuentos)
- **Estados de Pago**:
  - Pendiente: `#FF9800`
  - Completado: `#33A744`
  - Fallido: `#E63946`

## 📦 **Estructura de Layout**

### Container Principal
```css
background-color: #F2EFE4
padding: 16px
```

### Header
```css
background-color: #FFF
flexDirection: row
alignItems: center
paddingHorizontal: 16px
paddingVertical: 12px
shadowColor: #000
shadowOpacity: 0.05
shadowRadius: 4px
elevation: 2
```

### Cards/Secciones
```css
background-color: #FFF
padding: 16px
borderRadius: 12px
marginBottom: 16px
shadowColor: #000
shadowOpacity: 0.05
shadowRadius: 4px
elevation: 2
```

## 📋 **Componentes Específicos**

### 1. **Header con Orden ID**
```css
/* Container */
flexDirection: row
justifyContent: space-between
alignItems: center
marginBottom: 8px

/* Orden ID */
fontSize: fonts.size.medium
fontFamily: fonts.numeric
color: #D27F27
letterSpacing: 0.5

/* Estado */
fontSize: fonts.size.medium
color: #2F2F2F
```

### 2. **Lista de Productos**
```css
/* Item Row */
flexDirection: row
alignItems: center
marginBottom: 12px

/* Imagen */
width: 50px
height: 50px
borderRadius: 8px
marginRight: 12px

/* Precio Item */
fontFamily: fonts.priceBold
fontSize: fonts.size.small
color: #D27F27
```

### 3. **Desglose de Precios**
```css
/* Container */
marginTop: 16px
backgroundColor: #F8F9FA
borderRadius: 8px
padding: 12px

/* Row */
flexDirection: row
justifyContent: space-between
paddingVertical: 6px

/* Total Row */
borderTopWidth: 1px
borderTopColor: #DEE2E6
marginTop: 8px
paddingTop: 12px

/* Total Value */
fontFamily: fonts.priceBold
fontSize: fonts.size.medium
color: #33A744
```

### 4. **Información de Entrega**
```css
/* Container */
backgroundColor: #F8F9FA
borderRadius: 8px
padding: 12px

/* Row */
flexDirection: row
justifyContent: space-between
alignItems: flex-start
paddingVertical: 8px
borderBottomWidth: 1px
borderBottomColor: #E9ECEF

/* Label Container */
flexDirection: row
alignItems: center
flex: 1
marginRight: 12px

/* Iconos por Tipo */
- Cliente: "person-outline", #2196F3
- Conductor: "car-outline", #D27F27
- Fecha: "calendar-outline", #33A744
- Horario: "time-outline", #D27F27
- Dirección: "location-outline", #8B5E3C
```

## 🎯 **Estados de Pedido (Cards)**

### Estructura Base para Estados
```css
backgroundColor: #FFF
borderRadius: 16px
padding: 32px
margin: 16px
alignItems: center
shadowColor: #000
shadowOpacity: 0.08
shadowRadius: 8px
elevation: 4
```

### 1. **Pedido Entregado**
- **Icono**: `checkmark-circle`, size: 60, color: `#4CAF50`
- **Título**: `fonts.bold`, `fonts.size.xlarge`, `#4CAF50`
- **Mensaje**: `fonts.regular`, `fonts.size.medium`, `#666`

### 2. **Pago Pendiente**
- **Icono**: `card-outline`, size: 50, color: `#2196F3`
- **Título**: `fonts.bold`, `fonts.size.large`, `#2196F3`

### 3. **OXXO Pendiente**
- **Icono**: `receipt-outline`, size: 50, color: `#FF9800`
- **Título**: `fonts.bold`, `fonts.size.large`, `#FF9800`

### 4. **Pedido Confirmado**
- **Icono**: `checkmark-outline`, size: 50, color: `#4CAF50`
- **Título**: `fonts.bold`, `fonts.size.large`, `#4CAF50`

### 5. **Repartidor Asignado**
- **Icono**: `person-outline`, size: 50, color: `#FF9800`
- **Título**: `fonts.bold`, `fonts.size.large`, `#FF9800`

## 🔘 **Botones**

### Botón Principal (Atención al Cliente)
```css
backgroundColor: #33A744
paddingVertical: 16px
paddingHorizontal: 20px
borderRadius: 12px
alignItems: center
marginTop: 16px
shadowColor: #000
shadowOpacity: 0.1
shadowRadius: 4px
elevation: 3

/* Texto */
fontFamily: fonts.bold
fontSize: fonts.size.medium
color: #FFF
```

### Botón Secundario (Modal Cancelar)
```css
backgroundColor: #FFF
borderWidth: 1px
borderColor: #8B5E3C
paddingVertical: 12px
borderRadius: 8px
alignItems: center

/* Texto */
fontFamily: fonts.bold
fontSize: fonts.size.medium
color: #8B5E3C
```

## 📱 **Modal de Soporte**

### Container
```css
backgroundColor: rgba(0, 0, 0, 0.5)
justifyContent: center
alignItems: center
```

### Content
```css
backgroundColor: #FFF
borderRadius: 16px
padding: 24px
shadowColor: #000
shadowOpacity: 0.25
shadowRadius: 8px
elevation: 5
width: 90%
maxHeight: 80%
```

### Input/TextArea
```css
borderWidth: 1px
borderColor: #8B5E3C
borderRadius: 8px
paddingHorizontal: 12px
paddingVertical: 12px
fontFamily: fonts.regular
fontSize: fonts.size.medium
backgroundColor: #FFF
```

### Order Info Box
```css
backgroundColor: #F2EFE4
borderRadius: 8px
padding: 12px
borderWidth: 1px
borderColor: #8B5E3C
```

## 📐 **Espaciados y Dimensiones**

### Márgenes/Padding Estándar
- **Container**: `16px`
- **Cards**: `16px` padding, `16px` marginBottom
- **Secciones**: `8px-12px` entre elementos
- **Estados**: `32px` padding, `20px` marginBottom para iconos

### Border Radius
- **Cards**: `12px`
- **Estados**: `16px`
- **Botones**: `8px-12px`
- **Inputs**: `8px`

### Sombras
```css
/* Sombra Suave */
shadowColor: #000
shadowOpacity: 0.05
shadowRadius: 4px
shadowOffset: { width: 0, height: 2 }
elevation: 2

/* Sombra Media */
shadowColor: #000
shadowOpacity: 0.08
shadowRadius: 8px
shadowOffset: { width: 0, height: 4 }
elevation: 4

/* Sombra Modal */
shadowColor: #000
shadowOpacity: 0.25
shadowRadius: 8px
shadowOffset: { width: 0, height: 4 }
elevation: 5
```

## 🏷️ **Sistema de Iconos**

### Iconos por Categoría
- **Estados**: `checkmark-circle`, `card-outline`, `receipt-outline`, `person-outline`
- **Información**: `person-outline`, `car-outline`, `calendar-outline`, `time-outline`, `location-outline`
- **Navegación**: `arrow-back`
- **Acciones**: `checkmark-circle` (enviar)

### Tamaños de Iconos
- **Header**: 24px
- **Estado Large**: 50px-60px
- **Info Items**: 16px
- **Navegación**: 24px

## 📧 **Adaptación para Email**

### Consideraciones HTML/CSS
1. **Usar tablas** en lugar de flexbox para compatibilidad
2. **Inline styles** en lugar de CSS externo
3. **Colores hexadecimales** siempre especificados
4. **Web fonts fallbacks**: Arial, sans-serif
5. **Dimensiones fijas** en lugar de flex para cards
6. **Border-radius limitado** (algunos clientes no soportan)

### Estructura Recomendada para Email
```html
<table width="100%" style="background-color: #F2EFE4; padding: 16px;">
  <!-- Header -->
  <tr>
    <td style="background-color: #FFF; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
      <!-- Order Info -->
    </td>
  </tr>
  <!-- Items -->
  <tr>
    <td style="background-color: #FFF; padding: 16px; border-radius: 12px;">
      <!-- Product List -->
    </td>
  </tr>
  <!-- Status -->
  <tr>
    <td style="background-color: #FFF; padding: 32px; text-align: center; border-radius: 16px;">
      <!-- Estado del pedido -->
    </td>
  </tr>
</table>
```

---

*Documento generado a partir del diseño de OrderDetail.jsx*
*Fecha: $(date)*
*Versión: 1.0*