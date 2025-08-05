import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Keyboard, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import axios from 'axios';
import fonts from '../theme/fonts';

const DeliverySlotPicker = ({ visible, onClose, onConfirm }) => {
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [days, setDays] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Generate next 4 days
  useEffect(() => {
    const tempDays = [];
    for (let i = 0; i < 4; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      tempDays.push({
        date,
        label: date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'numeric' }),
        isoDate: date.toISOString().split('T')[0], // YYYY-MM-DD format
      });
    }
    setDays(tempDays);
  }, []);

  // Fetch slots when date changes
  useEffect(() => {
    if (days.length > 0 && selectedDateIndex >= 0) {
      fetchDeliverySlots(days[selectedDateIndex].isoDate);
    }
  }, [selectedDateIndex, days]);

  const fetchDeliverySlots = async (dateString) => {
    setLoading(true);
    try {
      const response = await axios.get(`https://food.siliconsoft.pk/api/fetch_ddates/${dateString}`);
      
      // Mapear los slots del backend al formato que esperamos
      if (response.data && Array.isArray(response.data)) {
        const formattedSlots = response.data.map(slot => ({
          label: slot.time_slot || slot.label || slot,
          value: slot.time_slot || slot.value || slot,
        }));
        setAvailableSlots(formattedSlots);
      } else {
        // Fallback slots si el API falla
        setAvailableSlots([
          { label: '9:00 AM - 1:00 PM', value: '9am-1pm' },
          { label: '4:00 PM - 10:00 PM', value: '4pm-10pm' }
        ]);
      }
    } catch (error) {
      // Error fetching delivery slots
      // Fallback slots en caso de error
      setAvailableSlots([
        { label: '9:00 AM - 1:00 PM', value: '9am-1pm' },
        { label: '4:00 PM - 10:00 PM', value: '4pm-10pm' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const selectedDay = days[selectedDateIndex];
    onConfirm({ date: selectedDay.date, slot: selectedSlot });
    onClose();
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide"
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}>
      <TouchableWithoutFeedback 
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
          <Text style={styles.title}>Selecciona Fecha y Hora</Text>

          {/* Fecha */}
          <FlatList
            data={days}
            horizontal
            keyExtractor={(item) => item.date.toISOString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysList}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.dayItem,
                  selectedDateIndex === index && styles.dayItemSelected,
                ]}
                onPress={() => {
                  setSelectedDateIndex(index);
                  setSelectedSlot(null);
                }}
              >
                <Text style={[
                  styles.dayLabel,
                  selectedDateIndex === index && styles.dayLabelSelected
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Horarios */}
          <Text style={styles.subtitle}>Slots Disponibles</Text>
          <View style={styles.slotsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D27F27" />
                <Text style={styles.loadingText}>Cargando horarios...</Text>
              </View>
            ) : availableSlots.length > 0 ? (
              availableSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.value}
                  style={[
                    styles.slotItem,
                    selectedSlot === slot.value && styles.slotItemSelected,
                  ]}
                  onPress={() => setSelectedSlot(slot.value)}
                >
                  <Text style={[
                    styles.slotLabel,
                    selectedSlot === slot.value && styles.slotLabelSelected
                  ]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noSlotsText}>No hay horarios disponibles para esta fecha</Text>
            )}
          </View>

          {/* Acciones */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.buttonClose} 
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.buttonConfirm,
                !selectedSlot && styles.buttonDisabled,
              ]}
              onPress={() => {
                Keyboard.dismiss();
                handleConfirm();
              }}
              disabled={!selectedSlot}
            >
              <Text style={styles.buttonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default DeliverySlotPicker;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: fonts.size.large,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  daysList: {
    paddingVertical: 8,
  },
  dayItem: {
    padding: 10,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  dayItemSelected: {
    backgroundColor: '#D27F27',
    borderColor: '#D27F27',
  },
  dayLabel: {
    fontSize: fonts.size.small,
    textAlign: 'center',
  },
  dayLabelSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 16,
    fontSize: fonts.size.medium,
    marginBottom: 8,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
    width: '48%',
  },
  slotItemSelected: {
    backgroundColor: '#D27F27',
    borderColor: '#D27F27',
  },
  slotLabel: {
    textAlign: 'center',
    fontSize: fonts.size.small,
  },
  slotLabelSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  buttonClose: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  buttonConfirm: {
    backgroundColor: '#D27F27',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: fonts.size.small,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: fonts.size.small,
    color: '#666',
  },
  noSlotsText: {
    textAlign: 'center',
    fontSize: fonts.size.small,
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});
