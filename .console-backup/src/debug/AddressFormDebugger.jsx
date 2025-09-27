/**
 * 🐛 AddressFormDebugger - Sistema de debugging visual para iOS
 * Muestra logs en pantalla para debugear botones que se "congelan"
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AddressFormDebugger = () => {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [buttonStates, setButtonStates] = useState({});

  // 🔧 Sistema de logs centralizado
  const addLog = (message, type = 'info', data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = {
      id: Date.now(),
      timestamp,
      message,
      type, // 'info', 'success', 'warning', 'error', 'button'
      data: data ? JSON.stringify(data, null, 2) : null,
    };

    setLogs(prevLogs => {
      const newLogs = [newLog, ...prevLogs];
      return newLogs.slice(0, 50); // Mantener solo los últimos 50 logs
    });
  };

  // 🎯 Función para trackear estado de botones
  const trackButton = (buttonId, state, additionalData = {}) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: {
        state, // 'pressed', 'executing', 'completed', 'error', 'disabled'
        timestamp: Date.now(),
        ...additionalData
      }
    }));

    addLog(`🔘 Button [${buttonId}]: ${state}`, 'button', additionalData);
  };

  // 🎯 Función para trackear navegación
  const trackNavigation = (from, to, params = {}) => {
    addLog(`🧭 Navigation: ${from} → ${to}`, 'info', params);
  };

  // 🎯 Función para trackear funciones async
  const trackAsync = (functionName, stage, result = null) => {
    const logTypes = {
      'start': 'info',
      'success': 'success', 
      'error': 'error'
    };
    
    addLog(`⚡ Async [${functionName}]: ${stage}`, logTypes[stage] || 'info', result);
  };

  // 🎯 Función para limpiar logs
  const clearLogs = () => {
    setLogs([]);
    setButtonStates({});
  };

  // 🎨 Obtener color del log según tipo
  const getLogColor = (type) => {
    const colors = {
      'info': '#2196F3',
      'success': '#4CAF50', 
      'warning': '#FF9800',
      'error': '#F44336',
      'button': '#9C27B0'
    };
    return colors[type] || '#666';
  };

  // 🎨 Obtener emoji del tipo
  const getLogEmoji = (type) => {
    const emojis = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️', 
      'error': '❌',
      'button': '🔘'
    };
    return emojis[type] || '📝';
  };

  // 🔄 Auto-scroll para nuevos logs
  useEffect(() => {
    if (logs.length > 0) {
      // Auto mostrar debugger cuando hay logs nuevos (solo en desarrollo)
      if (__DEV__) {
        setIsVisible(true);
      }
    }
  }, [logs]);

  if (!isVisible) {
    return (
      <TouchableOpacity
        style={styles.floatingToggle}
        onPress={() => setIsVisible(true)}>
        <Text style={styles.toggleText}>🐛</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.debugContainer}>
      {/* Header */}
      <View style={styles.debugHeader}>
        <Text style={styles.debugTitle}>🐛 Address Form Debugger</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, styles.clearButton]}
            onPress={clearLogs}>
            <Text style={styles.headerButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, styles.closeButton]}
            onPress={() => setIsVisible(false)}>
            <Text style={styles.headerButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Button States */}
      <View style={styles.buttonStatesContainer}>
        <Text style={styles.sectionTitle}>Button States:</Text>
        {Object.entries(buttonStates).map(([buttonId, state]) => (
          <Text key={buttonId} style={styles.buttonStateText}>
            {buttonId}: {state.state} ({new Date(state.timestamp).toLocaleTimeString()})
          </Text>
        ))}
      </View>

      {/* Logs */}
      <ScrollView style={styles.logsContainer} showsVerticalScrollIndicator={false}>
        {logs.map((log) => (
          <View key={log.id} style={styles.logItem}>
            <Text style={[styles.logHeader, {color: getLogColor(log.type)}]}>
              {getLogEmoji(log.type)} {log.timestamp} - {log.message}
            </Text>
            {log.data && (
              <Text style={styles.logData}>{log.data}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: '#FF5722',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toggleText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  debugContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 10,
    right: 10,
    height: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    zIndex: 9999,
    elevation: 10,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#333',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  debugTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 4,
  },
  clearButton: {
    backgroundColor: '#FF9800',
  },
  closeButton: {
    backgroundColor: '#F44336',
  },
  headerButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  buttonStatesContainer: {
    padding: 10,
    backgroundColor: '#222',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  sectionTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonStateText: {
    color: '#CCC',
    fontSize: 12,
    marginVertical: 2,
  },
  logsContainer: {
    flex: 1,
    padding: 10,
  },
  logItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logHeader: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  logData: {
    color: '#AAA',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 4,
    paddingLeft: 10,
  },
});

// 🎯 Hook para usar el debugger
export const useAddressFormDebugger = () => {
  const [debuggerInstance] = useState(() => {
    // Crear instancia única del debugger
    let debugInstance = null;

    return {
      log: (message, type = 'info', data = null) => {
        // console.log(`🐛 AddressForm [${type}]:`, message, data);
        
        if (debugInstance && debugInstance.addLog) {
          debugInstance.addLog(message, type, data);
        }
      },
      trackButton: (buttonId, state, additionalData = {}) => {
        // console.log(`🔘 Button [${buttonId}]:`, state, additionalData);
        
        if (debugInstance && debugInstance.trackButton) {
          debugInstance.trackButton(buttonId, state, additionalData);
        }
      },
      trackNavigation: (from, to, params = {}) => {
        // console.log(`🧭 Navigation: ${from} → ${to}`, params);
        
        if (debugInstance && debugInstance.trackNavigation) {
          debugInstance.trackNavigation(from, to, params);
        }
      },
      trackAsync: (functionName, stage, result = null) => {
        // console.log(`⚡ Async [${functionName}]: ${stage}`, result);
        
        if (debugInstance && debugInstance.trackAsync) {
          debugInstance.trackAsync(functionName, stage, result);
        }
      },
      setDebugInstance: (instance) => {
        debugInstance = instance;
      }
    };
  });

  return debuggerInstance;
};

export default AddressFormDebugger;