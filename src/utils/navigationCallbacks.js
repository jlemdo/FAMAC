/**
 * Sistema de callbacks globales para evitar pasar funciones en navegación
 * Soluciona: "Non-serializable values were found in the navigation state"
 */

const navigationCallbacks = new Map();

/**
 * Generar ID único para callbacks
 */
export const generateCallbackId = () => {
  return `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Registrar callback con ID único
 */
export const registerNavigationCallback = (id, callback) => {
  if (typeof callback !== 'function') {
    return;
  }
  
  navigationCallbacks.set(id, callback);
  
  // Auto-limpiar callback después de 5 minutos (prevenir memory leaks)
  setTimeout(() => {
    if (navigationCallbacks.has(id)) {
      console.log(`📝 Auto-limpiando callback: ${id}`);
      navigationCallbacks.delete(id);
    }
  }, 5 * 60 * 1000);
  
  console.log(`📝 Callback registrado: ${id}`);
};

/**
 * Ejecutar callback por ID
 */
export const executeNavigationCallback = (id, ...args) => {
  const callback = navigationCallbacks.get(id);
  
  if (!callback) {
    console.warn(`⚠️ Callback no encontrado: ${id}`);
    return false;
  }
  
  try {
    console.log(`🚀 Ejecutando callback: ${id}`);
    callback(...args);
    return true;
  } catch (error) {
    console.error(`❌ Error ejecutando callback ${id}:`, error);
    return false;
  }
};

/**
 * Limpiar callback específico
 */
export const cleanupNavigationCallback = (id) => {
  if (navigationCallbacks.has(id)) {
    navigationCallbacks.delete(id);
    console.log(`🗑️ Callback limpiado: ${id}`);
    return true;
  }
  return false;
};

/**
 * Limpiar todos los callbacks (usar con cuidado)
 */
export const cleanupAllNavigationCallbacks = () => {
  const count = navigationCallbacks.size;
  navigationCallbacks.clear();
  console.log(`🗑️ ${count} callbacks limpiados`);
};

/**
 * Ver callbacks activos (debugging)
 */
export const getActiveCallbacks = () => {
  return Array.from(navigationCallbacks.keys());
};