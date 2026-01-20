import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { AuthContext } from './AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config/environment';

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
                url = `/api/orderhistorydriver/${user.id}`;
            } else if (user.usertype === 'Guest' && allowGuestOrders) {
                // ✅ Para Guest, usar email como user_id en el endpoint normal
                url = `/api/orderhistory/${encodeURIComponent(user.email)}`;
            } else {
                url = `/api/orderhistory/${user.id}`;
            }

            const fetchResponse = await fetch(`${API_BASE_URL}${url}`, {
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
                // 2. Estados específicos de workflow del driver (incluyendo canceladas)
                filteredOrders = ordersData.filter(order => {
                    // 🔍 TEMPORAL: Filtro más permisivo para debug
                    const paymentValid = ['paid', 'pending', 'completed'].includes(order.payment_status);
                    // Backend estados: Open, On the Way, Arriving, Delivered, Cancelled
                    const validStatuses = ['open', 'on the way', 'arriving', 'delivered', 'cancelled'];
                    const statusValid = validStatuses.includes(order.status?.toLowerCase());

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
            
            // 🎯 Contar SOLO órdenes activas según tipo de usuario
            let activeOrders;
            if (user.usertype === 'driver') {
                // Para drivers: contar SOLO órdenes activas (EXCLUIR entregadas y canceladas)
                // Backend estados activos: Open, On the Way, Arriving
                const activeDriverStatuses = ['open', 'on the way', 'arriving'];
                activeOrders = sortedOrders.filter(order =>
                    activeDriverStatuses.includes(order.status?.toLowerCase()) &&
                    ['paid', 'pending', 'completed'].includes(order.payment_status)
                );
            } else {
                // Para usuarios normales: contar SOLO órdenes activas (EXCLUIR entregadas y canceladas)
                // Backend estados finalizados: Delivered, Cancelled
                const finishedStatuses = ['delivered', 'cancelled'];
                activeOrders = sortedOrders.filter(order =>
                    order.status && !finishedStatuses.includes(order.status.toLowerCase()) &&
                    order.payment_status === 'paid'
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
            // NO borrar las órdenes existentes cuando hay error de red
            // Solo registrar el error silenciosamente y mantener los datos actuales
            // Esto evita que los pedidos "desaparezcan" por errores temporales
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
        // Backend estados finalizados: Delivered, Cancelled
        const finishedStatuses = ['delivered', 'cancelled'];
        const activeOrders = ordersData.filter(order =>
            order.status && !finishedStatuses.includes(order.status.toLowerCase())
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
