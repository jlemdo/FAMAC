import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, AppState, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import NotificationService from '../services/NotificationService';
import axios from 'axios';
import fonts from '../theme/fonts';

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
            const response = await axios.get(`https://awsoccr.pixelcrafters.digital/api/msgfetch/${orderId}`);
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
            const response = await axios.post('https://awsoccr.pixelcrafters.digital/api/msgsubmit', payload);

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
        <View style={styles.chatCard}>
            <Text style={styles.sectionTitle}>{getChatTitle()}</Text>

            <KeyboardAwareScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                enableAutomaticScroll={true}
                extraScrollHeight={20}
                keyboardOpeningTime={0}
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
            </KeyboardAwareScrollView>

            <View style={styles.chatInputContainer}>
                <TextInput
                    ref={textInputRef}
                    style={styles.chatInput}
                    placeholder="Escribe tu mensaje..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSendMessageWithRefresh}
                    onFocus={handleInputFocus}
                    blurOnSubmit={true}
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
        flex: 1,
    },
    sectionTitle: {
        fontSize: fonts.size.large,
        fontFamily: fonts.bold,
        marginBottom: 10,
        color: '#333',
    },
    messagesContainer: {
        flex: 1,
        marginBottom: 10,
    },
    messagesContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        paddingBottom: 10,
    },
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingTop: 10,
        backgroundColor: '#FFF',
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
