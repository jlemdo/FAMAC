import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import DeliverySlotPicker from '../components/DeliverySlotPicker';
import fonts from '../theme/fonts';
import { useKeyboardBehavior } from '../hooks/useKeyboardBehavior';
import { validateEmail } from '../utils/addressValidators';
import { navigateToGuestCheckout, navigateToGuestEdit } from '../utils/addressNavigation';

export default function GuestCheckout() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, updateUser } = useContext(AuthContext);
  const { showAlert } = useAlert();
  
  // 🔧 Hook para manejo profesional del teclado
  const { 
    scrollViewRef, 
    registerInput, 
    createFocusHandler, 
    keyboardAvoidingViewProps, 
    scrollViewProps 
  } = useKeyboardBehavior();
  
  // Parámetros recibidos del Cart
  const { 
    totalPrice, 
    itemCount, 
    returnToCart,
    editingAddress, // 🆕 NUEVO: Flag para indicar que está editando dirección
    // Datos preservados del formulario de Cart
    preservedDeliveryInfo,
    preservedNeedInvoice,
    preservedTaxDetails,
    currentEmail,
    currentAddress
  } = route.params || {};
  
  // Estados del formulario
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState(currentEmail || '');
  const [address, setAddress] = useState(currentAddress || '');
  const [coordinates, setCoordinates] = useState(null); // NUEVO: Estado para coordenadas
  const [loading, setLoading] = useState(false);
  
  // Verificar si el email debe estar bloqueado
  const [emailLocked, setEmailLocked] = useState(false);

  useEffect(() => {
    // Inicializar email si el guest ya tiene uno
    if (user?.usertype === 'Guest' && user?.email && user?.email?.trim() !== '') {
      setEmail(user.email);
      setEmailLocked(true);
    }
    
    // Si viene con currentEmail, usar ese
    if (currentEmail && currentEmail.trim() !== '') {
      setEmail(currentEmail);
      setEmailLocked(true);
    }
    
    // 🆕 FLUJO SIMPLIFICADO: Si está editando dirección, ir directo a AddressFormUberStyle
    if (editingAddress && currentEmail && currentEmail.trim() !== '') {
      // Ir directo a selección de dirección, saltando todo el flow de GuestCheckout
      setTimeout(() => {
        navigateToGuestEdit(navigation, {
          initialAddress: currentAddress || '',
          guestEmail: currentEmail,
          currentEmail: currentEmail, // ✅ REQUERIDO por AddressFormUberStyle
          totalPrice: totalPrice, // ✅ REQUERIDO por validación
          itemCount: itemCount, // ✅ REQUERIDO por validación
          // Preservar datos para que regrese al carrito con todo intacto
          preservedDeliveryInfo: preservedDeliveryInfo,
          preservedNeedInvoice: preservedNeedInvoice,
          preservedTaxDetails: preservedTaxDetails,
          preservedCoordinates: route.params?.preservedCoordinates,
        });
      }, 100);
    }
  }, [user, editingAddress, currentEmail]);

  // Escuchar cuando regresa de AddressForm
  useFocusEffect(
    React.useCallback(() => {
      // Revisar si hay datos de dirección en los parámetros
      if (route.params?.selectedAddress) {
        setAddress(route.params.selectedAddress);
        
        // Si debe ir al paso 2, cambiar el step
        if (route.params?.shouldGoToStep2) {
          setCurrentStep(2);
        }
        
        // CRÍTICO: Restaurar el email preservado si existe
        if (route.params?.preservedEmail && route.params.preservedEmail.trim() !== '') {
          setEmail(route.params.preservedEmail);
        }
        
        // NUEVO: Manejar coordenadas seleccionadas del mapa
        if (route.params?.selectedCoordinates) {
          setCoordinates(route.params.selectedCoordinates);
        }
        
        // ✅ SCROLL AUTOMÁTICO al botón "Completar Pedido" cuando regresa con dirección
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
        
        // Limpiar los parámetros
        navigation.setParams({ 
          selectedAddress: undefined,
          shouldGoToStep2: undefined,
          preservedEmail: undefined,
          selectedCoordinates: undefined,
        });
      }
    }, [route.params?.selectedAddress, route.params?.shouldGoToStep2, route.params?.preservedEmail, route.params?.selectedCoordinates, navigation])
  );

  // Función para validar email
  // Email validation moved to addressValidators.js utility

  // Validar paso actual
  const validateStep = (step) => {
    if (step === 1) {
      return email?.trim() !== '' && validateEmail(email.trim());
    }
    if (step === 2) {
      return address?.trim() !== '';
    }
    return false;
  };

  // Navegar al siguiente paso
  const handleNext = () => {
    if (!validateStep(currentStep)) {
      let message = '';
      
      if (currentStep === 1) {
        if (!email?.trim()) {
          message = 'Por favor ingresa tu correo electrónico';
        } else if (!validateEmail(email.trim())) {
          message = 'Por favor ingresa un correo electrónico válido';
        }
      } else if (currentStep === 2) {
        message = 'Por favor selecciona tu dirección de entrega';
      }
      
      showAlert({
        type: 'warning',
        title: 'Campo requerido',
        message: message,
        confirmText: 'Entendido',
      });
      return;
    }

    if (currentStep === 1) {
      // Ir directamente al AddressFormUberStyle usando helper unificado
      navigateToGuestCheckout(navigation, {
        initialAddress: address,
        returnScreen: 'GuestCheckout',
        pickerId: null,
        totalPrice: totalPrice,
        itemCount: itemCount,
        returnToCart: returnToCart,
        preservedDeliveryInfo: preservedDeliveryInfo ? {
          ...preservedDeliveryInfo,
          date: typeof preservedDeliveryInfo.date === 'string' 
            ? preservedDeliveryInfo.date 
            : preservedDeliveryInfo.date.toISOString(),
        } : preservedDeliveryInfo,
        preservedNeedInvoice: preservedNeedInvoice,
        preservedTaxDetails: preservedTaxDetails,
        currentEmail: email,
        currentAddress: address,
      });
    } else if (currentStep === 2) {
      handleComplete();
    }
  };

  // Regresar al paso anterior
  const handleBack = () => {
    if (currentStep === 1) {
      navigation.goBack();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // Completar checkout
  const handleComplete = async () => {
    // Debug: verificar qué valores tenemos
    
    if (!email?.trim() || !address?.trim()) {
      const missingFields = [];
      if (!email?.trim()) missingFields.push('Email');
      if (!address?.trim()) missingFields.push('Dirección');
      
      showAlert({
        type: 'warning',
        title: 'Datos incompletos',
        message: `Faltan los siguientes campos: ${missingFields.join(', ')}.\n\nEmail: "${email}"\nDirección: "${address}"`,
        confirmText: 'Entendido',
      });
      return;
    }

    setLoading(true);
    
    try {
      // ✅ FIX: NO actualizar email aquí - se hace SOLO después del pago exitoso en Cart.jsx
      // El email se guarda únicamente cuando el pago se completa correctamente
      
      // Navegar de regreso con los datos
      // console.log('Datos preservados a enviar:', {
        // email: email.trim(),
        // address: address.trim(),
        // preservedDeliveryInfo,
        // preservedNeedInvoice,
        // preservedTaxDetails,
      // });
      
      if (returnToCart) {
        navigation.navigate('MainTabs', {
          screen: 'Carrito',
          params: {
            guestData: {
              email: email.trim(),
              address: address.trim(),
              // CRITICAL: Preservar TODOS los datos del formulario de Cart - convertir Date a string
              preservedDeliveryInfo: preservedDeliveryInfo ? {
                ...preservedDeliveryInfo,
                date: typeof preservedDeliveryInfo.date === 'string' 
                  ? preservedDeliveryInfo.date 
                  : preservedDeliveryInfo.date.toISOString(), // Convertir Date a string si es necesario
              } : preservedDeliveryInfo,
              preservedNeedInvoice,
              preservedTaxDetails,
              preservedCoordinates: coordinates, // ✅ Agregar coordenadas del mapa
            }
          }
        });
      } else {
        navigation.goBack();
      }
      
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Hubo un problema al procesar tu información. Inténtalo de nuevo.',
        confirmText: 'Cerrar',
      });
    } finally {
      setLoading(false);
    }
  };

  // Renderizar información simple del proceso
  const renderProcessInfo = () => (
    <View style={styles.processInfoContainer}>
      <Text style={styles.processTitle}>📧 Ingresa tu email</Text>
      <Text style={styles.processDescription}>
        Después podrás elegir tu dirección de entrega
      </Text>
    </View>
  );

  // Renderizar formulario de email
  const renderEmailForm = () => (
    <View style={styles.stepContent}>
      <TextInput
        ref={(ref) => registerInput('email', ref)}
        style={[
          styles.input, 
          emailLocked && styles.disabledInput,
          email.trim() && !validateEmail(email.trim()) && styles.inputError
        ]}
        placeholder="correo@ejemplo.com"
        value={email}
        onChangeText={setEmail}
        onFocus={!emailLocked ? createFocusHandler('email') : undefined}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!emailLocked}
        placeholderTextColor="rgba(47,47,47,0.6)"
        returnKeyType="done"
      />
      
      {email.trim() && !validateEmail(email.trim()) && !emailLocked && (
        <Text style={styles.errorText}>
          ⚠️ Por favor ingresa un email válido
        </Text>
      )}
      
      {emailLocked && (
        <Text style={styles.lockedText}>
          🔒 Este email ya fue usado en tu dispositivo
        </Text>
      )}
    </View>
  );


  return (
    <KeyboardAvoidingView 
      style={styles.container}
      {...keyboardAvoidingViewProps}>
      
      {/* Header estático */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmar Pedido</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Información del proceso */}
      {renderProcessInfo()}
      
      {/* Contenido scrolleable */}
      <TouchableWithoutFeedback onPress={() => {}}>
        <ScrollView 
          {...scrollViewProps}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}>
          
          {/* Resumen del pedido */}
          <View style={styles.orderSummary}>
            <Text style={styles.orderSummaryTitle}>📦 Resumen del pedido</Text>
            <Text style={styles.orderSummaryDetails}>
              {itemCount || 0} {itemCount === 1 ? 'producto' : 'productos'} • Total: ${totalPrice || '0.00'}
            </Text>
          </View>

          {/* Formulario de email */}
          <View style={styles.stepContentContainer}>        
            {renderEmailForm()}
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !validateStep(1) && styles.continueButtonDisabled,
                loading && styles.continueButtonDisabled
              ]}
              onPress={handleNext}
              disabled={!validateStep(1) || loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.continueButtonText}>Continuar a Dirección</Text>
              )}
            </TouchableOpacity>
          </View>
          
        </ScrollView>
      </TouchableWithoutFeedback>
      
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#D27F27',
  },
  headerTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  headerRight: {
    width: 60, // Balancear el header
  },
  processInfoContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.2)',
  },
  processTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  processDescription: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  orderSummary: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderSummaryTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  orderSummaryDetails: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContentContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  stepContent: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    backgroundColor: '#FFF',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: 'rgba(47,47,47,0.6)',
  },
  lockedText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  addressText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    flex: 1,
  },
  addressPlaceholder: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)',
    flex: 1,
  },
  addressIcon: {
    fontSize: fonts.size.large,
    marginLeft: 12,
  },
  addressPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(210, 127, 39, 0.2)',
  },
  addressPreviewLabel: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 4,
  },
  addressPreviewText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 20,
  },
  bottomActions: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 94, 60, 0.2)',
  },
  continueButton: {
    backgroundColor: '#D27F27',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  inputError: {
    borderColor: '#E63946',
    borderWidth: 2,
  },
  errorText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#E63946',
    marginTop: 4,
    marginBottom: 8,
  },
});