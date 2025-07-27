import React, {useState, useContext, useRef} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {CartContext} from '../context/CartContext';
import fonts from '../theme/fonts';

export default function ProductDetails() {
  const route = useRoute();
  const product = route.params?.productData;
  const navigation = useNavigation();
  const {addToCart} = useContext(CartContext);
  const [quantity, setQuantity] = useState(1); // Empezar con 1 unidad (250g)
  const [modalVisible, setModalVisible] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  // Incrementos de 1 unidad (cada unidad = 250g)
  const INCREMENT = 1;
  const MIN_QUANTITY = 1;
  
  // Animación para la alerta
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const alertTranslateY = useRef(new Animated.Value(-50)).current;
  
  const increaseQuantity = () => setQuantity(prev => prev + INCREMENT);
  const decreaseQuantity = () => quantity > MIN_QUANTITY && setQuantity(prev => prev - INCREMENT);
  
  // Calcular precios (product.price es por 250g = 1 unidad)
  const pricePerKg = (product.price * 4).toFixed(2); // 4 unidades = 1kg
  const totalPrice = (product.price * quantity).toFixed(2); // precio por unidad * cantidad de unidades
  
  // Formatear cantidad para mostrar (convertir unidades a gramos)
  const formatQuantity = (units) => {
    const grams = units * 250; // cada unidad = 250g
    if (grams >= 1000) {
      const kg = grams / 1000;
      return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)}kg`;
    }
    return `${grams}g`;
  };

  // Función para mostrar la alerta de éxito
  const showSuccessMessage = () => {
    setShowSuccessAlert(true);
    
    // Animación de entrada
    Animated.parallel([
      Animated.timing(alertOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(alertTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Auto-ocultar después de 2.5 segundos
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(alertOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(alertTranslateY, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccessAlert(false);
      });
    }, 2500);
  };

  const handleAddToCart = () => {
    // Agregar al carrito
    addToCart(product, quantity);
    
    // Mostrar alerta de éxito
    showSuccessMessage();
  };

  const handleNavigate = () => {
    setModalVisible(false);
    navigation.navigate('MainTabs', {screen: 'Cart'});
  };

  return (
    <View style={styles.containerMain}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessible
            accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {product.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>

        <View style={styles.card}>
          <Image source={{uri: product.photo}} style={styles.image} />

          {/* Precio por unidad */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Precio por kg:</Text>
            <Text style={styles.unitPrice}>${pricePerKg}</Text>
          </View>
          
          {/* Precio base (250g) */}
          <View style={styles.basePriceContainer}>
            <Text style={styles.basePriceLabel}>Precio por 250g:</Text>
            <Text style={styles.basePrice}>${product.price}</Text>
          </View>
          
          {/* Precio total dinámico */}
          <View style={styles.totalPriceContainer}>
            <Text style={styles.totalLabel}>Total por {formatQuantity(quantity)}:</Text>
            <Text style={styles.totalPrice}>${totalPrice}</Text>
          </View>

          <Text
            style={[
              styles.stockText,
              product.available_qty === 0 ? styles.outOfStock : styles.inStock,
            ]}>
            {product.available_qty === 0
              ? 'Agotado'
              : `Stock: ${product.available_qty}`}
          </Text>

          <View style={styles.quantitySection}>
            <Text style={styles.quantitySectionTitle}>Cantidad:</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={decreaseQuantity}
                style={[
                  styles.quantityButton,
                  quantity <= MIN_QUANTITY && styles.quantityButtonDisabled
                ]}
                disabled={product.available_qty === 0 || quantity <= MIN_QUANTITY}
                accessible
                accessibilityLabel="Disminuir cantidad">
                <Ionicons 
                  name="remove" 
                  size={20} 
                  color={quantity <= MIN_QUANTITY ? "#999" : "#FFF"} 
                />
              </TouchableOpacity>

              <View style={styles.quantityDisplay}>
                <Text style={styles.quantity}>{formatQuantity(quantity)}</Text>
                <Text style={styles.quantitySubtext}>
                  {quantity === 1 ? '1 unidad' : `${quantity} unidades`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={increaseQuantity}
                style={styles.quantityButton}
                disabled={product.available_qty === 0}
                accessible
                accessibilityLabel="Aumentar cantidad">
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.description}>{product.description}</Text>
        </View>
      </ScrollView>

      {/* Sticky CTA al fondo */}
      <TouchableOpacity
        style={styles.cartButton}
        onPress={handleAddToCart}
        disabled={product.available_qty === 0}
        activeOpacity={0.7}
        accessible
        accessibilityLabel={
          product.available_qty === 0 ? 'Agotado' : `Añadir al carrito por $${totalPrice}`
        }>
        <View style={styles.cartButtonContent}>
          <Text style={styles.cartText}>
            {product.available_qty === 0 ? 'Agotado' : 'Añadir al carrito'}
          </Text>
          {product.available_qty > 0 && (
            <Text style={styles.cartPrice}>${totalPrice}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Alerta de éxito */}
      {showSuccessAlert && (
        <Animated.View
          style={[
            styles.successAlert,
            {
              opacity: alertOpacity,
              transform: [{translateY: alertTranslateY}],
            },
          ]}>
          <View style={styles.successAlertContent}>
            <Ionicons name="checkmark-circle" size={20} color="#33A744" />
            <View style={styles.successAlertTextContainer}>
              <Text style={styles.successAlertText}>
                ¡{formatQuantity(quantity)} de {product.name} agregado al carrito!
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalVisible(false);
        }}>
        <TouchableWithoutFeedback 
          onPress={() => {
            Keyboard.dismiss();
            setModalVisible(false);
          }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalText}>¿Deseas continuar al carrito?</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      handleNavigate();
                    }}
                    style={styles.modalButton}
                    accessible
                    accessibilityLabel="Sí, ir al carrito">
                    <Text style={styles.modalButtonText}>Sí</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setModalVisible(false);
                    }}
                    style={styles.modalButton}
                    accessible
                    accessibilityLabel="Permanecer aquí">
                    <Text style={styles.modalButtonText}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  containerMain: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120, // espacio extra para CTA sticky
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontFamily: fonts.original,
    fontSize: fonts.size.XLLL,
    color: '#2F2F2F',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 12,
  },
  // Estilos de precios
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#666',
    marginRight: 8,
  },
  unitPrice: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },
  basePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  basePriceLabel: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#666',
    marginRight: 8,
  },
  basePrice: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#D27F27',
  },
  totalPriceContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C',
  },
  totalLabel: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 4,
  },
  totalPrice: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.XL,
    color: '#D27F27',
    textAlign: 'center',
  },
  stockText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    marginBottom: 12,
  },
  inStock: {
    color: '#33A744',
  },
  outOfStock: {
    color: '#D27F27',
  },
  // Estilos de cantidad
  quantitySection: {
    marginBottom: 16,
  },
  quantitySectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#8B5E3C',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  quantityButton: {
    width: 40,
    height: 40,
    backgroundColor: '#D27F27',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  quantityButtonDisabled: {
    backgroundColor: '#CCC',
  },
  quantityDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  quantity: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
    textAlign: 'center',
  },
  quantitySubtext: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  cartButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D27F27',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 4,
  },
  cartButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
  },
  cartText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  cartPrice: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#FFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 16,
  },
  
  // Estilos de la alerta de éxito
  successAlert: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80, // Misma altura que el modal de notificaciones
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  successAlertContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#33A744',
  },
  successAlertTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  successAlertText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#33A744',
    textAlign: 'left',
    lineHeight: 18,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 20,
  },
  modalText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#33A744',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
});
