import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import axios from 'axios';
import fonts from '../theme/fonts';
import { useResponsive, useAdaptiveLayout } from '../hooks/useResponsive';
import { scaleSpacing, scaleFontSize, getInputDimensions, getButtonDimensions } from '../utils/responsiveUtils';
import { getAddressPickerCallbacks, cleanupAddressPickerCallbacks } from '../components/AddressPicker';

const AddressForm = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const responsive = useResponsive();
  const layout = useAdaptiveLayout();
  
  // Parámetros de navegación
  const { 
    pickerId, // ID para obtener callbacks
    initialAddress = '',
    title = 'Seleccionar Dirección',
    returnScreen = null // Para saber a dónde regresar
  } = route.params || {};

  // Obtener callbacks usando el ID
  const callbacks = pickerId ? getAddressPickerCallbacks(pickerId) : null;

  // Estados para formulario simplificado
  const [addressForm, setAddressForm] = useState({
    street: '',
    exteriorNumber: '',
    interiorNumber: '',
    postalCode: '',
    alcaldia: '',
    city: 'CDMX', // Default
    references: '',
    fullAddress: initialAddress,
  });
  
  // Estado para mostrar todas las alcaldías
  const [showAllAlcaldias, setShowAllAlcaldias] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Opciones de Alcaldías y Ciudades
  const alcaldiasCDMX = [
    'Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán',
    'Cuajimalpa', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa',
    'Magdalena Contreras', 'Miguel Hidalgo', 'Milpa Alta', 'Tláhuac',
    'Tlalpan', 'Venustiano Carranza', 'Xochimilco', 'Cuauhtémoc'
  ];

  const municipiosEdomex = [
    'Naucalpan', 'Tlalnepantla', 'Ecatepec', 'Nezahualcóyotl', 
    'Chimalhuacán', 'Atizapán', 'Tultitlán', 'Coacalco',
    'Cuautitlán Izcalli', 'Huixquilucan', 'Nicolás Romero', 
    'Tecámac', 'La Paz', 'Chalco', 'Ixtapaluca'
  ];

  const cities = ['CDMX', 'Estado de México'];
  
  const getCurrentAlcaldias = () => {
    return addressForm.city === 'CDMX' ? alcaldiasCDMX : municipiosEdomex;
  };

  // Efecto para geocodificar initialAddress cuando se carga la pantalla
  useEffect(() => {
    if (initialAddress && initialAddress.trim() && !selectedLocation) {
      const geocodeInitialAddress = async () => {
        try {
          const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json`,
            {
              params: {
                address: `${initialAddress}, México`,
                key: Config.GOOGLE_DIRECTIONS_API_KEY,
                language: 'es',
              },
            }
          );

          if (response.data.results[0]) {
            const result = response.data.results[0];
            const location = result.geometry.location;
            setSelectedLocation({
              latitude: location.lat,
              longitude: location.lng,
            });
          }
        } catch (error) {
          // Error geocodificando initialAddress
        }
      };

      geocodeInitialAddress();
    }
  }, [initialAddress]);

  // Validar Código Postal
  const validatePostalCode = (cp, city) => {
    if (city === 'CDMX') {
      return cp >= '01000' && cp <= '16999';
    } else {
      return cp >= '50000' && cp <= '56999';
    }
  };

  // Confirmar dirección
  const handleConfirm = () => {
    // Validar campos obligatorios
    if (!addressForm.street || !addressForm.exteriorNumber || !addressForm.postalCode || !addressForm.alcaldia) {
      Alert.alert(
        'Campos incompletos', 
        '📝 Por favor completa todos los campos marcados con (*) para continuar:\\n\\n• Calle\\n• Número exterior\\n• Código postal\\n• Alcaldía/Municipio',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    // Validar CP
    if (!validatePostalCode(addressForm.postalCode, addressForm.city)) {
      const range = addressForm.city === 'CDMX' ? '01000-16999' : '50000-56999';
      Alert.alert(
        'Código Postal incorrecto', 
        `📍 El código postal ${addressForm.postalCode} no es válido para ${addressForm.city}.\\n\\nRango válido: ${range}`,
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    // Construir dirección completa
    const addressParts = [
      addressForm.street,
      addressForm.exteriorNumber,
      addressForm.interiorNumber && `Int. ${addressForm.interiorNumber}`,
      addressForm.alcaldia,
      addressForm.city,
      `C.P. ${addressForm.postalCode}`
    ].filter(Boolean);
    
    const fullAddressString = addressParts.join(', ');

    const finalAddress = {
      ...addressForm,
      fullAddress: fullAddressString,
      coordinates: selectedLocation ? {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      } : null,
    };

    // Llamar callback y navegar de vuelta
    if (callbacks?.onConfirm) {
      callbacks.onConfirm(finalAddress);
    }
    
    // Limpiar callbacks del store
    if (pickerId) {
      cleanupAddressPickerCallbacks(pickerId);
    }
    
    navigation.goBack();
  };

  // Navegar al mapa
  const handleNavigateToMap = () => {
    navigation.navigate('AddressMap', {
      addressForm,
      selectedLocation: selectedLocation || {
        latitude: 19.4326,
        longitude: -99.1332,
      },
      // Pasamos el pickerId para que el mapa pueda actualizar el form
      pickerId,
      onLocationReturn: (location, updatedForm) => {
        setSelectedLocation(location);
        setAddressForm(updatedForm);
      }
    });
  };

  // Cleanup cuando se desmonta el componente
  React.useEffect(() => {
    return () => {
      // Limpiar callbacks si la pantalla se cierra sin confirmar
      if (pickerId && callbacks) {
        cleanupAddressPickerCallbacks(pickerId);
      }
    };
  }, [pickerId, callbacks]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          {/* Calle */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Calle *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Av. Insurgentes Sur"
              placeholderTextColor="#999"
              value={addressForm.street}
              onChangeText={(text) => setAddressForm(prev => ({ ...prev, street: text }))}
            />
          </View>

          {/* Números */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, {flex: 2, marginRight: 8}]}>
              <Text style={styles.label}>Número Ext. *</Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                placeholderTextColor="#999"
                value={addressForm.exteriorNumber}
                onChangeText={(text) => setAddressForm(prev => ({ ...prev, exteriorNumber: text }))}
              />
            </View>
            <View style={[styles.inputContainer, {flex: 1}]}>
              <Text style={styles.label}>Número Int.</Text>
              <TextInput
                style={styles.input}
                placeholder="A"
                placeholderTextColor="#999"
                value={addressForm.interiorNumber}
                onChangeText={(text) => setAddressForm(prev => ({ ...prev, interiorNumber: text }))}
              />
            </View>
          </View>

          {/* Código Postal */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Código Postal *</Text>
            <TextInput
              style={styles.input}
              placeholder="01000"
              placeholderTextColor="#999"
              value={addressForm.postalCode}
              onChangeText={(text) => setAddressForm(prev => ({ ...prev, postalCode: text }))}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          {/* Ciudad */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ciudad *</Text>
            <View style={styles.cityContainer}>
              {cities.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityButton,
                    addressForm.city === city && styles.cityButtonSelected
                  ]}
                  onPress={() => {
                    setAddressForm(prev => ({ 
                      ...prev, 
                      city: city,
                      alcaldia: '' // Reset alcaldía cuando cambia ciudad
                    }));
                    setShowAllAlcaldias(false); // Reset vista de alcaldías
                  }}>
                  <Text style={[
                    styles.cityButtonText,
                    addressForm.city === city && styles.cityButtonTextSelected
                  ]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              {addressForm.city === 'CDMX' ? '16 alcaldías disponibles' : '15 municipios principales'}
            </Text>
          </View>

          {/* Alcaldía - Dropdown mejorado */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {addressForm.city === 'CDMX' ? 'Alcaldía *' : 'Municipio *'}
            </Text>
            
            {/* Mostrar selección actual */}
            {addressForm.alcaldia ? (
              <View style={styles.selectedContainer}>
                <View style={styles.selectedChip}>
                  <Text style={styles.selectedText}>{addressForm.alcaldia}</Text>
                  <TouchableOpacity 
                    style={styles.changeButton}
                    onPress={() => {
                      setAddressForm(prev => ({ ...prev, alcaldia: '' }));
                      setShowAllAlcaldias(false);
                    }}>
                    <Text style={styles.changeButtonText}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Mostrar opciones para seleccionar
              <View style={styles.dropdownWrapper}>
                {(showAllAlcaldias ? getCurrentAlcaldias() : getCurrentAlcaldias().slice(0, 8)).map((item, index) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.alcaldiaChip}
                    onPress={() => {
                      setAddressForm(prev => ({ ...prev, alcaldia: item }));
                      setShowAllAlcaldias(false); // Colapsar después de seleccionar
                    }}>
                    <Text style={styles.alcaldiaChipText}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
                {getCurrentAlcaldias().length > 8 && !showAllAlcaldias && (
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => setShowAllAlcaldias(true)}>
                    <Text style={styles.moreButtonText}>+{getCurrentAlcaldias().length - 8} más</Text>
                  </TouchableOpacity>
                )}
                {showAllAlcaldias && (
                  <TouchableOpacity 
                    style={styles.lessButton}
                    onPress={() => setShowAllAlcaldias(false)}>
                    <Text style={styles.lessButtonText}>Mostrar menos</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Referencias */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Referencias</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ej: Entre calles X y Y, edificio azul"
              placeholderTextColor="#999"
              value={addressForm.references}
              onChangeText={(text) => setAddressForm(prev => ({ ...prev, references: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Botón mapa */}
          <TouchableOpacity
            style={styles.mapButton}
            onPress={handleNavigateToMap}>
            <Text style={styles.mapButtonText}>📍 Marcar mi dirección en mapa</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Botón de confirmación fijo */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirmar dirección</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(15),
    paddingVertical: scaleSpacing(10),
    backgroundColor: '#F2EFE4',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.1)',
  },
  backButton: {
    marginRight: scaleSpacing(10),
  },
  title: {
    fontSize: scaleFontSize(fonts.size.XL),
    fontFamily: fonts.bold,
    textAlign: 'center',
    flex: 1,
    color: '#333',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: scaleSpacing(20),
  },
  formContainer: {
    paddingVertical: scaleSpacing(20),
  },
  inputContainer: {
    marginBottom: scaleSpacing(16),
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#2F2F2F',
    marginBottom: scaleSpacing(8),
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#666',
    marginTop: scaleSpacing(4),
    textAlign: 'center',
  },
  input: {
    ...getInputDimensions(),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    backgroundColor: '#FFF',
  },
  textArea: {
    height: scaleSpacing(80),
    textAlignVertical: 'top',
    paddingTop: scaleSpacing(12),
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: scaleSpacing(16),
  },
  // Ciudad - botones simples
  cityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cityButton: {
    flex: 1,
    paddingVertical: scaleSpacing(12),
    paddingHorizontal: scaleSpacing(16),
    borderRadius: scaleSpacing(8),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    marginHorizontal: scaleSpacing(4),
  },
  cityButtonSelected: {
    borderColor: '#D27F27',
    backgroundColor: '#D27F27',
  },
  cityButtonText: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#2F2F2F',
  },
  cityButtonTextSelected: {
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  // Alcaldías - chips organizados
  selectedContainer: {
    marginTop: scaleSpacing(4),
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleSpacing(12),
    paddingHorizontal: scaleSpacing(16),
    borderRadius: scaleSpacing(8),
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#33A744',
  },
  selectedText: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#33A744',
    flex: 1,
  },
  changeButton: {
    paddingVertical: scaleSpacing(4),
    paddingHorizontal: scaleSpacing(8),
    borderRadius: scaleSpacing(4),
    backgroundColor: '#33A744',
  },
  changeButtonText: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#FFF',
  },
  dropdownWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSpacing(8),
    marginTop: scaleSpacing(4),
  },
  alcaldiaChip: {
    paddingVertical: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(12),
    borderRadius: scaleSpacing(16),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    marginBottom: scaleSpacing(4),
  },
  alcaldiaChipText: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#2F2F2F',
    textAlign: 'center',
  },
  moreButton: {
    paddingVertical: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(12),
    borderRadius: scaleSpacing(16),
    backgroundColor: '#F0F0F0',
    marginBottom: scaleSpacing(4),
  },
  moreButtonText: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#666',
    textAlign: 'center',
  },
  lessButton: {
    paddingVertical: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(12),
    borderRadius: scaleSpacing(16),
    backgroundColor: '#E8E8E8',
    marginBottom: scaleSpacing(4),
  },
  lessButtonText: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#666',
    textAlign: 'center',
  },
  mapButton: {
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderWidth: 1,
    borderColor: '#D27F27',
    paddingVertical: scaleSpacing(12),
    paddingHorizontal: scaleSpacing(16),
    borderRadius: scaleSpacing(8),
    alignItems: 'center',
    marginTop: scaleSpacing(10),
  },
  mapButtonText: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#D27F27',
  },
  buttonContainer: {
    paddingHorizontal: scaleSpacing(20),
    paddingVertical: scaleSpacing(15),
    backgroundColor: '#F2EFE4',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 94, 60, 0.1)',
  },
  confirmButton: {
    ...getButtonDimensions('medium'),
    backgroundColor: '#33A744',
    alignItems: 'center',
    width: '100%',
  },
  confirmButtonText: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#FFF',
  },
});

export default AddressForm;