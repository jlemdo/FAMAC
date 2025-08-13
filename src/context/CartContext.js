import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';

export const CartContext = createContext();

export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [onCartClearCallback, setOnCartClearCallback] = useState(null);
    const { user } = useContext(AuthContext);
    
    // Obtener descuento promocional del usuario (del login API)
    const userPromotionalDiscount = user?.promotional_discount ? Number(user.promotional_discount) : 0;
    const hasUserDiscount = userPromotionalDiscount > 0 && user?.promotion_id;

    // Add item to cart
    const addToCart = (product, quantityToAdd = 1) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem) {
                return prevCart.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantityToAdd } : item
                );
            } else {
                // Preservar información de descuento del producto
                const discountNum = Number(product.discount) || 0;
                return [...prevCart, { 
                    ...product, 
                    quantity: quantityToAdd,
                    discount: discountNum, // Asegurar que el descuento se preserve
                    originalPrice: product.price, // Guardar precio original para referencia
                    discountedPrice: product.price - discountNum // Precio con descuento aplicado
                }];
            }
        });
    };

    // Remove item from cart
    const removeFromCart = (id) => {
        setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    };

    // In CartContext.js
    const clearCart = () => {
        setCart([]);
        // Ejecutar callback si está definido para limpiar información adicional (como deliveryInfo)
        if (onCartClearCallback) {
            onCartClearCallback();
        }
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

    // Efecto para limpiar carrito cuando cambia el usuario
    useEffect(() => {
        const userId = user?.id || user?.email || null; // Para guests usar email, para registrados usar id
        
        console.log('🛒 CARTCONTEXT: Verificando cambio de usuario:', {
            currentUserId,
            newUserId: userId,
            deberíaLimpiar: currentUserId !== null && currentUserId !== userId,
            hasCallback: !!onCartClearCallback
        });
        
        // Si hay un usuario previo diferente al actual, limpiar carrito
        if (currentUserId !== null && currentUserId !== userId) {
            console.log('🧹 CARTCONTEXT: Limpiando carrito por cambio de usuario');
            setCart([]);
            // Ejecutar callback para limpiar información adicional cuando cambia usuario
            if (onCartClearCallback) {
                console.log('🔥 CARTCONTEXT: EJECUTANDO CALLBACK DE LIMPIEZA');
                console.trace('Stack trace del callback:');
                onCartClearCallback();
            }
        }
        
        // Actualizar el ID del usuario actual
        setCurrentUserId(userId);
    }, [user?.id, user?.email]); // REMOVIDO currentUserId de las dependencias

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

    // Función para registrar callback de limpieza - memorizada para evitar bucles infinitos
    const setCartClearCallback = useCallback((callback) => {
        console.log('📝 CARTCONTEXT: Registrando nuevo callback:', !!callback);
        if (callback) {
            console.trace('Stack trace del registro de callback:');
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
            clearCart,
            setCartClearCallback 
        }}>
            {children}
        </CartContext.Provider>
    );
}
