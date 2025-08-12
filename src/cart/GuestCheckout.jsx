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
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import DeliverySlotPicker from '../components/DeliverySlotPicker';
import fonts from '../theme/fonts';
import { useKeyboardBehavior } from '../hooks/useKeyboardBehavior';

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
  const [loading, setLoading] = useState(false);
  
  // Verificar si el email debe estar bloqueado
  const [emailLocked, setEmailLocked] = useState(false);

  useEffect(() => {
    // Inicializar email si el guest ya tiene uno
    if (user?.usertype === 'Guest' && user?.email && user?.email?.trim() !== '') {
      setEmail(user.email);
      setEmailLocked(true);
    }
  }, [user]);

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
        
        // Limpiar los parámetros
        navigation.setParams({ 
          selectedAddress: undefined,
          shouldGoToStep2: undefined,
          preservedEmail: undefined,
        });
      }
    }, [route.params?.selectedAddress, route.params?.shouldGoToStep2, route.params?.preservedEmail, navigation])
  );

  // Función para validar email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
      setCurrentStep(2);
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
    console.log('=== DEBUG GUEST CHECKOUT ===');
    console.log('Email:', email);
    console.log('Address:', address);
    console.log('Email trimmed:', email?.trim());
    console.log('Address trimmed:', address?.trim());
    console.log('Email valid?', !!email?.trim());
    console.log('Address valid?', !!address?.trim());
    
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
      // Actualizar email en contexto si es necesario
      if (user?.usertype === 'Guest' && (!user?.email || user?.email?.trim() === '') && email?.trim()) {
        await updateUser({ email: email.trim() });
      }
      
      // Navegar de regreso con los datos
      console.log('=== NAVEGANDO DE VUELTA AL CART ===');
      console.log('returnToCart:', returnToCart);
      console.log('Datos preservados a enviar:', {
        email: email.trim(),
        address: address.trim(),
        preservedDeliveryInfo,
        preservedNeedInvoice,
        preservedTaxDetails,
      });
      
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
            }
          }
        });
        console.log('Navegación a MainTabs enviada');
      } else {
        console.log('Haciendo goBack()');
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

  // Renderizar stepper
  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      <View style={styles.stepperContent}>
        <View style={styles.step}>
          <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>Email</Text>
        </View>
        
        <View style={styles.stepLine} />
        
        <View style={styles.step}>
          <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>Dirección</Text>
        </View>
      </View>
    </View>
  );

  // Renderizar paso 1 - Email
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📧 Tu correo electrónico</Text>
      <Text style={styles.stepDescription}>
        Necesitamos tu email para enviarte la confirmación del pedido
      </Text>
      
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

  // Renderizar paso 2 - Dirección
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📍 Dirección de entrega</Text>
      <Text style={styles.stepDescription}>
        Selecciona dónde quieres recibir tu pedido
      </Text>
      
      <TouchableOpacity
        style={styles.addressButton}
        onPress={() => {
          console.log('=== GUEST CHECKOUT NAVEGANDO A ADDRESS FORM ===');
          console.log('Enviando preservedDeliveryInfo:', preservedDeliveryInfo);
          console.log('Enviando preservedNeedInvoice:', preservedNeedInvoice);
          console.log('Enviando preservedTaxDetails:', preservedTaxDetails);
          
          // Navegar al nuevo AddressFormUberStyle (estilo Uber Eats)
          navigation.navigate('AddressFormUberStyle', {
            initialAddress: address,
            title: 'Dirección de Entrega',
            returnScreen: 'GuestCheckout',
            // Pasar parámetros que espera AddressFormUberStyle para funcionar correctamente
            pickerId: null, // No usar sistema de callbacks
            fromGuestCheckout: true,
            // IMPORTANTE: Pasar todos los parámetros originales del pedido para preservarlos
            totalPrice: totalPrice,
            itemCount: itemCount,
            returnToCart: returnToCart,
            // CRITICAL: Pasar TODOS los datos preservados del Cart - convertir Date a string
            preservedDeliveryInfo: preservedDeliveryInfo ? {
              ...preservedDeliveryInfo,
              date: typeof preservedDeliveryInfo.date === 'string' 
                ? preservedDeliveryInfo.date 
                : preservedDeliveryInfo.date.toISOString(),
            } : preservedDeliveryInfo,
            preservedNeedInvoice: preservedNeedInvoice,
            preservedTaxDetails: preservedTaxDetails,
            // Email y dirección actuales
            currentEmail: email,
            currentAddress: address,
          });
        }}
        activeOpacity={0.7}>
        <Text style={address ? styles.addressText : styles.addressPlaceholder}>
          {address || 'Seleccionar dirección completa'}
        </Text>
        <Text style={styles.addressIcon}>📍</Text>
      </TouchableOpacity>
      
      {address ? (
        <View style={styles.addressPreview}>
          <Text style={styles.addressPreviewLabel}>Dirección seleccionada:</Text>
          <Text style={styles.addressPreviewText}>{address}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      {...keyboardAvoidingViewProps}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout Invitado</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Stepper */}
      {renderStepper()}
      
      {/* Resumen del pedido */}
      <View style={styles.orderSummary}>
        <Text style={styles.orderSummaryTitle}>📦 Resumen del pedido</Text>
        <Text style={styles.orderSummaryDetails}>
          {itemCount || 0} {itemCount === 1 ? 'producto' : 'productos'} • Total: ${totalPrice || '0.00'}
        </Text>
      </View>

      {/* Contenido del paso */}
      <ScrollView 
        {...scrollViewProps}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !validateStep(currentStep) && styles.continueButtonDisabled,
            loading && styles.continueButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!validateStep(currentStep) || loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.continueButtonText}>
              {currentStep === 2 ? 'Completar Pedido' : 'Continuar'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      
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
  stepperContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  stepperContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#D27F27',
  },
  stepNumber: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#999',
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepLabel: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
  },
  stepLabelActive: {
    color: '#D27F27',
    fontFamily: fonts.bold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 16,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
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