# 🔄 Sistema de Actualizaciones Automáticas - Guía de Instalación

## 📋 Resumen

Este sistema permite que tu app **Sabores de Origen** detecte y descargue automáticamente nuevas versiones sin necesidad de Google Play Store, perfecto mientras obtienes el número DUNS.

## 🛠️ Archivos Creados

### 1. **AutoUpdateService.js** - Servicio Principal
- **Ubicación**: `src/services/AutoUpdateService.js`
- **Función**: Núcleo del sistema de actualizaciones
- **Características**:
  - ✅ Verificación automática cada 24 horas
  - ✅ Comparación inteligente de versiones
  - ✅ Descarga directa de APK
  - ✅ Manejo de actualizaciones críticas
  - ✅ Reintentos automáticos en caso de error

### 2. **useAutoUpdate.js** - Hook React
- **Ubicación**: `src/hooks/useAutoUpdate.js`
- **Función**: Hook personalizado para componentes React
- **Uso**: Integra fácilmente el sistema en cualquier pantalla

### 3. **UpdateButton.jsx** - Componente UI
- **Ubicación**: `src/components/UpdateButton.jsx`
- **Función**: Botón para verificación manual
- **Características**:
  - ✅ Indicador visual de nuevas versiones
  - ✅ Badge de alerta para actualizaciones críticas
  - ✅ Estados de carga y información de versión

### 4. **app-version-endpoint.php** - Backend API
- **Ubicación**: `backend-api/app-version-endpoint.php`
- **Función**: Endpoint que proporciona información de versiones
- **Debe alojarse en tu servidor web**

## 🚀 Pasos de Instalación

### **Paso 1: Integrar en tu App Principal**

Edita tu `App.jsx` o archivo principal:

```javascript
import AutoUpdateService from './src/services/AutoUpdateService';

export default function App() {
  useEffect(() => {
    // Inicializar sistema de actualizaciones
    AutoUpdateService.initialize();
  }, []);

  // ... resto de tu app
}
```

### **Paso 2: Agregar Botón en Configuración/Perfil**

En tu pantalla de perfil o configuración:

```javascript
import UpdateButton from '../components/UpdateButton';

// Dentro de tu componente:
<UpdateButton />
```

### **Paso 3: Configurar Backend**

1. **Sube el archivo PHP** a tu servidor:
   ```
   https://tu-dominio.com/api/app-version-endpoint.php
   ```

2. **Configura la URL** en `AutoUpdateService.js`:
   ```javascript
   const UPDATE_CONFIG = {
     VERSION_CHECK_URL: 'https://tu-dominio.com/api/app-version',
     APK_DOWNLOAD_URL: 'https://tu-dominio.com/downloads/sabores-de-origen-latest.apk',
     // ...
   };
   ```

### **Paso 4: Configurar Servidor Web**

Si usas Apache, crea/edita `.htaccess`:
```apache
RewriteEngine On
RewriteRule ^api/app-version$ app-version-endpoint.php [QSA,L]
```

Si usas Nginx:
```nginx
location /api/app-version {
    try_files $uri $uri/ /app-version-endpoint.php?$query_string;
}
```

## 📱 Cómo Funciona

### **Flujo Automático:**
1. **Al abrir la app** → Verifica nuevas versiones
2. **Cada 24 horas** → Verificación en background
3. **Nueva versión detectada** → Muestra modal al usuario
4. **Usuario acepta** → Descarga APK automáticamente
5. **Descarga completa** → Usuario instala desde notificaciones

### **Flujo Manual:**
1. **Usuario va a Configuración** → Ve botón "Buscar actualizaciones"
2. **Clic en botón** → Verificación inmediata
3. **Si hay actualización** → Muestra información y permite descargar

## 🎯 Configuración de Versiones

### **Actualizar Versión en el Código:**
```javascript
// En AutoUpdateService.js
const UPDATE_CONFIG = {
  CURRENT_VERSION: '1.1.0', // ← Cambiar aquí
  // ...
};
```

### **Actualizar Versión en Backend:**
```php
// En app-version-endpoint.php
$appVersions = [
    'android' => [
        'latest_version' => '1.1.0', // ← Nueva versión
        'download_url' => 'https://tu-dominio.com/downloads/app-v1.1.0.apk',
        'release_notes' => 'Nuevas funciones...',
        // ...
    ]
];
```

## 📦 Preparar APK para Distribución

### **1. Generar APK de Producción:**
```bash
cd android
./gradlew assembleRelease
```

### **2. Subir APK a tu Servidor:**
```
https://tu-dominio.com/downloads/
├── sabores-de-origen-latest.apk  (siempre la última versión)
├── sabores-de-origen-v1.0.0.apk
├── sabores-de-origen-v1.1.0.apk
└── ...
```

### **3. Actualizar Enlaces:**
- Actualiza `download_url` en el PHP
- Asegúrate de que el APK sea accesible públicamente

## 🔐 Permisos Android Necesarios

Agrega en `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Para descargar actualizaciones -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- Para instalar APKs (Android 8.0+) -->
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

## ⚠️ Consideraciones Importantes

### **Seguridad:**
- ✅ Usa HTTPS para todas las URLs
- ✅ Valida checksums de APKs (implementado en el código)
- ✅ Considera firmado de APKs para verificación

### **Usuario:**
- ✅ Instrucciones claras para "Instalar apps desconocidas"
- ✅ Modals informativos sobre el proceso
- ✅ No hacer actualizaciones críticas muy frecuentes

### **Servidor:**
- ✅ Asegúrate de tener suficiente ancho de banda
- ✅ Configurar cache apropiado para APKs
- ✅ Monitorear logs de descargas

## 🧪 Testing

### **Probar el Sistema:**
1. **Cambiar versión actual** a una menor (ej: '0.9.0')
2. **Abrir la app** → Debería detectar actualización
3. **Probar descarga** → Verificar que funcione el flujo completo
4. **Restaurar versión** correcta

### **Probar Actualizaciones Críticas:**
```php
// En el PHP, cambiar:
$criticalUpdates = [
    '1.0.0' => true,  // Marcar como crítica
];
```

## 📈 Analytics y Monitoreo

### **Logs Útiles:**
- Verificaciones de actualización
- Descargas exitosas/fallidas
- Versiones de usuarios activos
- Errores de instalación

### **Métricas Recomendadas:**
- % usuarios con última versión
- Tiempo promedio de adopción
- Errores más comunes

## 🎉 ¡Listo!

Tu app ahora tiene un **sistema completo de actualizaciones automáticas** que:

- ✅ **No depende de Google Play Store**
- ✅ **Funciona automáticamente** en background
- ✅ **Permite actualizaciones críticas** inmediatas
- ✅ **Experiencia de usuario simple** y clara
- ✅ **Control total** sobre el proceso de distribución

### **¿Necesitas Ayuda?**
- Revisa los logs en la consola de React Native
- Verifica que el endpoint PHP responda correctamente
- Asegúrate de que el APK sea accesible públicamente
- Testea con diferentes versiones para validar el flujo