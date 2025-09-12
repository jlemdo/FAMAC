// src/utils/orderMigration.js
import axios from 'axios';

/**
 * Migra las órdenes de un usuario Guest a su cuenta registrada
 * @param {string} guestEmail - Email del usuario cuando era Guest
 * @returns {Promise<boolean>} - true si la migración fue exitosa
 */
export const migrateGuestOrders = async (guestEmail) => {
  try {
    
    const response = await axios.post('https://occr.pixelcrafters.digital/api/migrateorders', {
      user_email: guestEmail,
      need_invoice: "true", // Campo requerido por el backend actualizado
      tax_details: "" // Campo requerido, vacío para migración
    });
    
    return true;
    
  } catch (error) {
    return false;
  }
};

// Nota: El endpoint para obtener órdenes de Guest no está disponible aún
// Las órdenes de Guest se migrarán automáticamente cuando se registren