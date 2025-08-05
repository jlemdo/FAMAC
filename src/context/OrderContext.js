import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import axios from 'axios';

export const OrderContext = createContext();

export function OrderProvider({ children }) {
    const [orderCount, setOrderCount] = useState(null);
    const [orders, setOrders] = useState([]);
    const [lastFetch, setLastFetch] = useState(null);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
    const { user } = useContext(AuthContext);

    // Función para obtener órdenes del servidor
    const fetchOrdersFromServer = useCallback(async () => {
        if (!user || user.usertype === 'Guest') {
            setOrders([]);
            setOrderCount(0);
            return;
        }

        try {
            let url;
            if (user.usertype === 'driver') {
                url = `https://food.siliconsoft.pk/api/orderhistorydriver/${user.id}`;
            } else {
                url = `https://food.siliconsoft.pk/api/orderhistory/${user.id}`;
            }

            const response = await axios.get(url);
            const ordersData = response.data.orders || [];
            
            // Ordenar por fecha descendente
            const sortedOrders = ordersData.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );

            setOrders(sortedOrders);
            
            // Contar órdenes activas (no entregadas)
            const completedStatuses = ['delivered', 'entregado', 'completed', 'finalizado', 'cancelled', 'cancelado'];
            const activeOrders = sortedOrders.filter(order => 
                order.status && !completedStatuses.includes(order.status.toLowerCase())
            );
            setOrderCount(activeOrders.length);
            setLastFetch(new Date());
            
        } catch (error) {
        }
    }, [user]);

    // Función manual para actualizar (para compatibilidad)
    const updateOrders = (ordersData) => {
        setOrders(ordersData);
        const completedStatuses = ['delivered', 'entregado', 'completed', 'finalizado', 'cancelled', 'cancelado'];
        const activeOrders = ordersData.filter(order => 
            order.status && !completedStatuses.includes(order.status.toLowerCase())
        );
        setOrderCount(activeOrders.length);
    };

    // Función para forzar refresh manual
    const refreshOrders = () => {
        fetchOrdersFromServer();
    };

    // Auto-refresh cada 30 segundos cuando el usuario esté logueado
    useEffect(() => {
        if (user && user.usertype !== 'Guest') {
            // Fetch inicial
            fetchOrdersFromServer();
            
            // Configurar auto-refresh cada 30 segundos
            const interval = setInterval(() => {
                fetchOrdersFromServer();
            }, 30000); // 30 segundos
            
            setAutoRefreshInterval(interval);
            
            return () => {
                clearInterval(interval);
            };
        } else {
            // Limpiar para guests
            setOrders([]);
            setOrderCount(0);
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                setAutoRefreshInterval(null);
            }
        }
    }, [user, fetchOrdersFromServer]);

    return (
        <OrderContext.Provider value={{ 
            orders, 
            orderCount, 
            updateOrders, 
            refreshOrders, 
            lastFetch,
            fetchOrdersFromServer 
        }}>
            {children}
        </OrderContext.Provider>
    );
}
