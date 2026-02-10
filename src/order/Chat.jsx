import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, AppState, Keyboard, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import fonts from '../theme/fonts';
import { API_BASE_URL } from '../config/environment';

export default function Chat({ orderId, order }) {
    const [newMessage, setNewMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [isSending, setIsSending] = useState(false); // FIX #4: Estado de enviando
    const [sendError, setSendError] = useState(false); // FIX #5: Estado de error
    const { user } = useContext(AuthContext);
    const scrollViewRef = useRef(null);
    const msgIntervalRef = useRef(null);
    const textInputRef = useRef(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // FIX #1 & #2: Usar ref para tracking de mensajes previos (evita stale closure)
    const previousMessagesCountRef = useRef(0);

    // Generar título dinámico del chat
    const getChatTitle = () => {
        if (user?.usertype === 'driver') {
            const customerName = order?.customer?.first_name
                ? order.customer.first_name
                : order?.customer?.email || 'Cliente';
            return `Chatea con ${customerName}`;
        } else {
            const driverName = order?.driver?.first_name
                ? `${order.driver.first_name} ${order.driver.last_name || ''}`.trim()
                : order?.driver?.name || 'tu repartidor';
            return `Chatea con ${driverName}`;
        }
    };

    // FIX #6: Formatear hora del mensaje
    const formatMessageTime = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return '';
        }
    };

    // FIX #1: Dependency array corregida - solo orderId
    const fetchMessages = useCallback(async (forceScroll = false) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/msgfetch/${orderId}`);
            if (response.data) {
                const formattedMessages = response.data.data.map(msg => ({
                    id: msg.id,
                    sender: msg.sender,
                    senderName: msg.sender === 'driver' ? 'Driver' : 'Customer',
                    text: msg.message,
                    created_at: msg.created_at,
                    // FIX #4: Mensajes del servidor siempre están "delivered"
                    status: 'delivered'
                }));

                // FIX #2: Usar ref para comparación confiable
                const previousCount = previousMessagesCountRef.current;
                const newCount = formattedMessages.length;

                setChatMessages(formattedMessages);
                previousMessagesCountRef.current = newCount;

                // Auto-scroll cuando hay nuevos mensajes o forzado
                if (forceScroll || newCount > previousCount) {
                    setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            }
        } catch (err) {
            // Chat fetch error - silencioso
        }
    }, [orderId]); // FIX #1: Solo orderId como dependencia

    // Sistema de auto-refresh
    useEffect(() => {
        // Fetch inicial con scroll automático
        fetchMessages(true);

        // Configurar intervalo para chat activo (3 segundos)
        msgIntervalRef.current = setInterval(() => {
            fetchMessages();
        }, 3000);

        // Listener para AppState - refresh cuando regresa del background
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                fetchMessages(true);
            }
        };

        const appStateListener = AppState.addEventListener('change', handleAppStateChange);

        // Listeners de teclado para iOS
        let keyboardDidShowListener, keyboardDidHideListener;

        if (Platform.OS === 'ios') {
            keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
                setKeyboardHeight(event.endCoordinates.height);
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

            if (Platform.OS === 'ios') {
                keyboardDidShowListener?.remove();
                keyboardDidHideListener?.remove();
            }
        };
    }, [fetchMessages]);

    // Manejar focus del input para iOS
    const handleInputFocus = () => {
        if (Platform.OS === 'ios') {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 300);
        }
    };

    // FIX #3, #4, #5: Envío de mensaje mejorado
    const handleSendMessageWithRefresh = async () => {
        const messageText = newMessage.trim();
        if (!messageText || isSending) return;

        // Limpiar error previo
        setSendError(false);
        setIsSending(true);

        // Guardar mensaje y limpiar input inmediatamente (UX optimista)
        const tempMessage = messageText;
        setNewMessage('');

        // FIX #4: Agregar mensaje temporal con estado "sending"
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            id: tempId,
            sender: user.usertype,
            senderName: user.usertype === 'driver' ? 'Driver' : 'Customer',
            text: tempMessage,
            created_at: new Date().toISOString(),
            status: 'sending' // Palomita gris
        };

        setChatMessages(prev => [...prev, optimisticMessage]);
        previousMessagesCountRef.current += 1;

        // Scroll al nuevo mensaje
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        try {
            const payload = {
                orderid: orderId,
                sender: user.usertype,
                message: tempMessage,
            };

            await axios.post(`${API_BASE_URL}/api/msgsubmit`, payload);

            // FIX #4: Actualizar estado a "sent" (una palomita)
            setChatMessages(prev =>
                prev.map(msg =>
                    msg.id === tempId
                        ? { ...msg, status: 'sent' }
                        : msg
                )
            );

            // Refresh para obtener el mensaje real del servidor
            // Esto actualizará el estado a "delivered" (dos palomitas)
            setTimeout(() => fetchMessages(true), 800);

        } catch (error) {
            // FIX #5: Manejo de error visible
            setSendError(true);

            // Marcar mensaje como fallido
            setChatMessages(prev =>
                prev.map(msg =>
                    msg.id === tempId
                        ? { ...msg, status: 'failed' }
                        : msg
                )
            );

            // Restaurar mensaje al input para reintentar
            setNewMessage(tempMessage);
        } finally {
            setIsSending(false);
        }
    };

    // FIX #4: Renderizar indicador de estado (palomitas)
    // Sistema honesto: ✓ = enviado, ✓✓ = confirmado en servidor (mismo color gris)
    const renderMessageStatus = (msg) => {
        // Solo mostrar estado en mensajes propios
        if (msg.sender !== user.usertype) return null;

        switch (msg.status) {
            case 'sending':
                // Reloj mientras envía
                return (
                    <Ionicons
                        name="time-outline"
                        size={12}
                        color="#999"
                        style={styles.statusIcon}
                    />
                );
            case 'sent':
                // Una palomita gris - enviado al servidor
                return (
                    <Ionicons
                        name="checkmark"
                        size={14}
                        color="#8696A0"
                        style={styles.statusIcon}
                    />
                );
            case 'delivered':
                // Dos palomitas grises - confirmado en servidor
                return (
                    <View style={styles.doubleCheck}>
                        <Ionicons
                            name="checkmark"
                            size={14}
                            color="#8696A0"
                        />
                        <Ionicons
                            name="checkmark"
                            size={14}
                            color="#8696A0"
                            style={styles.secondCheck}
                        />
                    </View>
                );
            case 'failed':
                // Error - icono de advertencia
                return (
                    <Ionicons
                        name="alert-circle"
                        size={14}
                        color="#E74C3C"
                        style={styles.statusIcon}
                    />
                );
            default:
                return null;
        }
    };

    // FIX #5: Reintentar envío de mensaje fallido
    const handleRetryMessage = (msg) => {
        // Remover mensaje fallido
        setChatMessages(prev => prev.filter(m => m.id !== msg.id));
        previousMessagesCountRef.current -= 1;

        // Poner texto en input
        setNewMessage(msg.text);

        // Enfocar input
        textInputRef.current?.focus();
    };

    return (
        <View style={styles.chatCard}>
            <View style={styles.headerContainer}>
                <Ionicons name="chatbubbles" size={20} color="#33A744" />
                <Text style={styles.sectionTitle}>{getChatTitle()}</Text>
            </View>

            {/* FIX #5: Mostrar error de conexión */}
            {sendError && (
                <View style={styles.errorBanner}>
                    <Ionicons name="warning-outline" size={14} color="#E74C3C" />
                    <Text style={styles.errorText}>Error al enviar. Toca el mensaje para reintentar.</Text>
                </View>
            )}

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
                {chatMessages.length === 0 ? (
                    <View style={styles.emptyChat}>
                        <Ionicons name="chatbubble-ellipses-outline" size={40} color="#CCC" />
                        <Text style={styles.emptyChatText}>Inicia la conversación</Text>
                    </View>
                ) : (
                    chatMessages.map((msg, index) => (
                        <TouchableOpacity
                            key={msg.id || index}
                            activeOpacity={msg.status === 'failed' ? 0.7 : 1}
                            onPress={() => msg.status === 'failed' && handleRetryMessage(msg)}
                            style={[
                                styles.chatBubble,
                                msg.sender === user.usertype ? styles.chatBubbleRight : styles.chatBubbleLeft,
                                msg.status === 'failed' && styles.chatBubbleFailed,
                            ]}
                        >
                            <Text style={[
                                styles.chatText,
                                msg.status === 'failed' && styles.chatTextFailed
                            ]}>
                                {msg.text}
                            </Text>
                            {/* FIX #6: Hora + Estado */}
                            <View style={styles.messageFooter}>
                                <Text style={styles.messageTime}>
                                    {formatMessageTime(msg.created_at)}
                                </Text>
                                {renderMessageStatus(msg)}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Input fijo en la parte inferior */}
            <View style={styles.chatInputContainer}>
                <TextInput
                    ref={textInputRef}
                    style={styles.chatInput}
                    placeholder="Escribe tu mensaje..."
                    placeholderTextColor="#999"
                    value={newMessage}
                    onChangeText={(text) => {
                        setNewMessage(text);
                        setSendError(false); // Limpiar error al escribir
                    }}
                    multiline={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSendMessageWithRefresh}
                    onFocus={handleInputFocus}
                    blurOnSubmit={false}
                    enablesReturnKeyAutomatically={true}
                    editable={!isSending}
                />
                <TouchableOpacity
                    onPress={handleSendMessageWithRefresh}
                    style={[
                        styles.sendButton,
                        (isSending || !newMessage.trim()) && styles.sendButtonDisabled
                    ]}
                    disabled={isSending || !newMessage.trim()}
                >
                    {isSending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name="send" size={20} color="#fff" />
                    )}
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
        maxHeight: 400,
        minHeight: 250,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: fonts.size.large,
        fontFamily: fonts.bold,
        color: '#333',
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
    emptyChat: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyChatText: {
        marginTop: 8,
        fontSize: fonts.size.medium,
        fontFamily: fonts.regular,
        color: '#999',
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
        minWidth: 40,
        minHeight: 40,
    },
    sendButtonDisabled: {
        backgroundColor: '#A5D6A7',
    },
    chatText: {
        fontSize: fonts.size.small,
        color: '#333',
        fontFamily: fonts.regular,
        lineHeight: 18,
    },
    chatTextFailed: {
        color: '#666',
    },
    chatBubble: {
        maxWidth: '80%',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
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
    chatBubbleFailed: {
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: '#E74C3C',
    },
    // FIX #6: Estilos para hora y estado
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 2,
        gap: 4,
    },
    messageTime: {
        fontSize: 10,
        fontFamily: fonts.regular,
        color: '#888',
    },
    statusIcon: {
        marginLeft: 2,
    },
    doubleCheck: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 2,
    },
    secondCheck: {
        marginLeft: -8, // Solapar las palomitas como WhatsApp
    },
    // FIX #5: Banner de error
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    errorText: {
        fontSize: fonts.size.tiny,
        fontFamily: fonts.regular,
        color: '#E74C3C',
    },
});
