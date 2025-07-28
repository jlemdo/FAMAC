import React, { createContext, useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';

export const CartContext = createContext();

export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const { user } = useContext(AuthContext);

    // Add item to cart
    const addToCart = (product, quantityToAdd = 1) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem) {
                return prevCart.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantityToAdd } : item
                );
            } else {
                return [...prevCart, { ...product, quantity: quantityToAdd }];
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
        
        // Si hay un usuario previo diferente al actual, limpiar carrito
        if (currentUserId !== null && currentUserId !== userId) {
            console.log('🛒 Usuario cambió, limpiando carrito:', {
                previousUser: currentUserId,
                currentUser: userId
            });
            setCart([]);
        }
        
        // Actualizar el ID del usuario actual
        setCurrentUserId(userId);
    }, [user?.id, user?.email, currentUserId]);

    // Calculate total price
    const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, totalPrice, clearCart }}>
            {children}
        </CartContext.Provider>
    );
}
