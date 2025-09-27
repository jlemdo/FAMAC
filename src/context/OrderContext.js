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
        // console.log('🔍 FETCH ORDERS DEBUG:', {
            // hasUser: !!user,
            // userType: user?.usertype,
            // userId: user?.id,
            // userEmail: user?.email,
            // allowGuestOrders
        // });
        
        // console.log('👤 USER COMPLETO:', JSON.stringify(user, null, 2));

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

            
            // Debug: interceptar request para ver exactamente qué se envía
            const config = {
                method: 'GET',
                url: url,
                headers: {},
                timeout: 10000
            };
            
            // console.log('📤 CONFIG DE REQUEST:', JSON.stringify(config, null, 2));
            
            // PRUEBA DEFINITIVA: usar fetch() en lugar de axios
            
            // PRIMERA: Probar endpoint que SÍ funciona (login)
            const testResponse = await fetch('https://occr.pixelcrafters.digital/api/auth/google', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ test: true })
            });
            
            // SEGUNDA: Probar orderhistory
            const fetchResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            
            if (!fetchResponse.ok) {
                throw new Error(`FETCH failed with status ${fetchResponse.status}`);
            }
            
            const fetchData = await fetchResponse.json();
            
            const ordersData = fetchData.orders || [];
            
            // 🔍 DEBUG TEMPORAL: Ver órdenes recibidas para drivers
            if (user.usertype === 'driver') {
                // console.log('🚚 DRIVER ORDERS DEBUG:', {
                // count: ordersData.length,
                // orders: ordersData.map(order => ({
                // id: order.id,
                // status: order.status,
                // payment_status: order.payment_status,
                // driver_id: order.driver_id,
                // user_email: order.user_email
                // }))
                // });
            }

            // 🏪 DEBUG OXXO: Ver todas las órdenes para usuarios normales
            if (user.usertype !== 'driver') {
                // console.log('🏪 OXXO DEBUG - All Orders Received:', {
                // userType: user.usertype,
                // userEmail: user.email,
                // userId: user.id,
                // totalOrders: ordersData.length,
                // orders: ordersData.map(order => ({
                // id: order.id,
                // status: order.status,
                // payment_status: order.payment_status,
                // payment_method: order.payment_method,
                // created_at: order.created_at,
                // total: order.total
                // }))
                // });
            }
            
            // 🔍 DEBUG TEMPORAL REMOVIDO - Ya no necesario
            
            // 🚚 FILTRADO ESPECÍFICO PARA DRIVERS
            let filteredOrders = ordersData;
            
            if (user.usertype === 'driver') {
                // Solo mostrar órdenes válidas para drivers:
                // 1. Pago completado
                // 2. Estados específicos de workflow del driver
                filteredOrders = ordersData.filter(order => {
                    // 🔍 TEMPORAL: Filtro más permisivo para debug
                    const paymentValid = ['paid', 'pending', 'completed'].includes(order.payment_status);
                    const statusValid = ['Open', 'Abierto', 'On the Way', 'Delivered', 'Assigned', 'Pending', 'assigned', 'pending'].includes(order.status);
                    
                    // console.log(`🔍 FILTRO DRIVER - Orden ${order.id}:`, {
                    // payment_status: order.payment_status,
                    // status: order.status,
                    // driver_id: order.driver_id,
                    // paymentValid,
                    // statusValid,
                    // incluir: paymentValid && statusValid
                    // });
                    
                    return paymentValid && statusValid;
                });
                
                // console.log(`✅ DRIVER FILTRADO: ${ordersData.length} → ${filteredOrders.length} órdenes válidas`);
            }
            
            // Ordenar por fecha descendente
            const sortedOrders = filteredOrders.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );

            setOrders(sortedOrders);
            
            // Contar órdenes activas según tipo de usuario
            let activeOrders;
            if (user.usertype === 'driver') {
                // Para drivers: contar órdenes asignadas y en progreso (incluyendo estados de asignación)
                activeOrders = sortedOrders.filter(order => ['Open', 'Abierto', 'On the Way', 'Assigned', 'Pending', 'assigned', 'pending'].includes(order.status));
            } else {
                // Para usuarios normales: contar órdenes no completadas
                const completedStatuses = ['delivered', 'entregado', 'completed', 'finalizado', 'cancelled', 'cancelado'];
                activeOrders = sortedOrders.filter(order =>
                    order.status && !completedStatuses.includes(order.status.toLowerCase())
                );

                // 🏪 DEBUG OXXO: Ver filtrado de órdenes activas
                // console.log('🏪 OXXO DEBUG - Active Orders Filter:', {
                // userType: user.usertype,
                // totalOrders: sortedOrders.length,
                // activeOrders: activeOrders.length,
                // completedStatuses: completedStatuses,
                // allOrdersStatus: sortedOrders.map(order => ({
                // id: order.id,
                // status: order.status,
                // payment_status: order.payment_status,
                // isActive: order.status && !completedStatuses.includes(order.status.toLowerCase())
                // }))
                // });
            }
            setOrderCount(activeOrders.length);
            setLastFetch(new Date());

            // console.log('✅ Orders processed:', {
                // total: sortedOrders.length,
                // active: activeOrders.length
            // });
            
        } catch (err) {
            
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

    // ✅ DRIVER FIX: Función para refresh inmediato (útil para notificaciones push)
    const forceRefreshOrders = useCallback(() => {
        // console.log('🔄 FORCE REFRESH para driver - nueva orden asignada');
        fetchOrdersFromServer();
    }, [fetchOrdersFromServer]);

    // Auto-refresh optimizado por tipo de usuario
    useEffect(() => {
        if (user && (user.usertype !== 'Guest' || allowGuestOrders)) {
            // Fetch inicial
            fetchOrdersFromServer();
            
            // ✅ AUTO-REFRESH MEJORADO: Más frecuente para todos los usuarios
            const refreshInterval = user.usertype === 'driver' ? 5000 : 15000; // Drivers: 5s, Users: 15s (antes 30s)
            
            const interval = setInterval(() => {
                fetchOrdersFromServer();
            }, refreshInterval);
            
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
            forceRefreshOrders, // ✅ DRIVER FIX: Nueva función para refresh inmediato
            lastFetch,
            enableGuestOrders,
            disableGuestOrders,
            fetchOrdersFromServer 
        }}>
            {children}
        </OrderContext.Provider>
    );
}
