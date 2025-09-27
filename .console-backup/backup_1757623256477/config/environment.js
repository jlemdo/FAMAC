/**
 * 🌐 CONFIGURACIÓN DE ENTORNO
 * 
 * Cambia manualmente entre 'development' y 'production' según tus necesidades
 * 
 * INSTRUCCIONES:
 * - Para desarrollo local: ENVIRONMENT = 'development'
 * - Para producción/hosting: ENVIRONMENT = 'production'
 */

// 👇 CAMBIAR AQUÍ MANUALMENTE 👇
const ENVIRONMENT = 'development'; // Cambiar a 'production' cuando necesites

const config = {
  development: {
    API_BASE_URL: 'http://127.0.0.1:8000',
    WS_BASE_URL: 'ws://127.0.0.1:8000',
    ENVIRONMENT_NAME: 'Desarrollo Local',
  },
  production: {
    API_BASE_URL: 'https://occr.pixelcrafters.digital',
    WS_BASE_URL: 'wss://occr.pixelcrafters.digital',
    ENVIRONMENT_NAME: 'Producción',
  }
};

// Validar que el entorno existe
if (!config[ENVIRONMENT]) {
  throw new Error(`❌ Entorno '${ENVIRONMENT}' no válido. Usa 'development' o 'production'`);
}

const currentConfig = config[ENVIRONMENT];

export const API_BASE_URL = currentConfig.API_BASE_URL;
export const WS_BASE_URL = currentConfig.WS_BASE_URL;
export const ENVIRONMENT_NAME = currentConfig.ENVIRONMENT_NAME;
export const IS_DEVELOPMENT = ENVIRONMENT === 'development';
export const IS_PRODUCTION = ENVIRONMENT === 'production';

// Log para confirmar configuración actual
console.log(`🌐 Entorno activo: ${ENVIRONMENT_NAME} (${API_BASE_URL})`);