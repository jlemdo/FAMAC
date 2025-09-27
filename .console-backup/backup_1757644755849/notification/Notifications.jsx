import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNotification } from '../context/NotificationContext';
import fonts from '../theme/fonts';

const Notifications = ({ navigation }) => {
    // const [notifications, setNotifications] = useState(route.params?.notifications || []);
    const { notifications, markAsRead } = useNotification();
    // Toggle notification read/unread state & expand content
    const toggleNotification = (id) => {
        markAsRead(id);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
            </View>

            {/* Notification List */}
            {notifications.length > 0 ? (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => toggleNotification(item.id)}>
                            <View style={[styles.notificationItem, item.read ? styles.readNotification : styles.unreadNotification]}>
                                {/* Header */}
                                <Text style={[styles.notificationTitle, item.read ? styles.readText : styles.unreadText]}>
                                    {item.title}
                                </Text>
                                {/* Full Message (only visible when clicked) */}
                                {item.expanded && <Text style={styles.notificationDescription}>{item.description}</Text>}
                            </View>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <Text style={styles.emptyText}>No notifications available</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        padding: 15,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 10,
        marginTop: 10,
    },
    backButton: {
        marginRight: 10,
    },
    title: {
        fontSize: fonts.size.large,
        fontFamily: fonts.bold,
        flex: 1,
        textAlign: 'center',
    },
    notificationItem: {
        padding: 15,
        marginVertical: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    unreadNotification: {
        backgroundColor: '#ffffff',
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    readNotification: {
        backgroundColor: '#EAEAEA',
        borderLeftWidth: 4,
        borderLeftColor: '#B0B0B0',
    },
    notificationTitle: {
        fontSize: fonts.size.medium,
        fontFamily: fonts.bold,
    },
    unreadText: {
        color: '#333',
    },
    readText: {
        color: '#666',
    },
    notificationDescription: {
        fontSize: fonts.size.medium,
        color: '#555',
        marginTop: 5,
        fontFamily: fonts.regular,
    },
    emptyText: {
        fontSize: fonts.size.medium,
        textAlign: 'center',
        marginTop: 20,
        color: 'gray',
        fontFamily: fonts.regular,
    },
});

export default Notifications;
