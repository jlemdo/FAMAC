import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import fonts from '../theme/fonts';

export default function Route() {
    const [orderStatus, setOrderStatus] = useState('In Transit');

    // const origin = { latitude: 37.7749, longitude: -122.4194 };
    // const destination = { latitude: 37.7849, longitude: -122.4094 };

    return (
        <View style={styles.container}>
            <Text style={{ fontFamily: fonts.regular }}>Route is in-progress</Text>
            {/* <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude: 30.1575, // Example: Multan, Pakistan
                    longitude: 71.5249,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >

            </MapView> */}

            <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>Order Status</Text>
                <Text style={styles.status}>{orderStatus}</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={() => setOrderStatus('Out for Delivery')}>
                    <Text style={styles.refreshText}>Update Status</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent:'center',
        alignItems:'center',
    },
    map: {
        flex: 3,
    },
    statusContainer: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 5,
    },
    statusTitle: {
        fontSize: fonts.size.medium,
        fontFamily: fonts.bold,
        marginBottom: 5,
    },
    status: {
        fontSize: fonts.size.medium,
        color: 'tomato',
        marginBottom: 10,
        fontFamily: fonts.regular,
    },
    refreshButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
    },
    refreshText: {
        color: '#fff',
        fontSize: fonts.size.medium,
        fontFamily: fonts.bold,
    },
});
