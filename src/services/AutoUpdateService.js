/**
 * Servicio de Actualizaciones Automáticas FAMAC
 * Sistema personalizado para detectar y gestionar actualizaciones de la app
 * sin depender de Google Play Store
 */

import { Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Configuración del servicio
const UPDATE_CONFIG = {
  // URL de tu servidor donde alojarás la información de versiones
  VERSION_CHECK_URL: 'https://occr.pixelcrafters.digital/api/app-version',

  // URL donde alojarás los APKs para descarga
  APK_DOWNLOAD_URL: 'https://occr.pixelcrafters.digital/downloads/sabores-de-origen-latest.apk',

  // Intervalo de verificación (en milisegundos)
  CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas

  // Versión actual de la app (deberías obtenerla de package.json o build config)
  CURRENT_VERSION: '1.0.0',

  // Configuración de reintentos
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 segundos
};

class AutoUpdateService {
  constructor() {
    this.isChecking = false;
    this.retryCount = 0;
  }

  /**
   * Verifica si hay una nueva versión disponible
   * @returns {Promise<Object>} Información sobre la actualización
   */
  async checkForUpdates() {
    if (this.isChecking) {
      console.log('🔄 Ya hay una verificación en curso...');
      return null;
    }

    this.isChecking = true;

    try {
      console.log('🔍 Verificando actualizaciones...');

      // Verificar si es momento de revisar actualizaciones
      const shouldCheck = await this.shouldCheckForUpdates();
      if (!shouldCheck) {
        console.log('⏰ Aún no es momento de verificar actualizaciones');
        this.isChecking = false;
        return null;
      }

      // Realizar petición al servidor
      const response = await axios.get(UPDATE_CONFIG.VERSION_CHECK_URL, {
        timeout: 10000,
        headers: {
          'User-Agent': `SaboresDeOrigen/${UPDATE_CONFIG.CURRENT_VERSION} (${Platform.OS})`,
        },
      });

      const updateInfo = response.data;
      console.log('📱 Información de versión recibida:', updateInfo);

      // Guardar timestamp de última verificación
      await AsyncStorage.setItem('lastUpdateCheck', Date.now().toString());

      // Comparar versiones
      const needsUpdate = this.compareVersions(UPDATE_CONFIG.CURRENT_VERSION, updateInfo.latest_version);

      if (needsUpdate) {
        console.log('🆕 Nueva versión disponible!', updateInfo.latest_version);
        return {
          available: true,
          currentVersion: UPDATE_CONFIG.CURRENT_VERSION,
          latestVersion: updateInfo.latest_version,
          downloadUrl: updateInfo.download_url || UPDATE_CONFIG.APK_DOWNLOAD_URL,
          releaseNotes: updateInfo.release_notes || 'Mejoras y correcciones',
          isCritical: updateInfo.is_critical || false,
          minRequiredVersion: updateInfo.min_required_version,
        };
      } else {
        console.log('✅ App está actualizada');
        return { available: false };
      }

    } catch (error) {
      console.error('❌ Error verificando actualizaciones:', error);

      // Implementar reintentos
      if (this.retryCount < UPDATE_CONFIG.MAX_RETRIES) {
        this.retryCount++;
        console.log(`🔄 Reintentando... (${this.retryCount}/${UPDATE_CONFIG.MAX_RETRIES})`);

        setTimeout(() => {
          this.checkForUpdates();
        }, UPDATE_CONFIG.RETRY_DELAY);
      }

      return null;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Determina si es momento de verificar actualizaciones
   * @returns {Promise<boolean>}
   */
  async shouldCheckForUpdates() {
    try {
      const lastCheck = await AsyncStorage.getItem('lastUpdateCheck');
      if (!lastCheck) return true;

      const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
      return timeSinceLastCheck > UPDATE_CONFIG.CHECK_INTERVAL;
    } catch (error) {
      console.error('Error verificando timestamp:', error);
      return true; // Si hay error, mejor verificar
    }
  }

  /**
   * Compara dos versiones y determina si necesita actualización
   * @param {string} current - Versión actual
   * @param {string} latest - Versión más reciente
   * @returns {boolean} true si necesita actualización
   */
  compareVersions(current, latest) {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;

      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }

    return false;
  }

  /**
   * Muestra modal de actualización al usuario (solo Android)
   * @param {Object} updateInfo - Información de la actualización
   */
  showUpdateModal(updateInfo) {
    // Solo mostrar alertas en Android
    if (Platform.OS !== 'android') {
      console.log('iOS detectado - actualizaciones automáticas deshabilitadas');
      return;
    }
    const title = updateInfo.isCritical ? '🚨 Actualización Crítica' : '🆕 Nueva Versión Disponible';
    const message = `
Versión actual: ${updateInfo.currentVersion}
Nueva versión: ${updateInfo.latestVersion}

${updateInfo.releaseNotes}

${updateInfo.isCritical ?
  '⚠️ Esta actualización es crítica para el funcionamiento de la app.' :
  '¿Te gustaría actualizar ahora?'
}`;

    const buttons = updateInfo.isCritical ?
      [
        { text: 'Actualizar Ahora', onPress: () => this.downloadUpdate(updateInfo.downloadUrl) }
      ] :
      [
        { text: 'Más tarde', style: 'cancel' },
        { text: 'Actualizar', onPress: () => this.downloadUpdate(updateInfo.downloadUrl) }
      ];

    Alert.alert(title, message, buttons, { cancelable: !updateInfo.isCritical });
  }

  /**
   * Inicia la descarga de la actualización
   * @param {string} downloadUrl - URL del APK
   */
  async downloadUpdate(downloadUrl) {
    try {
      console.log('📥 Iniciando descarga de actualización...');

      if (Platform.OS === 'android') {
        // Para Android, abrir URL de descarga
        const canOpen = await Linking.canOpenURL(downloadUrl);
        if (canOpen) {
          await Linking.openURL(downloadUrl);

          // Mostrar instrucciones al usuario
          Alert.alert(
            '📥 Descarga Iniciada',
            'La descarga comenzará en breve. Una vez descargada:\n\n1. Ve a tus notificaciones\n2. Toca el archivo descargado\n3. Sigue las instrucciones de instalación\n\n⚠️ Es posible que necesites permitir "Instalar apps desconocidas" en Configuración.',
            [{ text: 'Entendido' }]
          );
        } else {
          throw new Error('No se puede abrir la URL de descarga');
        }
      } else {
        // Para iOS, redirigir a App Store (cuando esté disponible)
        Alert.alert(
          'iOS Detectado',
          'Para dispositivos iOS, busca "Sabores de Origen" en la App Store.',
          [{ text: 'Abrir App Store', onPress: () => Linking.openURL('https://apps.apple.com') }]
        );
      }

    } catch (error) {
      console.error('❌ Error descargando actualización:', error);
      Alert.alert(
        'Error de Descarga',
        'No se pudo iniciar la descarga. Por favor, contacta con soporte.',
        [{ text: 'Entendido' }]
      );
    }
  }

  /**
   * Verificación manual de actualizaciones (para botón en configuración) - solo Android
   */
  async manualCheck() {
    // Solo permitir verificación manual en Android
    if (Platform.OS !== 'android') {
      console.log('iOS detectado - verificación manual de actualizaciones no disponible');
      return null;
    }
    Alert.alert(
      '🔍 Verificando...',
      'Buscando nuevas versiones disponibles...',
      [],
      { cancelable: false }
    );

    const updateInfo = await this.checkForUpdates();

    if (updateInfo && updateInfo.available) {
      this.showUpdateModal(updateInfo);
    } else {
      Alert.alert(
        '✅ App Actualizada',
        'Tienes la versión más reciente de Sabores de Origen.',
        [{ text: 'Perfecto' }]
      );
    }
  }

  /**
   * Inicializa el servicio de actualizaciones automáticas
   */
  async initialize() {
    console.log('🚀 Inicializando AutoUpdateService...');

    // Verificar actualizaciones al iniciar la app (solo Android)
    if (Platform.OS === 'android') {
      setTimeout(() => {
        this.checkForUpdates().then(updateInfo => {
          if (updateInfo && updateInfo.available) {
            // Esperar un poco antes de mostrar el modal para mejor UX
            setTimeout(() => {
              this.showUpdateModal(updateInfo);
            }, 3000);
          }
        });
      }, 5000); // Esperar 5 segundos después del inicio de la app
    }

    // Configurar verificación periódica (solo Android)
    if (Platform.OS === 'android') {
      setInterval(() => {
        this.checkForUpdates().then(updateInfo => {
          if (updateInfo && updateInfo.available && updateInfo.isCritical) {
            this.showUpdateModal(updateInfo);
          }
        });
      }, UPDATE_CONFIG.CHECK_INTERVAL);
    }
  }

  /**
   * Obtiene información sobre actualizaciones pendientes
   * @returns {Promise<Object|null>}
   */
  async getPendingUpdate() {
    try {
      const updateInfo = await this.checkForUpdates();
      return updateInfo && updateInfo.available ? updateInfo : null;
    } catch (error) {
      console.error('Error obteniendo actualización pendiente:', error);
      return null;
    }
  }
}

// Exportar instancia singleton
export default new AutoUpdateService();

// Ejemplo de estructura JSON que tu backend debería retornar:
/*
{
  "latest_version": "1.1.0",
  "download_url": "https://your-backend.com/downloads/sabores-de-origen-v1.1.0.apk",
  "release_notes": "🆕 Nuevas funciones:\n• Mejoras en el sistema de pedidos\n• Corrección de errores menores\n• Optimización de rendimiento",
  "is_critical": false,
  "min_required_version": "1.0.0",
  "release_date": "2024-01-15T10:00:00Z",
  "file_size": "25.4 MB",
  "checksum": "sha256:abc123..."
}
*/