import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import fonts from '../theme/fonts';
import { scaleSpacing, scaleFontSize } from '../utils/responsiveUtils';

/**
 * Componente de entrada de cupones de descuento
 * @param {Object} props
 * @param {Function} props.onCouponApply - Callback cuando se aplica un cupón exitosamente
 * @param {Function} props.onCouponRemove - Callback cuando se remueve un cupón
 * @param {Object} props.appliedCoupon - Cupón aplicado actualmente {code, discount, type}
 * @param {number} props.subtotal - Subtotal para calcular descuentos
 */
const CouponInput = ({ 
  onCouponApply, 
  onCouponRemove, 
  appliedCoupon, 
  subtotal = 0,
  isValid = true // Nuevo prop para indicar si el cupón aún es válido
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 🧪 CUPONES DE PRUEBA - Remover cuando el backend esté listo
  const TEST_COUPONS = {
    'queso25': {
      code: 'queso25',
      discount: 25,
      type: 'percentage', // 'percentage' o 'fixed'
      description: '25% de descuento',
      minAmount: 100, // Mínimo $100 para aplicar
    },
    'envio50': {
      code: 'envio50',
      discount: 50,
      type: 'fixed',
      description: '$50 de descuento',
      minAmount: 200,
    },
    'bienvenido10': {
      code: 'bienvenido10', 
      discount: 10,
      type: 'percentage',
      description: '10% de descuento de bienvenida',
      minAmount: 0,
    }
  };

  // Función para validar y aplicar cupón
  const validateAndApplyCoupon = async (code) => {
    setIsLoading(true);
    setError('');

    try {
      // 🧪 LÓGICA DE PRUEBA - Reemplazar con API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay de API
      
      const testCoupon = TEST_COUPONS[code.toLowerCase()];
      
      if (!testCoupon) {
        setError('Cupón no válido');
        setIsLoading(false);
        return;
      }

      // Validar monto mínimo
      if (subtotal < testCoupon.minAmount) {
        setError(`Monto mínimo requerido: $${testCoupon.minAmount}`);
        setIsLoading(false);
        return;
      }

      // Calcular descuento
      let discountAmount = 0;
      if (testCoupon.type === 'percentage') {
        discountAmount = (subtotal * testCoupon.discount) / 100;
      } else {
        discountAmount = testCoupon.discount;
      }

      // Aplicar cupón
      const couponData = {
        ...testCoupon,
        discountAmount: Math.round(discountAmount)
      };

      onCouponApply(couponData);
      setCouponCode('');
      
    } catch (error) {
      setError('Error al validar cupón');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    validateAndApplyCoupon(couponCode.trim());
  };

  const handleRemoveCoupon = () => {
    onCouponRemove();
    setError('');
  };

  const formatDiscount = (coupon) => {
    if (coupon.type === 'percentage') {
      return `${coupon.discount}%`;
    } else {
      return `$${coupon.discount}`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Título */}
      <View style={styles.header}>
        <Ionicons name="pricetag-outline" size={20} color="#8B5E3C" />
        <Text style={styles.title}>Cupón de descuento</Text>
      </View>

      {!appliedCoupon ? (
        /* Input para nuevo cupón */
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu código"
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleApplyCoupon}
            />
            <TouchableOpacity
              style={[
                styles.applyButton,
                (!couponCode.trim() || isLoading) && styles.applyButtonDisabled
              ]}
              onPress={handleApplyCoupon}
              disabled={!couponCode.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.applyButtonText}>Aplicar</Text>
              )}
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={16} color="#E74C3C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Hints de cupones disponibles */}
          <View style={styles.hintsContainer}>
            <Text style={styles.hintsTitle}>💡 Cupones disponibles:</Text>
            <Text style={styles.hintText}>• queso25 - 25% de descuento</Text>
            <Text style={styles.hintText}>• envio50 - $50 de descuento</Text>
            <Text style={styles.hintText}>• bienvenido10 - 10% de descuento</Text>
          </View>
        </View>
      ) : (
        /* Cupón aplicado */
        <View style={[
          styles.appliedContainer,
          !isValid && styles.appliedContainerInvalid
        ]}>
          <View style={styles.appliedInfo}>
            <View style={styles.appliedHeader}>
              <Ionicons 
                name={isValid ? "checkmark-circle" : "alert-circle"} 
                size={20} 
                color={isValid ? "#33A744" : "#E74C3C"} 
              />
              <Text style={[
                styles.appliedCode,
                !isValid && styles.appliedCodeInvalid
              ]}>
                {appliedCoupon.code.toUpperCase()}
              </Text>
              <Text style={[
                styles.appliedDiscount,
                !isValid && styles.appliedDiscountInvalid
              ]}>
                -{formatDiscount(appliedCoupon)} 
                {isValid && `($${Math.min((appliedCoupon.type === 'percentage' ? (subtotal * appliedCoupon.discount) / 100 : appliedCoupon.discount), subtotal).toFixed(0)})`}
              </Text>
            </View>
            <Text style={[
              styles.appliedDescription,
              !isValid && styles.appliedDescriptionInvalid
            ]}>
              {isValid 
                ? appliedCoupon.description 
                : `Mínimo requerido: $${appliedCoupon.minAmount} (falta $${(appliedCoupon.minAmount - subtotal).toFixed(0)})`
              }
            </Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveCoupon}
          >
            <Ionicons name="close" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: scaleSpacing(12),
    padding: scaleSpacing(16),
    marginVertical: scaleSpacing(8),
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(12),
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#2F2F2F',
    marginLeft: scaleSpacing(8),
  },
  inputContainer: {
    gap: scaleSpacing(8),
  },
  inputWrapper: {
    flexDirection: 'row',
    gap: scaleSpacing(8),
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(12),
    paddingVertical: scaleSpacing(10),
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#2F2F2F',
  },
  applyButton: {
    backgroundColor: '#D27F27',
    paddingHorizontal: scaleSpacing(20),
    paddingVertical: scaleSpacing(10),
    borderRadius: scaleSpacing(8),
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#FFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(6),
    paddingHorizontal: scaleSpacing(4),
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#E74C3C',
  },
  hintsContainer: {
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    padding: scaleSpacing(12),
    borderRadius: scaleSpacing(8),
    marginTop: scaleSpacing(8),
  },
  hintsTitle: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#8B5E3C',
    marginBottom: scaleSpacing(4),
  },
  hintText: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#666',
    marginLeft: scaleSpacing(8),
  },
  appliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    padding: scaleSpacing(12),
    borderRadius: scaleSpacing(8),
    borderWidth: 1,
    borderColor: 'rgba(51, 167, 68, 0.3)',
  },
  appliedInfo: {
    flex: 1,
  },
  appliedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(6),
    marginBottom: scaleSpacing(4),
  },
  appliedCode: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#33A744',
  },
  appliedDiscount: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#33A744',
  },
  appliedDescription: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#666',
  },
  removeButton: {
    padding: scaleSpacing(8),
    borderRadius: scaleSpacing(6),
    backgroundColor: 'rgba(102, 102, 102, 0.1)',
  },
  
  // Estilos para cupón inválido
  appliedContainerInvalid: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  appliedCodeInvalid: {
    color: '#E74C3C',
  },
  appliedDiscountInvalid: {
    color: '#E74C3C',
    textDecorationLine: 'line-through',
  },
  appliedDescriptionInvalid: {
    color: '#E74C3C',
    fontWeight: 'bold',
  },
});

export default CouponInput;