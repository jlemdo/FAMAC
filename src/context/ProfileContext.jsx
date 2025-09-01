import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function para parsear fechas (igual que en Profile.jsx)
const parseFlexibleDate = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    let parsedDate = null;
    
    if (typeof dateValue === 'string') {
      // Formato 1: ISO date (YYYY-MM-DD)
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        parsedDate = new Date(dateValue);
      }
      // Formato 2: "Month YYYY" como "June 1993" o "diciembre de 1976"
      else if (dateValue.match(/^[A-Za-zñáéíóú]+ (de )?\d{4}$/)) {
        // Remover "de" si existe y dividir
        const cleanDate = dateValue.replace(' de ', ' ');
        const [monthName, year] = cleanDate.split(' ');
        
        // Meses en inglés
        const monthNamesEn = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // Meses en español
        const monthNamesEs = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        
        // Buscar en inglés primero
        let monthIndex = monthNamesEn.indexOf(monthName);
        
        // Si no se encuentra en inglés, buscar en español (case insensitive)
        if (monthIndex === -1) {
          monthIndex = monthNamesEs.indexOf(monthName.toLowerCase());
        }
        
        if (monthIndex !== -1) {
          parsedDate = new Date(parseInt(year), monthIndex, 1);
        }
      }
      // Formato 3: Intentar parsing directo
      else {
        parsedDate = new Date(dateValue);
      }
    } else {
      parsedDate = new Date(dateValue);
    }
    
    // Verificar que la fecha sea válida y normalizar al día 1
    if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900) {
      // Siempre normalizar al día 1 del mes
      return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
    }
  } catch (error) {
    // Error parsing date
  }
  
  return null;
};

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  
  // Estado inicial con persistencia
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: null,
  });
  const [missingData, setMissingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // DEBUG: Monitor cuando profile cambia
  useEffect(() => {
  }, [profile]);
  
  // CARGAR estado persistido al inicializar (SOLO UNA VEZ)
  useEffect(() => {
    const loadPersistedProfile = async () => {
      if (initialized || !user?.id) return;
      
      try {
        const persistedProfile = await AsyncStorage.getItem(`profile_${user.id}`);
        if (persistedProfile) {
          const parsedProfile = JSON.parse(persistedProfile);
          setProfile(parsedProfile);
        }
      } catch (error) {
      } finally {
        setInitialized(true);
      }
    };
    
    loadPersistedProfile();
  }, [user?.id, initialized]);
  
  // GUARDAR en AsyncStorage cada vez que cambie el profile
  useEffect(() => {
    if (!initialized || !user?.id) return;
    
    const saveProfile = async () => {
      try {
        await AsyncStorage.setItem(`profile_${user.id}`, JSON.stringify(profile));
      } catch (error) {
      }
    };
    
    saveProfile();
  }, [profile, user?.id, initialized]);

  // Función para verificar datos faltantes (igual que en Profile.jsx)
  const getMissingData = useCallback((profileData) => {
    const missing = [];
    
    if (!profileData.phone || profileData.phone.trim() === '') {
      missing.push({ field: 'phone', label: 'Teléfono', reason: 'para recibir notificaciones de tu pedido' });
    }
    if (!profileData.address || profileData.address.trim() === '') {
      missing.push({ field: 'address', label: 'Dirección', reason: 'para poder hacer pedidos a domicilio' });
    }
    
    // Verificar fecha de cumpleaños (debe existir y ser una fecha válida)
    if (!profileData.birthDate || 
        !(profileData.birthDate instanceof Date) || 
        isNaN(profileData.birthDate.getTime()) ||
        profileData.birthDate.getFullYear() < 1900) {
      missing.push({ field: 'birthDate', label: 'Fecha de cumpleaños', reason: 'para beneficios especiales en tu día' });
    }
    
    return missing;
  }, []);

  // Función para cargar datos del perfil
  const fetchUserDetails = useCallback(async () => {
    if (!user?.id || user.usertype === 'Guest') {
      setMissingData([]);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(
        `https://occr.pixelcrafters.digital/api/userdetails/${user.id}`
      );
      const data = res.data?.data?.[0] || {};
      
      const dateValue = data.birthDate || data.birth_date || data.dob;
      const birthDate = parseFlexibleDate(dateValue);
      
      const profileData = {
        first_name: data.first_name || '',
        last_name:  data.last_name  || '',
        email:      data.email      || '',
        phone:      data.phone      || '',
        address:    data.address    || '',
        birthDate:  birthDate,
      };
      
      setProfile(profileData);
      const missing = getMissingData(profileData);
      setMissingData(missing);
      
    } catch (error) {
      // Error fetching profile data
      setMissingData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.usertype, getMissingData]);

  // 🔧 SOLUCIÓN AL BUG: Prevenir fetch automático que sobrescribe datos
  // Solo cargar datos cuando realmente cambia el usuario ID, no en updates de perfil
  const [lastUserId, setLastUserId] = useState(null);
  
  useEffect(() => {
    // Solo hacer fetch si es un usuario completamente diferente
    if (user?.id && user.id !== lastUserId) {
      console.log('🔄 ProfileContext: Cargando datos para nuevo usuario:', user.id);
      fetchUserDetails();
      setLastUserId(user.id);
    }
  }, [user?.id]); // Mantener dependencia simple

  // Función para actualizar los datos (llamada desde Profile.jsx)
  const updateProfile = useCallback(async (newProfileData) => {
    console.log('🔧 ProfileContext: Actualizando perfil con:', newProfileData);
    
    // Hacer merge con los datos existentes para preservar campos no enviados
    const updatedProfile = {
      ...profile, // Mantener datos previos
      ...newProfileData // Sobrescribir solo los campos enviados
    };
    
    setProfile(updatedProfile);
    
    // PERSISTIR INMEDIATAMENTE en AsyncStorage
    if (user?.id) {
      try {
        await AsyncStorage.setItem(`profile_${user.id}`, JSON.stringify(updatedProfile));
        console.log('💾 ProfileContext: Datos persistidos correctamente');
      } catch (error) {
        console.error('❌ ProfileContext: Error persistiendo datos:', error);
      }
    }
    
    // Calcular missing data con el perfil combinado
    const missing = getMissingData(updatedProfile);
    setMissingData(missing);
  }, [getMissingData, profile, user?.id]);

  const value = {
    profile,
    missingData,
    loading,
    hasIncompleteProfile: missingData.length > 0,
    fetchUserDetails,
    updateProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile debe ser usado dentro de ProfileProvider');
  }
  return context;
};

export default ProfileContext;