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

  // 🆕 NUEVA LÓGICA: Mostrar TODOS los jueves y domingos disponibles
  useEffect(() => {
    const tempDays = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    
    // Generar próximos 3-4 Jueves y Domingos, ordenados por proximidad
    const deliveryDates = [];
    
    // Obtener próximos 3 jueves
    const nextThursdays = getNextWeekdays(4, 3); // 4=Jueves
    // Obtener próximos 3 domingos  
    const nextSundays = getNextWeekdays(0, 3); // 0=Domingo
    
    // Combinar todas las fechas
    deliveryDates.push(...nextThursdays, ...nextSundays);
    
    // Ordenar por fecha (más cercana primero)
    deliveryDates.sort((a, b) => a.getTime() - b.getTime());
    
    // Determinar cuál es el día preferente según cuándo compra
    let preferredDay = '';
    if ([6, 0, 1].includes(dayOfWeek)) {
      preferredDay = 'Jueves'; // Sábado, Domingo, Lunes → prefieren Jueves
    } else {
      preferredDay = 'Domingo'; // Martes, Miércoles, Jueves, Viernes → prefieren Domingo
    }
    
    // Tomar las primeras 4-5 fechas más cercanas
    const selectedDates = deliveryDates.slice(0, 5);
    
    selectedDates.forEach((date, i) => {
      const isThursday = date.getDay() === 4;
      const isSunday = date.getDay() === 0;
      const isPreferred = (isThursday && preferredDay === 'Jueves') || (isSunday && preferredDay === 'Domingo');
      
      const dayObj = {
        date,
        label: date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'numeric' }),
        isoDate: date.toISOString().split('T')[0],
        isPreferred, // Para destacar visualmente la opción recomendada
      };
      tempDays.push(dayObj);
    });
    
    setDays(tempDays);
    
    // 🆕 Auto-seleccionar la primera fecha (más cercana)
    if (tempDays.length > 0) {
      setSelectedDateIndex(0);
    }
  }, []);
  
  // Helper function para obtener próximos días específicos de la semana
  const getNextWeekdays = (targetDay, count) => {
    const dates = [];
    const today = new Date();
    let current = new Date(today);
    
    // Encontrar el próximo día objetivo
    let daysUntilTarget = (targetDay - current.getDay() + 7) % 7;
    if (daysUntilTarget === 0) daysUntilTarget = 7; // Si es hoy, ir a la próxima semana
    
    current.setDate(current.getDate() + daysUntilTarget);
    
    // Generar las próximas fechas del día objetivo
    for (let i = 0; i < count; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7); // Próxima semana
    }
    
    return dates;
  };

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
      
      let slotsToProcess = [];
      
      // Mapear los slots del backend al formato que esperamos
      if (response.data && Array.isArray(response.data)) {
        slotsToProcess = response.data.map(slot => ({
          label: slot.time_slot || slot.label || slot,
          value: slot.time_slot || slot.value || slot,
        }));
      } else {
        // Fallback slots si el API falla
        slotsToProcess = [
          { label: '9:00 AM - 1:00 PM', value: '9am-1pm' },
          { label: '4:00 PM - 10:00 PM', value: '4pm-10pm' }
        ];
      }
      
      // 🆕 FILTRAR horarios pasados si es el día actual de compra
      const today = new Date();
      const selectedDate = new Date(dateString);
      const isToday = today.toDateString() === selectedDate.toDateString();
      
      if (isToday) {
        const currentHour = today.getHours();
        const filteredSlots = slotsToProcess.filter(slot => {
          return !isSlotPassed(slot.value, currentHour);
        });
        setAvailableSlots(filteredSlots);
      } else {
        setAvailableSlots(slotsToProcess);
      }
      
    } catch (error) {
      // Error fetching delivery slots - usar fallback con filtros
      let fallbackSlots = [
        { label: '9:00 AM - 1:00 PM', value: '9am-1pm' },
        { label: '4:00 PM - 10:00 PM', value: '4pm-10pm' }
      ];
      
      // Aplicar filtro incluso al fallback si es hoy
      const today = new Date();
      const selectedDate = new Date(dateString);
      const isToday = today.toDateString() === selectedDate.toDateString();
      
      if (isToday) {
        const currentHour = today.getHours();
        fallbackSlots = fallbackSlots.filter(slot => {
          return !isSlotPassed(slot.value, currentHour);
        });
      }
      
      setAvailableSlots(fallbackSlots);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function para determinar si un horario ya pasó
  const isSlotPassed = (slotValue, currentHour) => {
    // Parsear el horario para obtener la hora de fin
    // Ejemplos: '9am-1pm' -> hora de fin: 13, '4pm-10pm' -> hora de fin: 22
    const timeSlot = slotValue.toLowerCase();
    let endHour = 0;
    
    if (timeSlot.includes('1pm') || timeSlot.includes('13')) {
      endHour = 13; // 1:00 PM
    } else if (timeSlot.includes('10pm') || timeSlot.includes('22')) {
      endHour = 22; // 10:00 PM
    } else if (timeSlot.includes('pm')) {
      // Para otros horarios PM, extraer el número
      const match = timeSlot.match(/(\d+)pm/);
      if (match) {
        endHour = parseInt(match[1]) === 12 ? 12 : parseInt(match[1]) + 12;
      }
    } else if (timeSlot.includes('am')) {
      // Para horarios AM
      const match = timeSlot.match(/(\d+)am/);
      if (match) {
        endHour = parseInt(match[1]) === 12 ? 0 : parseInt(match[1]);
      }
    }
    
    // Si la hora actual es mayor o igual a la hora de fin del slot, ya pasó
    return currentHour >= endHour;
  };

  const handleConfirm = () => {
    const selectedDay = days[selectedDateIndex];
    // console.log('📅 DELIVERY SLOT PICKER - CONFIRMANDO:');
    // console.log('- selectedDay:', selectedDay);
    // console.log('- selectedDay.date:', selectedDay.date);
    // console.log('- selectedDay.date type:', typeof selectedDay.date);
    // console.log('- selectedSlot:', selectedSlot);
    
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
          <Text style={styles.title}>Seleccionar Fecha y Horario</Text>
          
          {/* 🆕 Sección mejorada para elección de día */}
          <View style={styles.deliveryDaySection}>
            <View style={styles.deliveryDayHeader}>
              <Text style={styles.deliveryDayTitle}>📅 Elige tu día de entrega</Text>
              <View style={styles.deliveryDayInfo}>
                <Text style={styles.deliveryDaySubtitle}>Solo entregamos Jueves y Domingos</Text>
                <Text style={styles.recommendedHint}>⭐ Más cercano a tu compra</Text>
              </View>
            </View>
          </View>

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
                  selectedDateIndex === index && styles.dayItemSelected, // Solo mostrar selección cuando esté activo
                ]}
                onPress={() => {
                  setSelectedDateIndex(index);
                  setSelectedSlot(null);
                }}
              >
                <View style={styles.dayContent}>
                  <Text style={[
                    styles.dayLabel,
                    selectedDateIndex === index && styles.dayLabelSelected,
                  ]}>
                    {item.isPreferred && <Text style={styles.starIcon}>⭐️ </Text>}
                    {item.label}
                  </Text>
                </View>
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
    marginBottom: 8,
    textAlign: 'center',
    color: '#2F2F2F',
  },
  // 🆕 Estilos para sección de elección de día mejorada
  deliveryDaySection: {
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
  },
  deliveryDayHeader: {
    alignItems: 'center',
  },
  deliveryDayTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  deliveryDayInfo: {
    alignItems: 'center',
    gap: 4,
  },
  deliveryDaySubtitle: {
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
    fontFamily: fonts.regular,
  },
  recommendedHint: {
    fontSize: fonts.size.small,
    color: '#666',
    fontStyle: 'italic',
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
    minWidth: 80, // 🆕 Ancho mínimo para acomodar más fechas
  },
  dayItemSelected: {
    backgroundColor: '#D27F27',
    borderColor: '#D27F27',
  },
  dayItemPreferred: {
    borderColor: '#33A744', // Verde para día recomendado
    borderWidth: 2,
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
  },
  dayLabel: {
    fontSize: fonts.size.small,
    textAlign: 'center',
    lineHeight: 18,
  },
  dayLabelSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayLabelPreferred: {
    color: '#33A744',
    fontWeight: 'bold',
  },
  starIcon: {
    fontSize: 10,
  },
  dayContent: {
    alignItems: 'center',
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
