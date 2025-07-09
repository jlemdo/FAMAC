import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
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
  const [quantity, setQuantity] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  // console.log('Product:', product);
  const increaseQuantity = () => setQuantity(quantity + 1);
  const decreaseQuantity = () => quantity > 1 && setQuantity(quantity - 1);

  const handleAddToCart = () => {
    // call your addToCart function here
    addToCart(product, quantity);
    setModalVisible(true); // show modal after adding
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
          <Text style={styles.title}>{product.name}</Text>
        </View>

        <View style={styles.card}>
          <Image source={{uri: product.photo}} style={styles.image} />

          <Text style={styles.price}>${product.price}</Text>

          <Text
            style={[
              styles.stockText,
              product.available_qty === 0 ? styles.outOfStock : styles.inStock,
            ]}>
            {product.available_qty === 0
              ? 'Agotado'
              : `Stock: ${product.available_qty}`}
          </Text>

          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={decreaseQuantity}
              style={styles.quantityButton}
              disabled={product.available_qty === 0}
              accessible
              accessibilityLabel="Disminuir cantidad">
              <Ionicons name="remove" size={20} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.quantity}>{quantity}</Text>

            <TouchableOpacity
              onPress={increaseQuantity}
              style={styles.quantityButton}
              disabled={product.available_qty === 0}
              accessible
              accessibilityLabel="Aumentar cantidad">
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
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
          product.available_qty === 0 ? 'Agotado' : 'Añadir al carrito'
        }>
        <Text style={styles.cartText}>
          {product.available_qty === 0 ? 'Agotado' : 'Añadir al carrito'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>¿Deseas continuar al carrito?</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handleNavigate}
                style={styles.modalButton}
                accessible
                accessibilityLabel="Sí, ir al carrito">
                <Text style={styles.modalButtonText}>Sí</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalButton}
                accessible
                accessibilityLabel="Permanecer aquí">
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  price: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.XL,
    color: '#8B5E3C',
    marginBottom: 8,
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
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#8B5E3C',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    backgroundColor: '#D27F27',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  quantity: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
    minWidth: 32,
    textAlign: 'center',
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
    alignItems: 'center',
    elevation: 4,
  },
  cartText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
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
