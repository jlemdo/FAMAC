# WebSockets Frontend - React Native

## Fecha: 2026-02-14
## App: Sabores de Origen (React Native 0.79.1)

---

## Instalación

```bash
cd D:\OCCRPRODUCTOS\Occr_Prodcutos_App\Desarrollo\FAMAC
npm install
# o
yarn install
```

La dependencia `pusher-js` ya está agregada en `package.json`.

---

## Archivos Creados

### 1. `src/services/WebSocketService.js`

Servicio singleton que maneja toda la conexión con Pusher.

**Métodos principales:**
```javascript
import webSocketService from './services/WebSocketService';

// Conectar
await webSocketService.connect();

// Suscribirse a ubicación del driver
webSocketService.subscribeToDriverLocation(orderId, (data) => {
  console.log('Nueva ubicación:', data.driverLat, data.driverLong);
});

// Suscribirse a mensajes de chat
webSocketService.subscribeToChatMessages(orderId, (data) => {
  console.log('Nuevo mensaje:', data.message);
});

// Suscribirse a actualizaciones de órdenes
webSocketService.subscribeToOrdersList('user', userId, (data) => {
  console.log('Acción:', data.action); // 'new_order', 'status_changed', etc.
});

// Desconectar
webSocketService.disconnect();
```

### 2. `src/hooks/useWebSocket.js`

Hooks React para usar fácilmente en componentes.

**Hooks disponibles:**

```javascript
import {
  useDriverLocation,
  useChatMessages,
  useOrderStatus,
  useOrdersListUpdate,
  useAccountDeleted,
  useWebSocketConnection
} from '../hooks/useWebSocket';

// En un componente:
function MyComponent({ orderId }) {
  // Ubicación del driver
  useDriverLocation(orderId, (data) => {
    setDriverLocation({
      lat: data.driverLat,
      long: data.driverLong
    });
  });

  // Mensajes de chat
  useChatMessages(orderId, (data) => {
    setMessages(prev => [...prev, data]);
  });

  // Estado de conexión
  const isConnected = useWebSocketConnection();
}
```

---

## Archivos Modificados

### 1. `src/config/environment.js`

**Cambio:** Agregada configuración de Pusher

```javascript
// Agregado al final:
export const PUSHER_CONFIG = {
  appKey: '51de76467fd3ab4ed6f3',
  cluster: 'us2',
  encrypted: true,
};
```

### 2. `package.json`

**Cambio:** Agregada dependencia pusher-js

```json
{
  "dependencies": {
    // ... otras dependencias
    "pusher-js": "^8.4.0-rc2"
  }
}
```

### 3. `src/order/driver/CustomerTracking.jsx`

**Cambios:**
- Import del hook `useDriverLocation`
- WebSocket para ubicación en tiempo real
- Fallback polling reducido de 5s a 30s

```javascript
// Agregado import:
import { useDriverLocation } from '../../hooks/useWebSocket';

// Agregado hook:
useDriverLocation(order.id, useCallback((data) => {
  setDriverLocation({
    driver_lat: data.driverLat,
    driver_long: data.driverLong,
  });
  setIsConnected(true);
}, []));

// Fallback polling: 5000 → 30000
const interval = setInterval(fetchDriverLocation, 30000);
```

### 4. `src/order/Chat.jsx`

**Cambios:**
- Import del hook `useChatMessages`
- WebSocket para mensajes en tiempo real
- Fallback polling reducido de 3s a 15s

```javascript
// Agregado import:
import { useChatMessages } from '../hooks/useWebSocket';

// Agregado hook:
useChatMessages(orderId, useCallback((data) => {
  setChatMessages(prev => {
    if (prev.some(msg => msg.id === data.id)) return prev;
    return [...prev, {
      id: data.id,
      sender: data.sender,
      text: data.message,
      // ...
    }];
  });
}, []));

// Fallback polling: 3000 → 15000
msgIntervalRef.current = setInterval(() => {
  fetchMessages();
}, 15000);
```

### 5. `src/context/OrderContext.js`

**Cambios:**
- Imports de WebSocket service y hooks
- WebSocket para actualizaciones de lista/badges
- WebSocket para detectar cuenta eliminada
- Fallback polling reducido (Driver: 5s→30s, User: 15s→60s)

```javascript
// Agregados imports:
import webSocketService from '../services/WebSocketService';
import { useOrdersListUpdate, useAccountDeleted } from '../hooks/useWebSocket';

// Agregados hooks:
useOrdersListUpdate(user, useCallback((data) => {
  fetchRef.current(); // Refrescar órdenes
}, []));

useAccountDeleted(user?.id, useCallback((data) => {
  if (data.forceLogout) {
    Alert.alert('Cuenta eliminada', data.message, [
      { text: 'OK', onPress: () => logoutRef.current() }
    ]);
  }
}, []));

// Conectar WebSocket:
useEffect(() => {
  if (user && user.usertype !== 'Guest') {
    webSocketService.connect();
  }
}, [user?.id]);

// Fallback polling: Driver 5000→30000, User 15000→60000
const refreshInterval = currentUser.usertype === 'driver' ? 30000 : 60000;
```

