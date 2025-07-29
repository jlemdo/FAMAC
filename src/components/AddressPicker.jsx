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
  // Estados para búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Estados para mapa
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const mapRef = useRef(null);
  
  // Estados para formulario de dirección estructurada
  const [addressForm, setAddressForm] = useState({
    street: '',
    number: '',
    neighborhood: '',
    postalCode: '',
    references: '',
    fullAddress: initialAddress,
  });

  // Buscar lugares con Google Places API
  const searchPlaces = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/textsearch/json`,
        {
          params: {
            query: `${query}, México`,
            key: Config.GOOGLE_DIRECTIONS_API_KEY,
            language: 'es',
            region: 'mx',
          },
        }
      );

      if (response.data.results) {
        setSearchResults(response.data.results.slice(0, 5)); // Solo primeros 5
      }
    } catch (error) {
      console.error('Error searching places:', error);
      Alert.alert('Error', 'No se pudo buscar la dirección. Intenta de nuevo.');
    } finally {
      setIsSearching(false);
    }
  };

  // Obtener detalles de un lugar específico
  const getPlaceDetails = async (placeId, location) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json`,
        {
          params: {
            place_id: placeId,
            fields: 'address_components,formatted_address,geometry',
            key: Config.GOOGLE_DIRECTIONS_API_KEY,
            language: 'es',
          },
        }
      );

      const place = response.data.result;
      if (place) {
        parseAddressComponents(place.address_components, place.formatted_address, location);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback: usar la ubicación básica
      setSelectedLocation(location);
      setAddressForm(prev => ({
        ...prev,
        fullAddress: location.formatted_address || '',
      }));
    }
  };

  // Parsear componentes de dirección de Google
  const parseAddressComponents = (components, fullAddress, location) => {
    const addressData = {
      street: '',
      number: '',
      neighborhood: '',
      postalCode: '',
      references: '',
      fullAddress: fullAddress,
    };

    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        addressData.number = component.long_name;
      } else if (types.includes('route')) {
        addressData.street = component.long_name;
      } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        addressData.neighborhood = component.long_name;
      } else if (types.includes('postal_code')) {
        addressData.postalCode = component.long_name;
      }
    });

    setAddressForm(addressData);
    setSelectedLocation({
      ...location,
      latitude: location.lat || location.latitude,
      longitude: location.lng || location.longitude,
    });
    setShowMap(true);
  };

  // Seleccionar lugar de búsqueda
  const selectPlace = (place) => {
    const location = {
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      formatted_address: place.formatted_address,
    };

    if (place.place_id) {
      getPlaceDetails(place.place_id, location);
    } else {
      setSelectedLocation(location);
      setAddressForm(prev => ({
        ...prev,
        fullAddress: place.formatted_address,
      }));
      setShowMap(true);
    }
    
    setSearchQuery('');
    setSearchResults([]);
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
    if (!selectedLocation) {
      Alert.alert('Error', 'Por favor selecciona una ubicación en el mapa.');
      return;
    }

    // Construir dirección completa
    const fullAddressString = [
      addressForm.street,
      addressForm.number,
      addressForm.neighborhood,
      addressForm.postalCode,
      addressForm.references
    ].filter(Boolean).join(', ');

    const finalAddress = {
      ...addressForm,
      fullAddress: fullAddressString || addressForm.fullAddress,
      coordinates: {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      },
    };

    onConfirm(finalAddress);
    handleClose();
  };

  // Cerrar modal
  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowMap(false);
    setSelectedLocation(null);
    setAddressForm({
      street: '',
      number: '',
      neighborhood: '',
      postalCode: '',
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.title}>{title}</Text>

                {!showMap ? (
                  // Vista de búsqueda
                  <>
                    <View style={styles.searchContainer}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar dirección..."
                        placeholderTextColor="rgba(47,47,47,0.6)"
                        value={searchQuery}
                        onChangeText={(text) => {
                          setSearchQuery(text);
                          searchPlaces(text);
                        }}
                        autoFocus={Platform.OS !== 'ios'}
                      />
                      {isSearching && (
                        <ActivityIndicator style={styles.searchLoader} color="#D27F27" />
                      )}
                    </View>

                    {searchResults.length > 0 && (
                      <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.place_id}
                        style={styles.resultsList}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.resultItem}
                            onPress={() => selectPlace(item)}>
                            <Text style={styles.resultText}>{item.name}</Text>
                            <Text style={styles.resultSubtext}>{item.formatted_address}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    )}

                    <TouchableOpacity
                      style={styles.mapButton}
                      onPress={() => {
                        setShowMap(true);
                        setSelectedLocation({
                          latitude: 19.4326, // CDMX default
                          longitude: -99.1332,
                        });
                      }}>
                      <Text style={styles.mapButtonText}>📍 Seleccionar en mapa</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  // Vista de mapa y formulario
                  <>
                    <View style={styles.mapContainer}>
                      {selectedLocation ? (
                        <MapView
                          ref={mapRef}
                          style={styles.map}
                          region={{
                            latitude: selectedLocation.latitude,
                            longitude: selectedLocation.longitude,
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
                      ) : (
                        <View style={styles.mapPlaceholder}>
                          <Text style={styles.mapPlaceholderText}>
                            Busca una dirección para ver el mapa
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Formulario de dirección estructurada */}
                    <View style={styles.formContainer}>
                      <View style={styles.formRow}>
                        <TextInput
                          style={[styles.formInput, { flex: 2 }]}
                          placeholder="Calle"
                          placeholderTextColor="rgba(47,47,47,0.6)"
                          value={addressForm.street}
                          onChangeText={(text) => setAddressForm(prev => ({ ...prev, street: text }))}
                        />
                        <TextInput
                          style={[styles.formInput, { flex: 1, marginLeft: 8 }]}
                          placeholder="Número"
                          placeholderTextColor="rgba(47,47,47,0.6)"
                          value={addressForm.number}
                          onChangeText={(text) => setAddressForm(prev => ({ ...prev, number: text }))}
                        />
                      </View>

                      <View style={styles.formRow}>
                        <TextInput
                          style={[styles.formInput, { flex: 2 }]}
                          placeholder="Colonia"
                          placeholderTextColor="rgba(47,47,47,0.6)"
                          value={addressForm.neighborhood}
                          onChangeText={(text) => setAddressForm(prev => ({ ...prev, neighborhood: text }))}
                        />
                        <TextInput
                          style={[styles.formInput, { flex: 1, marginLeft: 8 }]}
                          placeholder="C.P."
                          placeholderTextColor="rgba(47,47,47,0.6)"
                          value={addressForm.postalCode}
                          onChangeText={(text) => setAddressForm(prev => ({ ...prev, postalCode: text }))}
                          keyboardType="numeric"
                        />
                      </View>

                      <TextInput
                        style={styles.formInput}
                        placeholder="Referencias (opcional)"
                        placeholderTextColor="rgba(47,47,47,0.6)"
                        value={addressForm.references}
                        onChangeText={(text) => setAddressForm(prev => ({ ...prev, references: text }))}
                        multiline
                        numberOfLines={2}
                      />
                    </View>
                  </>
                )}

                {/* Botones */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  {showMap && (
                    <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                      <Text style={styles.confirmButtonText}>Confirmar</Text>
                    </TouchableOpacity>
                  )}

                  {!showMap && (
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => setShowMap(false)}>
                      <Text style={styles.backButtonText}>Buscar</Text>
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  searchLoader: {
    marginLeft: 12,
  },
  resultsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.1)',
  },
  resultText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  resultSubtext: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: 'rgba(47,47,47,0.7)',
  },
  mapButton: {
    backgroundColor: '#D27F27',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  mapButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
  mapContainer: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    backgroundColor: '#F2EFE4',
  },
  map: {
    flex: 1,
    minHeight: 250,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EFE4',
    minHeight: 250,
  },
  mapPlaceholderText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: 'rgba(47,47,47,0.6)',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  formInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
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
  backButton: {
    flex: 1,
    backgroundColor: '#D27F27',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
});

export default AddressPicker;