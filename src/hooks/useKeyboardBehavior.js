/**
 * Hook personalizado para manejo profesional del teclado
 * Proporciona scroll automático, refs y configuración óptima
 * Compatible con iOS y Android
 */
import { useRef, useCallback, useEffect } from 'react';
import { Keyboard, Platform, Dimensions } from 'react-native';

export const useKeyboardBehavior = () => {
  const scrollViewRef = useRef(null);
  const inputRefs = useRef({});
  const keyboardHeight = useRef(0);
  
  // Función para registrar un input con su ID único
  const registerInput = useCallback((inputId, ref) => {
    inputRefs.current[inputId] = ref;
  }, []);

  // Función para hacer scroll automático al input activo
  const scrollToInput = useCallback((inputId, additionalOffset = 0) => {
    const inputRef = inputRefs.current[inputId];
    const scrollRef = scrollViewRef.current;
    
    if (!inputRef || !scrollRef) return;
    
    // Delay para asegurar que el teclado se haya mostrado
    setTimeout(() => {
      inputRef.measureInWindow((x, y, width, height) => {
        const { height: screenHeight } = Dimensions.get('window');
        const keyboardOffset = keyboardHeight.current || 300; // Fallback a 300px
        const visibleScreenHeight = screenHeight - keyboardOffset;
        
        // Calcular posición ideal: input en el tercio superior de la pantalla visible
        const idealY = visibleScreenHeight * 0.25; // 25% desde arriba de la pantalla visible
        const currentInputY = y;
        
        // Solo hacer scroll si el input está por debajo de la posición ideal
        if (currentInputY > idealY) {
          const scrollOffset = currentInputY - idealY + additionalOffset;
          
          scrollRef.scrollTo({
            y: scrollOffset,
            animated: true,
          });
        }
      });
    }, Platform.OS === 'ios' ? 250 : 100); // iOS necesita más tiempo
  }, []);

  // Función helper para crear onFocus handler
  const createFocusHandler = useCallback((inputId, additionalOffset = 0) => {
    return () => scrollToInput(inputId, additionalOffset);
  }, [scrollToInput]);

  // Listener para detectar altura del teclado (útil para cálculos precisos)
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        keyboardHeight.current = event.endCoordinates.height;
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.current = 0;
      }
    );

    return () => {
      keyboardWillShow?.remove();
      keyboardWillHide?.remove();
    };
  }, []);

  return {
    // Ref para el ScrollView principal
    scrollViewRef,
    
    // Función para registrar inputs
    registerInput,
    
    // Función para scroll automático
    scrollToInput,
    
    // Helper para crear onFocus handlers fácilmente
    createFocusHandler,
    
    // Configuración recomendada para KeyboardAvoidingView
    keyboardAvoidingViewProps: {
      behavior: Platform.OS === 'ios' ? 'padding' : 'height',
      keyboardVerticalOffset: Platform.OS === 'ios' ? 0 : 0,
    },
    
    // Configuración recomendada para ScrollView
    scrollViewProps: {
      ref: scrollViewRef,
      keyboardShouldPersistTaps: 'handled',
      showsVerticalScrollIndicator: false,
      contentContainerStyle: { flexGrow: 1 },
    },
  };
};

// Hook simplificado para formularios básicos (cuando no necesitas control granular)
export const useSimpleKeyboardBehavior = () => {
  const { scrollViewRef, scrollViewProps, keyboardAvoidingViewProps } = useKeyboardBehavior();
  
  return {
    scrollViewRef,
    scrollViewProps,
    keyboardAvoidingViewProps,
  };
};

export default useKeyboardBehavior;