---

## Flujo de Datos

### Ubicación del Driver

```
Driver App                    Backend                     Customer App
    │                            │                            │
    ├── POST /api/driverlocsubmit ─►│                            │
    │                            │                            │
    │                            ├── broadcast(DriverLocationUpdated)
    │                            │           │                │
    │                            │           └───────────────►│
    │                            │                            │
    │                            │         Canal: order.{id}  │
    │                            │         Evento: driver.location
    │                            │                            │
    │                            │                  setDriverLocation()
```

### Mensajes de Chat

```
Sender                       Backend                      Receiver
    │                            │                            │
    ├── POST /api/msgsubmit ────►│                            │
    │                            │                            │
    │                            ├── broadcast(ChatMessageSent)
    │                            │           │                │
    │                            │           └───────────────►│
    │                            │                            │
    │                            │         Canal: chat.{id}   │
    │                            │         Evento: message.sent
    │                            │                            │
    │                            │                  addMessage()
```

### Actualización de Badges

```
Admin/Sistema                Backend                      App
    │                            │                            │
    ├── Cambio de estado ───────►│                            │
    │                            │                            │
    │                            ├── broadcast(OrdersListUpdated)
    │                            │           │                │
    │                            │           └───────────────►│
    │                            │                            │
    │                            │    Canal: user.{id}.orders │
    │                            │    Evento: orders.updated  │
    │                            │                            │
    │                            │              fetchOrders() │
    │                            │              updateBadge() │
```

---

## Debugging

### Ver logs de WebSocket

Los logs tienen prefijo `[WS]`:
```
[WS] Conectado a Pusher
[WS] Suscrito a canal: order.123
[WS] Orders list update: new_order
```

### Verificar conexión

```javascript
import { useWebSocketConnection } from '../hooks/useWebSocket';

function DebugComponent() {
  const isConnected = useWebSocketConnection();

  return (
    <Text>WebSocket: {isConnected ? 'Conectado' : 'Desconectado'}</Text>
  );
}
```

### Pusher no instalado

Si `pusher-js` no está instalado, el servicio funciona en modo fallback:
- No hay errores críticos
- El polling sigue funcionando normalmente
- Log: `[WS] Pusher no inicializado, usando fallback polling`

---

## Rollback a Polling

Si necesitas desactivar WebSockets temporalmente:

### Opción 1: Aumentar intervalos de polling

En cada archivo, cambiar los intervalos:

```javascript
// CustomerTracking.jsx
const interval = setInterval(fetchDriverLocation, 5000); // Cambiar 30000 → 5000

// Chat.jsx
msgIntervalRef.current = setInterval(() => {
  fetchMessages();
}, 3000); // Cambiar 15000 → 3000

// OrderContext.js
const refreshInterval = currentUser.usertype === 'driver' ? 5000 : 15000; // Cambiar 30000/60000
```

### Opción 2: Comentar hooks de WebSocket

```javascript
// Comentar estas líneas en cada archivo:
// useDriverLocation(...)
// useChatMessages(...)
// useOrdersListUpdate(...)
```

El fallback polling seguirá funcionando automáticamente.

---

## Testing

### 1. Verificar instalación

```bash
cd D:\OCCRPRODUCTOS\Occr_Prodcutos_App\Desarrollo\FAMAC
npm list pusher-js
```

### 2. Probar en desarrollo

1. Cambiar `environment.js` a desarrollo si es necesario
2. Abrir la app en un dispositivo
3. En otro dispositivo/simulador, hacer una acción (enviar mensaje, mover driver)
4. Verificar que el primer dispositivo recibe la actualización en tiempo real

### 3. Verificar en Pusher Dashboard

1. Ir a https://dashboard.pusher.com/apps/2115548/console
2. Ver eventos entrantes en "Debug Console"
3. Verificar que los canales correctos reciben eventos

---

## Estructura de Datos de Eventos

### driver.location
```javascript
{
  order_id: 123,
  driver_lat: 19.4326,
  driver_long: -99.1332,
  distance_meters: 250.5,
  status: 'On the Way',
  status_spanish: 'En camino',
  timestamp: '2026-02-14T10:30:00.000Z'
}
```

### message.sent
```javascript
{
  id: 456,
  order_id: 123,
  sender: 'driver', // o 'customer'
  message: 'Estoy llegando',
  timestamp: '2026-02-14T10:30:00.000Z'
}
```

### order.status
```javascript
{
  order_id: 123,
  order_number: '260214-103000',
  status: 'Delivered',
  status_spanish: 'Entregado',
  timestamp: '2026-02-14T10:30:00.000Z'
}
```

### orders.updated
```javascript
{
  action: 'new_order', // 'status_changed', 'order_assigned'
  user_type: 'customer', // 'driver'
  timestamp: '2026-02-14T10:30:00.000Z'
}
```

### account.deleted
```javascript
{
  user_id: 789,
  message: 'Tu cuenta ha sido eliminada',
  force_logout: true,
  timestamp: '2026-02-14T10:30:00.000Z'
}
```
