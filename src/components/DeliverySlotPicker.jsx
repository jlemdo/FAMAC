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

  // 🆕 NUEVA LÓGICA: Obtener días de entrega desde el backend
  useEffect(() => {
    fetchDeliveryDaysFromBackend();
  }, []);

  // Obtener días activos desde el backend
  const fetchDeliveryDaysFromBackend = async () => {
    try {
      const response = await axios.get('https://awsoccr.pixelcrafters.digital/api/delivery-days');
      
      if (response.data && response.data.status === 'success') {
        const backendDays = response.data.data;
        
        // Generar fechas basadas en los días activos del backend
        const deliveryDates = generateDeliveryDatesFromBackend(backendDays);
        
        const tempDays = [];
        deliveryDates.forEach((date, i) => {
          const dayObj = {
            date,
            label: date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'numeric' }),
            isoDate: date.toISOString().split('T')[0],
            isClosest: i === 0, // Solo el primer día (más cercano) tiene estrella
          };
          
          // console.log(`Día ${i}:`, dayObj.label, 'isClosest:', dayObj.isClosest);
          tempDays.push(dayObj);
        });
        
        setDays(tempDays);
        
        if (tempDays.length > 0) {
          setSelectedDateIndex(0);
        }
      } else {
        useFallbackDays();
      }
    } catch (error) {
      useFallbackDays();
    }
  };

  // Generar fechas futuras basadas en días configurados en backend
  const generateDeliveryDatesFromBackend = (backendDays) => {
    const today = new Date();
    const dates = [];
    
    // Obtener números de días activos desde el backend (ordenados por prioridad)
    const activeDayNumbers = backendDays
      .filter(day => day.number) // Asegurar que tenga número de día
      .sort((a, b) => a.priority - b.priority)
      .map(day => day.number); // 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, etc.
    
    
    if (activeDayNumbers.length === 0) {
      return []; // No hay días configurados
    }
    
    // Generar próximas 4 fechas de entrega (aumentado de 3 a 4)
    let daysFound = 0;
    let searchDate = new Date(today);
    
    while (daysFound < 4) {
      const dayOfWeek = searchDate.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
      
      // Convertir a nuestro formato (1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie)
      const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek; // Domingo = 7
      
      if (activeDayNumbers.includes(dayNumber)) {
        // NUNCA incluir el día de hoy - solo días futuros
        const isToday = searchDate.toDateString() === today.toDateString();

        if (!isToday) {
          dates.push(new Date(searchDate));
          daysFound++;
        }
      }
      
      searchDate.setDate(searchDate.getDate() + 1);
      
      // Evitar bucle infinito
      if (searchDate.getTime() - today.getTime() > 30 * 24 * 60 * 60 * 1000) {
        break;
      }
    }
    
    return dates;
  };

  // Fallback usando lógica anterior si falla el backend
  const useFallbackDays = () => {
    const deliveryDates = getDeliveryDatesBasedOnLogic();
    const tempDays = deliveryDates.map((date, i) => ({
      date,
      label: date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'numeric' }),
      isoDate: date.toISOString().split('T')[0],
      isClosest: i === 0,
    }));
    
    setDays(tempDays);
    if (tempDays.length > 0) {
      setSelectedDateIndex(0);
    }
  };

  // 🆕 FUNCIÓN PRINCIPAL: Obtener fechas de entrega según lógica de negocio
  const getDeliveryDatesBasedOnLogic = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
    const currentHour = now.getHours();
    
    
    let nextDeliveryDay;
    
    // LÓGICA DE ENTREGA:
    // Días de entrega: MIÉRCOLES (3) y LUNES (1)
    
    if (currentDay === 0 || currentDay === 6 || currentDay === 1 || 
        (currentDay === 2 && currentHour < 12)) {
      // Domingo, Sábado, Lunes, o Martes antes de mediodía → MIÉRCOLES
      nextDeliveryDay = getNextWednesday();
    } 
    else if ((currentDay === 2 && currentHour >= 12) || currentDay === 3 || currentDay === 4) {
      // Martes después de mediodía, Miércoles, o Jueves → LUNES siguiente  
      nextDeliveryDay = getNextMonday();
    }
    else if (currentDay === 2 && currentHour >= 12 || currentDay === 3 || 
             currentDay === 4 || currentDay === 5 || (currentDay === 6 && currentHour < 12)) {
      // Martes PM, Miércoles, Jueves, Viernes, o Sábado AM → LUNES siguiente
      nextDeliveryDay = getNextMonday();
    }
    else {
      // Fallback - siguiente miércoles
      nextDeliveryDay = getNextWednesday();
    }
    
    // Obtener 3 opciones alternando miércoles y lunes
    const deliveryOptions = [];
    
    if (nextDeliveryDay.getDay() === 3) { // Si empieza con miércoles
      deliveryOptions.push(nextDeliveryDay); // Este miércoles
      deliveryOptions.push(getDateAfterDays(nextDeliveryDay, 5)); // Lunes siguiente
      deliveryOptions.push(getDateAfterDays(nextDeliveryDay, 7)); // Miércoles siguiente
    } else { // Si empieza con lunes
      deliveryOptions.push(nextDeliveryDay); // Este lunes
      deliveryOptions.push(getDateAfterDays(nextDeliveryDay, 2)); // Miércoles siguiente  
      deliveryOptions.push(getDateAfterDays(nextDeliveryDay, 7)); // Lunes siguiente
    }
    
    return deliveryOptions;
  };

  // Helper: Obtener próximo miércoles
  const getNextWednesday = () => {
    const today = new Date();
    const daysUntilWednesday = (3 - today.getDay() + 7) % 7;
    const nextWed = new Date(today);
    nextWed.setDate(today.getDate() + (daysUntilWednesday === 0 ? 7 : daysUntilWednesday));
    return nextWed;
  };

  // Helper: Obtener próximo lunes  
  const getNextMonday = () => {
    const today = new Date();
    const daysUntilMonday = (1 - today.getDay() + 7) % 7;
    const nextMon = new Date(today);
    nextMon.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
    return nextMon;
  };

  // Helper: Agregar días a una fecha
  const getDateAfterDays = (date, days) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);
    return newDate;
  };
  
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
      const response = await axios.get(`https://awsoccr.pixelcrafters.digital/api/fetch_ddates/${dateString}`);
      
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
          { label: '4:00 PM - 12:00 PM', value: '4pm-12pm' }
        ];
      }
      
      // ✅ MOSTRAR TODOS LOS HORARIOS del backend sin filtrar - Sin lógica de filtros
      setAvailableSlots(slotsToProcess);
      
    } catch (error) {
      // Error fetching delivery slots - usar fallback sin filtros
      let fallbackSlots = [
        { label: '9:00 AM - 1:00 PM', value: '9am-1pm' },
        { label: '4:00 PM - 12:00 PM', value: '4pm-12pm' }
      ];

      // ✅ FALLBACK: Mostrar TODOS los horarios sin filtrar
      setAvailableSlots(fallbackSlots);
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
          <Text style={styles.title}>Seleccionar Fecha y Horario</Text>
          
          {/* 🆕 Sección mejorada para elección de día */}
          <View style={styles.deliveryDaySection}>
            <View style={styles.deliveryDayHeader}>
              <Text style={styles.deliveryDayTitle}>📅 Elige tu día de entrega</Text>
              <View style={styles.deliveryDayInfo}>
                <Text style={styles.deliveryDaySubtitle}>Días de entrega disponibles</Text>
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
                    {item.isClosest && <Text style={styles.starIcon}>⭐️ </Text>}
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
