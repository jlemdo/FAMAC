/**
 * Utilidad para formatear IDs de orden al formato AA-MM-DD-HH-MM-SS
 * Ejemplo: 2025-07-31T10:08:30Z → 250731-100830
 */

/**
 * Convierte una fecha/hora a formato de ID de orden AA-MM-DD-HH-MM-SS
 * @param {string|Date} dateTime - Fecha en formato ISO string o objeto Date
 * @returns {string} ID formateado como AA-MM-DD-HH-MM-SS
 */
export const formatOrderId = (dateTime) => {
  try {
    const date = new Date(dateTime);
    
    // Verificar que la fecha es válida
    if (isNaN(date.getTime())) {
      console.warn('⚠️ Invalid date for order ID:', dateTime);
      return 'INVALID-ID';
    }

    // Extraer componentes de fecha/hora
    const year = date.getFullYear().toString().slice(-2); // AA: últimos 2 dígitos del año
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // MM: mes con 0 inicial
    const day = date.getDate().toString().padStart(2, '0'); // DD: día con 0 inicial
    const hours = date.getHours().toString().padStart(2, '0'); // HH: horas con 0 inicial
    const minutes = date.getMinutes().toString().padStart(2, '0'); // MM: minutos con 0 inicial
    const seconds = date.getSeconds().toString().padStart(2, '0'); // SS: segundos con 0 inicial

    // Formato final: AA-MM-DD-HH-MM-SS
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  } catch (error) {
    console.error('Error formatting order ID:', error);
    return 'ERROR-ID';
  }
};

/**
 * Convierte el ID formateado de vuelta a fecha legible (para debugging)
 * @param {string} orderId - ID en formato AA-MM-DD-HH-MM-SS
 * @returns {string} Fecha legible
 */
export const parseOrderId = (orderId) => {
  try {
    if (!orderId || typeof orderId !== 'string' || orderId.length !== 13) {
      return 'ID inválido';
    }

    const [datePart, timePart] = orderId.split('-');
    
    if (!datePart || !timePart || datePart.length !== 6 || timePart.length !== 6) {
      return 'Formato inválido';
    }

    const year = parseInt(`20${datePart.slice(0, 2)}`);
    const month = parseInt(datePart.slice(2, 4)) - 1; // -1 porque Date usa 0-11
    const day = parseInt(datePart.slice(4, 6));
    const hours = parseInt(timePart.slice(0, 2));
    const minutes = parseInt(timePart.slice(2, 4));
    const seconds = parseInt(timePart.slice(4, 6));

    const date = new Date(year, month, day, hours, minutes, seconds);
    
    return date.toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (error) {
    console.error('Error parsing order ID:', error);
    return 'Error al parsear';
  }
};

/**
 * Ejemplo de uso:
 * 
 * const orderDateTime = '2025-07-31T10:08:30.000Z';
 * const orderId = formatOrderId(orderDateTime);
 * console.log(orderId); // "250731-100830"
 * 
 * const readable = parseOrderId(orderId);
 * console.log(readable); // "31 jul 2025 10:08"
 */