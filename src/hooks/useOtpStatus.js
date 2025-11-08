// src/hooks/useOtpStatus.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/environment';

/**
 * Hook para verificar si el sistema OTP/SMS está habilitado en el servidor
 *
 * @returns {Object} { otpEnabled: boolean, loading: boolean }
 */
export const useOtpStatus = () => {
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOtpStatus = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/sms/status`);
        // El backend retorna { ready: true/false }
        setOtpEnabled(data.ready === true);
      } catch (error) {
        console.log('Error checking OTP status:', error);
        // Si falla la consulta, asumir que OTP está desactivado (fail-safe)
        setOtpEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkOtpStatus();
  }, []);

  return { otpEnabled, loading };
};
