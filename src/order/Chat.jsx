import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, AppState, Keyboard, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import fonts from '../theme/fonts';
import { API_BASE_URL } from '../config/environment';

export default function Chat({ orderId, order }) {
    const [newMessage, setNewMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const { user } = useContext(AuthContext);
    const scrollViewRef = useRef(null);
    const msgIntervalRef = useRef(null);
    const textInputRef = useRef(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    
    // Generar título dinámico del chat
    const getChatTitle = () => {
        if (user?.usertype === 'driver') {
            const customerName = order?.customer?.first_name
                ? order.customer.first_name
                : order?.customer?.email || 'Cliente';
            return `💬 Chatea con ${customerName}`;
        } else {
            const driverName = order?.driver?.first_name
                ? `${order.driver.first_name} ${order.driver.last_name || ''}`.trim()
                : order?.driver?.name || 'tu repartidor';
            return `💬 Chatea con ${driverName}`;
        }
    };


    const fetchMessages = useCallback(async (forceScroll = false) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/msgfetch/${orderId}`);
            if (response.data) {
                // ✅ FIX: SIN reverse() para que mensajes viejos estén arriba (como WhatsApp)
                const formattedMessages = response.data.data.map(msg => ({
                    sender: msg.sender,
                    senderName: msg.sender === 'driver' ? 'Driver' : 'Customer',
                    text: msg.message,
                    created_at: msg.created_at, // Para debugging
                }));

                // ✅ PUNTO 13: Verificar si hay nuevos mensajes
                const previousLength = chatMessages.length;
                const newLength = formattedMessages.length;

                setChatMessages(formattedMessages);

                // ✅ Auto-scroll cuando hay nuevos mensajes o forzado
                if (forceScroll || newLength > previousLength) {
                    setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            }
        } catch (err) {
            // Chat fetch error
        }
    }, [orderId, chatMessages.length]);

    // ✅ PUNTO 13: Sistema de auto-refresh mejorado con manejo de notificaciones
    useEffect(() => {
        // Fetch inicial con scroll automático
        fetchMessages(true);

        // Configurar intervalo más frecuente para chat activo
        msgIntervalRef.current = setInterval(() => {
            fetchMessages();
        }, 3000); // Más frecuente para chat: 3 segundos vs 5

        // ✅ PUNTO 13: Listener para AppState - refresh cuando regresa del background
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                // console.log('💬 Chat: App regresó del background - refrescando mensajes');
                fetchMessages(true); // Forzar scroll al regresar
            }
        };

        const appStateListener = AppState.addEventListener('change', handleAppStateChange);

        // ✅ PUNTO 18: Listeners de teclado para iOS
        let keyboardDidShowListener, keyboardDidHideListener;

        if (Platform.OS === 'ios') {
            keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
                setKeyboardHeight(event.endCoordinates.height);
                // Auto-scroll al final cuando aparece teclado
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
            });

            keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
                setKeyboardHeight(0);
            });
        }

        return () => {
            if (msgIntervalRef.current) {
                clearInterval(msgIntervalRef.current);
                msgIntervalRef.current = null;
            }
            appStateListener?.remove();

            // ✅ PUNTO 18: Cleanup listeners de teclado
            if (Platform.OS === 'ios') {
                keyboardDidShowListener?.remove();
                keyboardDidHideListener?.remove();
            }
        };
    }, [fetchMessages]);

    // ✅ PUNTO 18: Manejar focus del input para iOS
    const handleInputFocus = () => {
        if (Platform.OS === 'ios') {
            // Delay para permitir que el teclado aparezca primero
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 300);
        }
    };

    // ✅ PUNTO 13: Force refresh cuando se envía mensaje propio
    const handleSendMessageWithRefresh = async () => {
        if (!newMessage.trim()) return;

        try {
            const payload = {
                orderid: orderId,
                sender: user.usertype,
                message: newMessage,
            };
            const response = await axios.post(`${API_BASE_URL}/api/msgsubmit`, payload);

            if (response) {
                setNewMessage('');
                // ✅ Refresh inmediato después de enviar mensaje
                setTimeout(() => fetchMessages(true), 500);
            }
        } catch (error) {
            // Send message error
        }
    };

    return (
        <View style={[
            styles.chatCard,
            Platform.OS === 'ios' && keyboardHeight > 0 && { marginBottom: keyboardHeight }
        ]}>
            <Text style={styles.sectionTitle}>{getChatTitle()}</Text>

            {/* Área de mensajes con scroll */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesScrollView}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                onContentSizeChange={() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
            >
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

            {/* Input fijo en la parte inferior */}
            <View style={styles.chatInputContainer}>
                <TextInput
                    ref={textInputRef}
                    style={styles.chatInput}
                    placeholder="Escribe tu mensaje..."
                    placeholderTextColor="#999"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSendMessageWithRefresh}
                    onFocus={handleInputFocus}
                    blurOnSubmit={false}
                    enablesReturnKeyAutomatically={true}
                />
                <TouchableOpacity onPress={handleSendMessageWithRefresh} style={styles.sendButton}>
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    chatCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 2},
        elevation: 3,
        maxHeight: 400, // Altura máxima fija para que no ocupe toda la pantalla
        minHeight: 250, // Altura mínima para que sea usable
    },
    sectionTitle: {
        fontSize: fonts.size.large,
        fontFamily: fonts.bold,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        color: '#333',
        backgroundColor: '#FFF',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    messagesScrollView: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    messagesContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexGrow: 1,
    },
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    chatInput: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        borderRadius: 20,
        fontSize: fonts.size.medium,
        fontFamily: fonts.regular,
        color: '#333',
        maxHeight: 80,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    sendButton: {
        backgroundColor: '#33A744',
        padding: 10,
        marginLeft: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatText: {
        fontSize: fonts.size.small,
        color: '#333',
        fontFamily: fonts.regular,
        lineHeight: 18,
    },
    chatBubble: {
        maxWidth: '80%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginVertical: 4,
    },
    chatBubbleLeft: {
        backgroundColor: '#EBEBEB',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    chatBubbleRight: {
        backgroundColor: '#DCF8C6',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
});
