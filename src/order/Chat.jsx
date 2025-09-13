import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import fonts from '../theme/fonts';

export default function Chat({ orderId, order }) {
    const [newMessage, setNewMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const { user } = useContext(AuthContext);
    
    // Generar título dinámico del chat
    const getChatTitle = () => {
        if (user?.usertype === 'driver') {
            const customerName = order?.customer?.first_name 
                ? `${order.customer.first_name} ${order.customer.last_name || ''}`.trim()
                : order?.customer?.email || 'Cliente';
            return `💬 Chatea con ${customerName}`;
        } else {
            const driverName = order?.driver?.first_name 
                ? `${order.driver.first_name} ${order.driver.last_name || ''}`.trim()
                : order?.driver?.name || 'tu repartidor';
            return `💬 Chatea con ${driverName}`;
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) {return;}

        try {
            const payload = {
                orderid: orderId,
                sender: user.usertype,
                message: newMessage,
            };
            const response = await axios.post('https://occr.pixelcrafters.digital/api/msgsubmit', payload);

            if (response) {
                setNewMessage('');
            }
        } catch (error) {
            // Send message error
        }
    };

    const fetchMessages = useCallback(async () => {
        try {
            const response = await axios.get(`https://occr.pixelcrafters.digital/api/msgfetch/${orderId}`);
            if (response.data) {
                const formattedMessages = response.data.data.reverse().map(msg => ({
                    sender: msg.sender,
                    senderName: msg.sender === 'driver' ? 'Driver' : 'Customer',
                    text: msg.message,
                }));
                setChatMessages(formattedMessages);
            }
        } catch (err) {
            // Chat fetch error
        }
    }, [orderId]);

    useEffect(() => {
        let msgInterval = null;

        fetchMessages();
        msgInterval = setInterval(() => {
            fetchMessages();
        }, 5000);

        return () => {
            if (msgInterval) {clearInterval(msgInterval);}
        };
    }, [fetchMessages]);

    return (
        <View style={styles.chatCard}>
            <ScrollView>
                <Text style={styles.sectionTitle}>{getChatTitle()}</Text>

                <View style={styles.chatInputContainer}>
                    <TextInput
                        style={styles.chatInput}
                        placeholder="Escribe tu Mensaje..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                    />
                    <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {chatMessages.map((msg, index) => (
                    <View
                        key={index}
                        style={[
                            styles.chatBubble,
                            msg.sender === user.usertype ? styles.chatBubbleRight : styles.chatBubbleLeft,
                        ]}
                    >

                        <Text style={styles.chatText}>{msg.text}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2EFE4',
    },
    chatCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 2},
        elevation: 3,
    },
    sectionTitle: {
        fontSize: fonts.size.large,
        fontFamily: fonts.bold,
        marginBottom: 10,
        color: '#333',
    },
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingTop: 10,
    },
    chatInput: {
        flex: 1,
        backgroundColor: '#f1f1f1',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        fontSize: fonts.size.small,
        fontFamily: fonts.regular,
    },
    sendButton: {
        backgroundColor: '#28a745',
        padding: 10,
        marginLeft: 8,
        borderRadius: 20,
    },
    senderName: {
        fontSize: fonts.size.small,
        color: '#555',
        marginBottom: 2,
        fontFamily: fonts.bold,
    },
    chatText: {
        fontSize: fonts.size.small,
        color: '#333',
        fontFamily: fonts.regular,
    },
    chatBubble: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 10,
        marginVertical: 6,
    },

    chatBubbleLeft: {
        backgroundColor: '#f1f0f0',
        alignSelf: 'flex-start',
        borderTopLeftRadius: 0,
    },

    chatBubbleRight: {
        backgroundColor: '#daf8cb',
        alignSelf: 'flex-end',
        borderTopRightRadius: 0,
    },
});
