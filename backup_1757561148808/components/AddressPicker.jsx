import React from 'react';
import { useNavigation } from '@react-navigation/native';

// Store global para callbacks
const addressCallbacks = new Map();

const AddressPicker = ({ 
  visible, 
  onClose, 
  onConfirm, 
  initialAddress = '',
  title = 'Seleccionar Dirección' 
}) => {
  const navigation = useNavigation();

  // Efecto para navegar cuando se abre el picker
  React.useEffect(() => {
    if (visible) {
      // Generar ID único para este picker
      const pickerId = `address_picker_${Date.now()}_${Math.random()}`;
      
      // Guardar callbacks en store global
      addressCallbacks.set(pickerId, { onConfirm, onClose });
      
      // Navegar a la pantalla de formulario de dirección
      const parentNavigator = navigation.getParent();
      if (parentNavigator) {
        parentNavigator.navigate('AddressForm', {
          pickerId, // Solo pasamos el ID, no las funciones
          initialAddress,
          title,
        });
      }

      // Cerrar inmediatamente el modal "virtual"
      if (onClose) {
        onClose();
      }
    }
  }, [visible, onConfirm, onClose, initialAddress, title, navigation]);

  // Este componente ahora es solo un bridge que no renderiza nada
  // La navegación se maneja por completo a través de pantallas
  return null;
};

// Función helper para obtener callbacks
export const getAddressPickerCallbacks = (pickerId) => {
  return addressCallbacks.get(pickerId);
};

// Función helper para limpiar callbacks
export const cleanupAddressPickerCallbacks = (pickerId) => {
  addressCallbacks.delete(pickerId);
};

export default AddressPicker;