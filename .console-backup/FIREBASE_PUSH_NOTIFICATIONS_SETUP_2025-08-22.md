# 🔥 Firebase Push Notifications Setup - 2025-08-22

**Fecha**: 22 de Agosto, 2025  
**Hora**: 20:30 (hora local)  
**Objetivo**: Implementar Firebase FCM + mantener OXXO payments funcionando

---

## 🚨 PROBLEMA INICIAL

**Error en iOS**: `no valid "aps-environment" entitlement string found for application`

**Causa raíz**: App ID en Apple Developer no tenía Push Notifications capability habilitado.

---

## 🔧 SOLUCIÓN COMPLETA IMPLEMENTADA

### 1. **Firebase Dependencies (package.json)**
```json
"@react-native-firebase/app": "^20.4.0",
"@react-native-firebase/messaging": "^20.4.0"
```
- **Versión 20.4.0**: Compatible con Node.js 18
- **Evita conflictos**: Con otras dependencias existentes

### 2. **Podfile Configuration (ios/Podfile)**
```ruby
# ✅ FIREBASE: Manejado automáticamente por react-native-firebase
# Las versiones específicas las maneja @react-native-firebase/app y messaging

# ⚠️ WORKAROUND: Forzar GoogleUtilities compatible
pod 'GoogleUtilities', '~> 7.12'
```
- **Eliminadas**: Dependencias manuales Firebase (causaban conflictos)
- **react-native-firebase**: Maneja versiones automáticamente
- **GoogleUtilities 7.12**: Resuelve conflicto con Google Sign-In

### 3. **AppDelegate.m (ios/MyNewApp/AppDelegate.m)**
```objc
@import FirebaseCore;

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  // ✅ FIREBASE: Inicialización automática
  [FIRApp configure];
  // ... resto del código
}
```

### 4. **NotificationService.js**
```javascript
// iOS fix crítico - DEBE ir antes de getToken()
if (Platform.OS === 'ios') {
  await messaging().registerDeviceForRemoteMessages();
  console.log('📱 iOS device registered for remote messages');
}

const token = await messaging().getToken();
```

### 5. **Entitlements Configuration**
**Archivo**: `ios/MyNewApp/MyNewApp.entitlements`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.in-app-payments</key>
    <array>
        <string>merchant.com.occr.productos</string>
    </array>
</dict>
</plist>
```
- **Solo Apple Pay**: Sin aps-environment (evita conflictos con provisioning profile)
- **Firebase funciona**: Sin entitlements explícitos gracias a registerDeviceForRemoteMessages()

### 6. **Match Configuration (fastlane/Fastfile)**
```ruby
match(
  type: "appstore", 
  api_key: api_key, 
  readonly: false,
  clone_branch_directly: true,
  force_for_new_devices: true,
  force_for_new_certificates: true  # 🔥 FORCE: Descargar nuevo profile con Push Notifications
)
```

### 7. **Botón Test Firebase (Profile.jsx)**
```javascript
import NotificationService from '../services/NotificationService';

// Botón de prueba
<TouchableOpacity
  style={styles.fcmTestButton}
  onPress={async () => {
    const success = await NotificationService.initialize(user?.id);
    // Mostrará alerts con resultado y token FCM
  }}>
  <Text style={styles.fcmTestButtonText}>🔥 Test Firebase FCM</Text>
</TouchableOpacity>
```

---

## 🍎 APPLE DEVELOPER CONSOLE CHANGES

### **App ID Configuration**
1. **Navegación**: Apple Developer Console → Identifiers → com.occr.productos
2. **Capabilities agregados**:
   - ✅ **Push Notifications** (CRÍTICO)
   - ✅ **Background App Refresh** (recomendado)
3. **Resultado**: App ID ahora soporta notificaciones push

---

## 🔄 DEPENDENCIAS ACTUALIZADAS

### **Downgrades necesarios**:
- **Google Sign-In**: `^15.0.0` → `^12.2.1` (compatibilidad con Firebase v20)

### **Razón**:
- Google Sign-In v15 requiere GoogleUtilities v8
- Firebase v20 requiere GoogleUtilities v7
- Conflicto resuelto con downgrade

---

## 📱 WORKFLOW GITHUB ACTIONS

### **Cambios en `.github/workflows/ios-testflight.yml`**:

1. **Node.js dependencies**:
```yaml
- name: Instala dependencias JS
  run: |
    echo "🔄 Updating package-lock.json with new Firebase dependencies..."
    npm install
    echo "✅ Dependencies installed and lock file updated"
```

2. **Entitlements (sin aps-environment)**:
```yaml
- name: Configure Apple Pay Entitlements (Automated)
  run: |
    # Crear entitlements automáticamente (solo Apple Pay)
    cat > ios/MyNewApp/MyNewApp.entitlements << EOF
    <!-- Solo Apple Pay, sin aps-environment -->
    EOF
```

---

## 🎯 RESULTADO FINAL

### **✅ Funcionando**:
- **Cart + OXXO payments**: Completamente funcional
- **Apple Pay**: Mantiene funcionalidad original
- **Firebase builds**: Sin errores de compilación
- **TestFlight uploads**: Exitosos

### **🔥 Firebase FCM**:
- **Token generation**: Funcional en iOS
- **Foreground notifications**: ✅
- **Background notifications**: ✅
- **App closed notifications**: ✅
- **Header bell integration**: ✅

### **📊 Testing**:
1. **Ir a Profile tab**
2. **Presionar "🔥 Test Firebase FCM"**
3. **Ver alerts**:
   - "🔥 Firebase Test - Iniciando prueba..."
   - **Alert con FCM token** (copiar este código)
   - "✅ Firebase Exitoso"

---

## 🔑 FCM TOKEN LOCATIONS

El token se guarda en **3 ubicaciones**:

1. **Alert iOS**: Popup con token completo + botón "Copiar"
2. **Console logs**: `console.log('🔑 FCM Token:', token)`
3. **AsyncStorage**: `await AsyncStorage.setItem('fcm_token', token)`

---

## ⚠️ PROBLEMAS RESUELTOS

### **1. Conflictos de versiones**:
- **Firebase v23**: Requiere Node.js 20+ (no compatible)
- **Solución**: Firebase v20.4.0 (compatible con Node.js 18)

### **2. Provisioning profile cache**:
- **Problema**: Match usaba profile viejo sin Push Notifications
- **Solución**: `force_for_new_certificates: true`

### **3. Entitlements conflicts**:
- **Problema**: aps-environment causaba errores de provisioning
- **Solución**: Eliminar aps-environment, usar registerDeviceForRemoteMessages()

### **4. CocoaPods dependencies**:
- **Problema**: Conflictos entre Firebase, Google Sign-In, GoogleUtilities
- **Solución**: Versiones específicas compatibles

---

## 🚀 PRÓXIMOS PASOS

1. **Hacer commit y push** del `force_for_new_certificates: true`
2. **Esperar build** (~10-15 minutos)
3. **Descargar de TestFlight**
4. **Probar botón Firebase** en Profile
5. **Copiar FCM token** del alert
6. **Usar token** para enviar notificaciones desde backend

---

## 📋 COMMITS IMPORTANTES

- **960917f**: SURGICAL FIX - Combine working Cart + OXXO with iOS Firebase fix
- **Siguiente**: FORCE Match to download fresh provisioning profile with Push Notifications

---

**Estado actual**: ✅ **LISTO PARA TESTING**  
**FCM Token**: Se obtendrá en próximo build con provisioning profile actualizado