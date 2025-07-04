import React, { createContext, useState } from 'react';

export const OrderContext = createContext();

export function OrderProvider({ children }) {
    const [orderCount, setOrderCount] = useState(null); // <-- for badge count
    const [orders, setOrders] = useState([]); // optional: full order data

    const updateOrders = (ordersData) => {
        setOrders(ordersData);
        const notDelivered = ordersData.filter(order => order.status !== 'Delivered');
        setOrderCount(notDelivered.length);
    };

    return (
        <OrderContext.Provider value={{ orders, orderCount, updateOrders }}>
            {children}
        </OrderContext.Provider>
    );
}
