import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Config from 'react-native-config';
import axios from 'axios';
import fonts from '../theme/fonts';

const AddressPicker = ({ 
  visible, 
  onClose, 
  onConfirm, 
  initialAddress = '',
  title = 'Seleccionar Dirección' 
}) => {
  // Estados simplificados - solo mapa opcional
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const mapRef = useRef(null);
  
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

  // Efecto para geocodificar initialAddress cuando se abre el modal
  React.useEffect(() => {
    if (visible && initialAddress && initialAddress.trim() && !selectedLocation) {
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
            console.log('📍 Geocodificado initialAddress:', initialAddress, '→', location);
          }
        } catch (error) {
          console.error('Error geocodificando initialAddress:', error);
        }
      };

      geocodeInitialAddress();
    }
  }, [visible, initialAddress]);

  // Validar Código Postal
  const validatePostalCode = (cp, city) => {
    if (city === 'CDMX') {
      return cp >= '01000' && cp <= '16999';
    } else {
      return cp >= '50000' && cp <= '56999';
    }
  };


  // Parsear componentes de dirección de Google para auto-rellenado
  const parseAddressComponents = (components, fullAddress, location) => {
    const addressData = {
      street: addressForm.street,
      exteriorNumber: addressForm.exteriorNumber,
      interiorNumber: addressForm.interiorNumber,
      postalCode: addressForm.postalCode,
      alcaldia: addressForm.alcaldia,
      city: addressForm.city,
      references: addressForm.references,
      fullAddress: fullAddress,
    };

    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        addressData.exteriorNumber = component.long_name;
      } else if (types.includes('route')) {
        addressData.street = component.long_name;
      } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        // Intentar mapear a alcaldía conocida
        const foundAlcaldia = [...alcaldiasCDMX, ...municipiosEdomex].find(a => 
          a.toLowerCase().includes(component.long_name.toLowerCase()) ||
          component.long_name.toLowerCase().includes(a.toLowerCase())
        );
        if (foundAlcaldia) {
          addressData.alcaldia = foundAlcaldia;
          addressData.city = alcaldiasCDMX.includes(foundAlcaldia) ? 'CDMX' : 'Estado de México';
        }
      } else if (types.includes('postal_code')) {
        addressData.postalCode = component.long_name;
        // Auto-detectar ciudad por CP
        if (validatePostalCode(component.long_name, 'CDMX')) {
          addressData.city = 'CDMX';
        } else if (validatePostalCode(component.long_name, 'Estado de México')) {
          addressData.city = 'Estado de México';
        }
      }
    });

    setAddressForm(addressData);
    setSelectedLocation({
      ...location,
      latitude: location.lat || location.latitude,
      longitude: location.lng || location.longitude,
    });
    setShowMap(false); // Regresar al formulario
  };


  // Manejar pin en mapa
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    try {
      // Geocoding inverso para obtener dirección
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            latlng: `${latitude},${longitude}`,
            key: Config.GOOGLE_DIRECTIONS_API_KEY,
            language: 'es',
          },
        }
      );

      if (response.data.results[0]) {
        const result = response.data.results[0];
        parseAddressComponents(
          result.address_components, 
          result.formatted_address, 
          { latitude, longitude }
        );
      } else {
        setSelectedLocation({ latitude, longitude });
      }
    } catch (error) {
      console.error('Error with reverse geocoding:', error);
      setSelectedLocation({ latitude, longitude });
    }
  };

  // Confirmar dirección
  const handleConfirm = () => {
    // Validar campos obligatorios
    if (!addressForm.street || !addressForm.exteriorNumber || !addressForm.postalCode || !addressForm.alcaldia) {
      Alert.alert('Campos requeridos', 'Por favor completa todos los campos obligatorios: calle, número exterior, código postal y alcaldía.');
      return;
    }

    // Validar CP
    if (!validatePostalCode(addressForm.postalCode, addressForm.city)) {
      const range = addressForm.city === 'CDMX' ? '01000-16999' : '50000-56999';
      Alert.alert('Código Postal inválido', `Para ${addressForm.city} debe estar en el rango: ${range}`);
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

    onConfirm(finalAddress);
    handleClose();
  };

  // Cerrar modal
  const handleClose = () => {
    setShowMap(false);
    setSelectedLocation(null);
    setAddressForm({
      street: '',
      exteriorNumber: '',
      interiorNumber: '',
      postalCode: '',
      alcaldia: '',
      city: 'CDMX',
      references: '',
      fullAddress: '',
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback 
          onPress={() => {
            Keyboard.dismiss();
            handleClose();
          }}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.title}>{title}</Text>

                {!showMap ? (
                  // Formulario limpio y simple
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
                              console.log('Cambiando ciudad a:', city);
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
                      onPress={() => {
                        setShowMap(true);
                        if (!selectedLocation) {
                          setSelectedLocation({
                            latitude: 19.4326,
                            longitude: -99.1332,
                          });
                        }
                      }}>
                      <Text style={styles.mapButtonText}>📍 Marcar mi dirección en mapa</Text>
                    </TouchableOpacity>
                    </View>
                  </ScrollView>
                ) : (
                  // Vista de mapa para selección
                  <>
                    <Text style={styles.mapInstructions}>Toca en el mapa para seleccionar tu ubicación exacta</Text>
                    <View style={styles.mapContainer}>
                      <MapView
                        ref={mapRef}
                        style={styles.map}
                        region={{
                          latitude: selectedLocation?.latitude || 19.4326,
                          longitude: selectedLocation?.longitude || -99.1332,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }}
                        onPress={handleMapPress}>
                        {selectedLocation && (
                          <Marker
                            coordinate={{
                              latitude: selectedLocation.latitude,
                              longitude: selectedLocation.longitude,
                            }}
                            title="Ubicación seleccionada"
                            pinColor="#D27F27"
                          />
                        )}
                      </MapView>
                    </View>
                  </>
                )}

                {/* Botones */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  {showMap ? (
                    <TouchableOpacity 
                      style={styles.confirmButton} 
                      onPress={() => setShowMap(false)}>
                      <Text style={styles.confirmButtonText}>Volver al formulario</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                      <Text style={styles.confirmButtonText}>Confirmar dirección</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Estilos completamente nuevos y limpios
  scrollView: {
    maxHeight: 400,
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    backgroundColor: '#FFF',
    width: '100%',
  },
  inputText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
  },
  // Ciudad - botones simples
  cityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cityButtonSelected: {
    borderColor: '#D27F27',
    backgroundColor: '#D27F27',
  },
  cityButtonText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  cityButtonTextSelected: {
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  // Alcaldías - chips organizados
  selectedContainer: {
    marginTop: 4,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#33A744',
  },
  selectedText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#33A744',
    flex: 1,
  },
  changeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#33A744',
  },
  changeButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#FFF',
  },
  dropdownWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  alcaldiaChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    marginBottom: 4,
  },
  alcaldiaChipSelected: {
    backgroundColor: '#D27F27',
    borderColor: '#D27F27',
  },
  alcaldiaChipText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
    textAlign: 'center',
  },
  alcaldiaChipTextSelected: {
    color: '#FFF',
    fontFamily: fonts.bold,
  },
  moreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginBottom: 4,
  },
  moreButtonText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#666',
    textAlign: 'center',
  },
  lessButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#E8E8E8',
    marginBottom: 4,
  },
  lessButtonText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#666',
    textAlign: 'center',
  },
  mapButton: {
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderWidth: 1,
    borderColor: '#D27F27',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  mapButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#D27F27',
  },
  mapInstructions: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  mapContainer: {
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    backgroundColor: '#F2EFE4',
  },
  map: {
    flex: 1,
    minHeight: 300,
  },
  formContainer: {
    width: '100%',
    paddingBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#33A744',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
});

export default AddressPicker;