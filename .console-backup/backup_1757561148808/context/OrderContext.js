import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { AuthContext } from './AuthContext';
import axios from 'axios';

export const OrderContext = createContext();

export function OrderProvider({ children }) {
    const [orderCount, setOrderCount] = useState(null);
    const [orders, setOrders] = useState([]);
    const [lastFetch, setLastFetch] = useState(null);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
    const { user } = useContext(AuthContext);

    // ✅ Estado para permitir cargar órdenes Guest temporalmente
    const [allowGuestOrders, setAllowGuestOrders] = useState(false);

    // Función para obtener órdenes del servidor
    const fetchOrdersFromServer = useCallback(async () => {
        console.log('🔍 FETCH ORDERS DEBUG:', {
            hasUser: !!user,
            userType: user?.usertype,
            userId: user?.id,
            userEmail: user?.email,
            allowGuestOrders
        });
        
        console.log('👤 USER COMPLETO:', JSON.stringify(user, null, 2));

        // ✅ Solo bloquear si no hay usuario o si es Guest sin permisos
        if (!user) {
            setOrders([]);
            setOrderCount(0);
            return;
        }

        // ✅ Bloquear Guest SOLO si allowGuestOrders está false
        if (user.usertype === 'Guest' && !allowGuestOrders) {
            setOrders([]);
            setOrderCount(0);
            return;
        }

        let url = 'URL_NO_DEFINIDA';
        
        try {
            if (user.usertype === 'driver') {
                url = `https://occr.pixelcrafters.digital/api/orderhistorydriver/${user.id}`;
            } else if (user.usertype === 'Guest' && allowGuestOrders) {
                // ✅ Para Guest, usar email como user_id en el endpoint normal
                url = `https://occr.pixelcrafters.digital/api/orderhistory/${encodeURIComponent(user.email)}`;
            } else {
                url = `https://occr.pixelcrafters.digital/api/orderhistory/${user.id}`;
            }

            console.log('🌐 Intentando GET a:', url);
            
            // Debug: interceptar request para ver exactamente qué se envía
            const config = {
                method: 'GET',
                url: url,
                headers: {},
                timeout: 10000
            };
            
            console.log('📤 CONFIG DE REQUEST:', JSON.stringify(config, null, 2));
            
            // PRUEBA DEFINITIVA: usar fetch() en lugar de axios
            console.log('🔄 Probando con FETCH en lugar de axios...');
            
            // PRIMERA: Probar endpoint que SÍ funciona (login)
            console.log('🧪 TEST 1: Probando endpoint de login que funciona...');
            const testResponse = await fetch('https://occr.pixelcrafters.digital/api/auth/google', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ test: true })
            });
            console.log('🧪 TEST 1 Status:', testResponse.status);
            
            // SEGUNDA: Probar orderhistory
            console.log('🧪 TEST 2: Probando orderhistory...');
            const fetchResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ FETCH Response status:', fetchResponse.status);
            
            if (!fetchResponse.ok) {
                throw new Error(`FETCH failed with status ${fetchResponse.status}`);
            }
            
            const fetchData = await fetchResponse.json();
            console.log('📦 FETCH Data received:', fetchData);
            
            const ordersData = fetchData.orders || [];
            
            console.log('📦 Orders received:', {
                count: ordersData.length,
                response: fetchData
            });
            
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

            console.log('✅ Orders processed:', {
                total: sortedOrders.length,
                active: activeOrders.length
            });
            
        } catch (err) {
            console.log('❌ ERROR CARGANDO ÓRDENES');
            console.log('🔗 URL intentada:', url);
            console.log('🔢 Status:', err?.response?.status);
            console.log('📝 Message:', err?.message);
            console.log('📱 Platform:', Platform.OS);
            
            // Mantener órdenes vacías cuando hay error
            setOrders([]);
            setOrderCount(0);
        }
    }, [user, allowGuestOrders]);

    // ✅ NUEVA: Función para activar carga Guest temporal
    const enableGuestOrders = () => {
        setAllowGuestOrders(true);
    };

    // ✅ NUEVA: Función para desactivar carga Guest
    const disableGuestOrders = () => {
        setAllowGuestOrders(false);
        if (user?.usertype === 'Guest') {
            setOrders([]);
            setOrderCount(0);
        }
    };

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
        if (user && (user.usertype !== 'Guest' || allowGuestOrders)) {
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
    }, [user, fetchOrdersFromServer, allowGuestOrders]);

    return (
        <OrderContext.Provider value={{ 
            orders, 
            orderCount, 
            updateOrders, 
            refreshOrders, 
            lastFetch,
            enableGuestOrders,
            disableGuestOrders,
            fetchOrdersFromServer 
        }}>
            {children}
        </OrderContext.Provider>
    );
}
