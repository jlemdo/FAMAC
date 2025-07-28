// src/utils/orderMigration.js
import axios from 'axios';

/**
 * Migra las órdenes de un usuario Guest a su cuenta registrada
 * @param {string} guestEmail - Email del usuario cuando era Guest
 * @returns {Promise<boolean>} - true si la migración fue exitosa
 */
export const migrateGuestOrders = async (guestEmail) => {
  try {
    console.log('🔄 Iniciando migración de órdenes Guest:', guestEmail);
    
    const response = await axios.post('https://food.siliconsoft.pk/api/migrateorders', {
      user_email: guestEmail,
      need_invoice: "true", // Campo requerido por el backend actualizado
      tax_details: "" // Campo requerido, vacío para migración
    });
    
    console.log('✅ Migración de órdenes exitosa:', response.data);
    return true;
    
  } catch (error) {
    console.error('❌ Error en migración de órdenes:', error.message);
    console.error('❌ Error details:', {
      guestEmail,
      errorMessage: error.message,
      errorCode: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data ? JSON.stringify(error.response.data) : 'No response data'
    });
    return false;
  }
};

// Nota: El endpoint para obtener órdenes de Guest no está disponible aún
// Las órdenes de Guest se migrarán automáticamente cuando se registren