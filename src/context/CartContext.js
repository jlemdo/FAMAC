import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const CartContext = createContext();

export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [onCartClearCallback, setOnCartClearCallback] = useState(null);
    const [automaticPromotions, setAutomaticPromotions] = useState([]);
    const { user } = useContext(AuthContext);

    // Obtener descuento promocional del usuario (del login API)
    const userPromotionalDiscount = user?.promotional_discount ? Number(user.promotional_discount) : 0;
    const hasUserDiscount = userPromotionalDiscount > 0 && user?.promotion_id;

    // Add item to cart
    const addToCart = (product, quantityToAdd = 1) => {
        console.log('🛒 AGREGANDO al carrito:', product.name, 'cantidad:', quantityToAdd);
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem) {
                return prevCart.map((item) =>
                    item.id === product.id ? { 
                        ...item, 
                        quantity: item.quantity + quantityToAdd,
                        selectedQuantity: (item.selectedQuantity || item.quantity) + quantityToAdd
                    } : item
                );
            } else {
                // Preservar información de descuento del producto
                const discountNum = Number(product.discount) || 0;
                return [...prevCart, { 
                    ...product, 
                    selectedQuantity: quantityToAdd, // Unidades seleccionadas por el usuario
                    productQuantity: product.quantity, // Cantidad original del producto (250gr, etc.)
                    quantity: quantityToAdd, // Mantener quantity para compatibilidad con código existente
                    discount: discountNum, // Asegurar que el descuento se preserve
                    originalPrice: product.price, // Guardar precio original para referencia
                    discountedPrice: product.price - discountNum // Precio con descuento aplicado
                }];
            }
        });
    };

    // Remove item from cart
    const removeFromCart = (id) => {
        console.log('🛒 REMOVIENDO del carrito:', id);
        setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    };



    // Update quantity
    const updateQuantity = (id, type) => {
        setCart((prevCart) =>
            prevCart.map((item) =>
                item.id === id
                    ? { ...item, quantity: type === 'increase' ? item.quantity + 1 : Math.max(1, item.quantity - 1) }
                    : item
            )
        );
    };

    // 🔧 MEJORADO: Efecto para manejar cambios de usuario y logout
    useEffect(() => {
        const userId = user?.id || user?.email || null; // Para guests usar email, para registrados usar id
        
        console.log('🛒 CARTCONTEXT: Verificando cambio de usuario:', {
            currentUserId,
            newUserId: userId,
            userType: user?.usertype,
            shouldClear: currentUserId !== null && currentUserId !== userId,
            cartLength: cart.length
        });
        
        // 🚨 CASO CRÍTICO: Usuario hace logout (user cambia a null)
        if (currentUserId !== null && userId === null) {
            console.log('🚨 CARRITO: Limpiando por LOGOUT');
            clearCartOnLogout(); // Limpiar TODOS los carritos de storage
            if (onCartClearCallback) {
                onCartClearCallback();
            }
        }
        // 🔄 CASO NORMAL: Cambio entre usuarios diferentes (no logout)
        else if (false && currentUserId !== null && currentUserId !== userId && userId !== null) {
            console.log('🚨 CARRITO: Limpiando por CAMBIO DE USUARIO');
            setCart([]);
            // Ejecutar callback para limpiar información adicional cuando cambia usuario
            if (onCartClearCallback) {
                onCartClearCallback();
            }
        }
        
        // Actualizar el ID del usuario actual
        setCurrentUserId(userId);
    }, [user?.id, user?.email]); // REMOVIDO currentUserId de las dependencias

    // 📦 CORREGIDO: Cargar carrito DESPUÉS de cambio de usuario para evitar race conditions
    useEffect(() => {
        if (user !== undefined) { // user !== undefined significa que AuthContext ya cargó
            // Delay pequeño para asegurar que limpieza de usuario anterior termine primero
            setTimeout(() => loadCartFromBackend(), 50);
        }
    }, [user?.id, user?.email]); // Depende del user específico

    // 📦 CORREGIDO: Guardar carrito en AsyncStorage cuando cambie Y user esté definido
    useEffect(() => {
        if (user === undefined) return; // No hacer nada si user aún no cargó
        
        if (cart.length > 0) {
            saveCartToBackend();
        } else if (cart.length === 0 && user) {
            // Si el carrito está vacío, limpiar AsyncStorage del usuario actual
            const currentUserId = user?.id?.toString() || user?.email || 'anonymous';
            const cartKey = `cart_${currentUserId}`;
            AsyncStorage.removeItem(cartKey).catch(console.log);
        }
    }, [cart, user?.id, user?.email]); // Ahora depende TAMBIÉN del user

    // 🆕 NUEVO: Guardar carrito en backend persistente
    const saveCartToBackend = async () => {
        try {
            if (!user || user.usertype === 'Driver') return; // Drivers no tienen carrito
            
            const payload = {
                user_type: user.usertype === 'Guest' ? 'guest' : 'user',
                cart_data: cart
            };

            if (user.usertype === 'Guest') {
                payload.guest_email = user.email;
            } else {
                payload.user_id = user.id;
            }
            
            // console.log('💾 GUARDANDO CARRITO EN BACKEND:', {
                // userType: user.usertype,
                // userId: user.id || user.email,
                // items: cart.length
            // });

            await axios.post('https://occr.pixelcrafters.digital/api/cart/save', payload);
            
        } catch (error) {
            // console.log('❌ Error guardando carrito en backend:', error.message);
            // Fallback: guardar localmente como respaldo
            const currentUserId = user?.id?.toString() || user?.email || 'anonymous';
            const cartKey = `cart_${currentUserId}`;
            const cartWithTimestamp = {
                items: cart,
                timestamp: Date.now(),
                userId: currentUserId
            };
            await AsyncStorage.setItem(cartKey, JSON.stringify(cartWithTimestamp));
        }
    };
    
    // 🛒 NUEVO: Función para registrar actividad del carrito en backend
    const updateCartActivity = async () => {
        try {
            // Solo registrar si hay modificaciones reales del carrito
            if (cart.length === 0) return;
            
            const payload = {
                timestamp: Date.now(),
                ...(user?.id 
                    ? { user_id: user.id }
                    : user?.email 
                        ? { email: user.email }
                        : { type: "anonymous" })
            };
            
            // Llamada opcional al backend - fallar silenciosamente si hay error
            await fetch('https://occr.pixelcrafters.digital/api/cart-activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            
        } catch (error) {
            // Fallar silenciosamente, no afectar la experiencia del usuario
        }
    };

    const loadCartFromBackend = async () => {
        try {
            // ✅ VALIDACIÓN CRÍTICA: Solo cargar si user está definido
            if (user === undefined || user.usertype === 'Driver') {
                return;
            }
            
            const payload = {
                user_type: user.usertype === 'Guest' ? 'guest' : 'user'
            };

            if (user.usertype === 'Guest') {
                payload.guest_email = user.email;
            } else {
                payload.user_id = user.id;
            }
            
            // console.log('📦 CARGANDO CARRITO DESDE BACKEND:', {
                // userType: user.usertype,
                // userId: user.id || user.email
            // });
            
            const response = await axios.post('https://occr.pixelcrafters.digital/api/cart/get', payload);
            
            if (response.data.success && response.data.cart.length > 0) {
                // console.log(`🛒 CartContext: Restaurando ${response.data.cart.length} items del backend`);
                setCart(response.data.cart);
            } else {
                // console.log('📦 No hay carrito en backend o está vacío');
                setCart([]);
            }
            
        } catch (error) {
            // console.log('❌ Error cargando carrito desde backend:', error.message);
            // Fallback: intentar cargar desde AsyncStorage local
            try {
                const currentUserId = user?.id?.toString() || user?.email || 'anonymous';
                const cartKey = `cart_${currentUserId}`;
                const savedCart = await AsyncStorage.getItem(cartKey);
                
                if (savedCart) {
                    const { items, timestamp } = JSON.parse(savedCart);
                    const currentTime = Date.now();
                    const twentyFourHours = 24 * 60 * 60 * 1000;
                    
                    if (currentTime - timestamp < twentyFourHours && items.length > 0) {
                        // console.log(`🛒 Fallback: Restaurando ${items.length} items desde AsyncStorage`);
                        setCart(items);
                    }
                }
            } catch (fallbackError) {
                // console.log('❌ Fallback también falló:', fallbackError.message);
            }
        }
    };

    // 🆕 FUNCIÓN CORREGIDA: Solo limpiar memoria en logout, mantener carritos guardados
    const clearCartOnLogout = async () => {
        try {
            // Solo limpiar carrito en memoria
            setCart([]);
            
            // ✅ NO eliminar backend - cada usuario mantiene su carrito hasta que expire (24h)
            // Los carritos persisten para cuando cada usuario regrese
        } catch (error) {
        }
    };

    // 🆕 NUEVO: Limpiar carrito completamente (memoria + backend)
    const clearCart = async () => {
        console.log('🚨 CLEAR CART EJECUTADO - Stack trace:', new Error().stack);
        try {
            // Limpiar memoria
            setCart([]);
            
            // Ejecutar callback para limpiar información adicional (como deliveryInfo)
            if (onCartClearCallback) {
                onCartClearCallback();
            }
            
            // Limpiar backend
            if (user && user.usertype !== 'Driver') {
                const payload = {
                    user_type: user.usertype === 'Guest' ? 'guest' : 'user'
                };

                if (user.usertype === 'Guest') {
                    payload.guest_email = user.email;
                } else {
                    payload.user_id = user.id;
                }

                await axios.post('https://occr.pixelcrafters.digital/api/cart/clear', payload);
                // console.log('🧹 Carrito limpiado en backend');
            }
            
        } catch (error) {
            // console.log('❌ Error limpiando carrito:', error.message);
        }
    };

    // Calculate subtotal before any discounts (original prices)
    const subtotalBeforeDiscounts = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // Calculate subtotal after product discounts but before user discount
    const subtotalAfterProductDiscounts = cart.reduce((acc, item) => {
        const itemDiscount = Number(item.discount) || 0;
        const discountedPrice = item.price - itemDiscount;
        return acc + discountedPrice * item.quantity;
    }, 0);

    // Calculate user promotional discount amount (percentage based)
    const userDiscountAmount = hasUserDiscount 
        ? subtotalAfterProductDiscounts * (userPromotionalDiscount / 100)
        : 0;

    // Calculate final total price (with all discounts applied)
    const totalPrice = Math.max(0, subtotalAfterProductDiscounts - userDiscountAmount).toFixed(2);

    // Calculate total savings from product discounts
    const productDiscountSavings = cart.reduce((acc, item) => {
        const itemDiscount = Number(item.discount) || 0;
        return acc + itemDiscount * item.quantity;
    }, 0);

    // Calculate total savings (product discounts + user promotional discount)
    const totalSavings = (productDiscountSavings + userDiscountAmount).toFixed(2);

    // Format all values to 2 decimal places
    const formattedSubtotalBeforeDiscounts = subtotalBeforeDiscounts.toFixed(2);
    const formattedSubtotalAfterProductDiscounts = subtotalAfterProductDiscounts.toFixed(2);
    const formattedUserDiscountAmount = userDiscountAmount.toFixed(2);
    const formattedProductDiscountSavings = productDiscountSavings.toFixed(2);

    // Function to get automatic promotions from API
    const getAutomaticPromotions = useCallback(async () => {
        try {
            if (subtotalAfterProductDiscounts === 0) {
                setAutomaticPromotions([]);
                return;
            }

            const response = await axios.post('https://occr.pixelcrafters.digital/api/get-automatic-promotions', {
                subtotal: subtotalAfterProductDiscounts,
                user_email: user?.email || null
            });

            if (response.data.success) {
                setAutomaticPromotions(response.data.data || []);
            } else {
                setAutomaticPromotions([]);
            }
        } catch (error) {
            console.log('Error obteniendo promociones automáticas:', error);
            setAutomaticPromotions([]);
        }
    }, [subtotalAfterProductDiscounts, user?.email]);

    // Get automatic promotions when cart or user changes
    useEffect(() => {
        getAutomaticPromotions();
    }, [getAutomaticPromotions]);

    // Función para registrar callback de limpieza - memorizada para evitar bucles infinitos
    const setCartClearCallback = useCallback((callback) => {
        if (callback) {
            // console.trace('Stack trace del registro de callback:');
        }
        setOnCartClearCallback(callback);
    }, []);

    return (
        <CartContext.Provider value={{ 
            cart, 
            addToCart, 
            removeFromCart, 
            updateQuantity, 
            totalPrice, 
            totalSavings,
            subtotalBeforeDiscounts: formattedSubtotalBeforeDiscounts,
            subtotalAfterProductDiscounts: formattedSubtotalAfterProductDiscounts,
            userPromotionalDiscount,
            userDiscountAmount: formattedUserDiscountAmount,
            productDiscountSavings: formattedProductDiscountSavings,
            hasUserDiscount,
            automaticPromotions,
            getAutomaticPromotions,
            clearCart,
            clearCartOnLogout, // 🆕 Nueva función para logout
            setCartClearCallback
        }}>
            {children}
        </CartContext.Provider>
    );
}
