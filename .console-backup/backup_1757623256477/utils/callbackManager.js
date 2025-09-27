// Sistema global de callbacks para evitar pasar funciones en parámetros de navegación
class CallbackManager {
  constructor() {
    this.callbacks = new Map();
  }

  // Registrar un callback con un ID único
  register(id, callback) {
    this.callbacks.set(id, callback);
    return id;
  }

  // Ejecutar un callback por su ID
  execute(id, ...args) {
    const callback = this.callbacks.get(id);
    if (callback) {
      callback(...args);
      return true;
    }
    return false;
  }

  // Limpiar un callback
  cleanup(id) {
    this.callbacks.delete(id);
  }

  // Generar ID único
  generateId() {
    return `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Instancia global
const callbackManager = new CallbackManager();

export default callbackManager;