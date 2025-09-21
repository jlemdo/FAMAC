/**
 * Componente temporal para probar todos los estados del driver
 * Solo para desarrollo - eliminar en producción
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import fonts from '../../theme/fonts';

const DriverTestStates = ({ onStateChange, currentStatus }) => {
  const testStates = [
    // Estados que deben mostrar "Aceptar Pedido"
    { status: 'Open', description: 'Pedido abierto (inglés)' },
    { status: 'Abierto', description: 'Pedido abierto (español)' },
    { status: 'open', description: 'Pedido abierto (minúscula)' },
    { status: 'abierto', description: 'Pedido abierto (minúscula español)' },
    { status: 'Pending', description: 'Pedido pendiente (inglés)' },
    { status: 'pending', description: 'Pedido pendiente (minúscula)' },
    { status: 'Pendiente', description: 'Pedido pendiente (español)' },
    { status: 'pendiente', description: 'Pedido pendiente (minúscula español)' },
    { status: 'Confirmed', description: 'Pedido confirmado (inglés)' },
    { status: 'confirmed', description: 'Pedido confirmado (minúscula)' },
    { status: 'Confirmado', description: 'Pedido confirmado (español)' },
    { status: 'confirmado', description: 'Pedido confirmado (minúscula español)' },

    // Estados que deben mostrar "Marcar como Entregado"
    { status: 'On the Way', description: 'En camino (inglés)' },
    { status: 'on the way', description: 'En camino (minúscula)' },
    { status: 'En camino', description: 'En camino (español)' },
    { status: 'en camino', description: 'En camino (minúscula español)' },
    { status: 'In Progress', description: 'En progreso (inglés)' },
    { status: 'in progress', description: 'En progreso (minúscula)' },
    { status: 'En progreso', description: 'En progreso (español)' },
    { status: 'en progreso', description: 'En progreso (minúscula español)' },

    // Estados completados (sin botones)
    { status: 'Delivered', description: 'Entregado (inglés)' },
    { status: 'delivered', description: 'Entregado (minúscula)' },
    { status: 'Entregado', description: 'Entregado (español)' },
    { status: 'entregado', description: 'Entregado (minúscula español)' },
    { status: 'Completed', description: 'Completado (inglés)' },
    { status: 'completed', description: 'Completado (minúscula)' },
    { status: 'Completado', description: 'Completado (español)' },
    { status: 'completado', description: 'Completado (minúscula español)' },

    // Estados de prueba adicionales
    { status: 'Unknown State', description: 'Estado desconocido para prueba' },
    { status: '', description: 'Estado vacío' },
    { status: null, description: 'Estado nulo' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Probador de Estados del Driver</Text>
      <Text style={styles.currentStatus}>Estado actual: "{currentStatus}"</Text>

      <ScrollView style={styles.statesContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Estados para "Aceptar Pedido":</Text>
        {testStates.slice(0, 12).map((state, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.stateButton,
              state.status === currentStatus && styles.activeState
            ]}
            onPress={() => onStateChange(state.status)}>
            <Text style={styles.stateButtonText}>
              {state.status || 'null'} - {state.description}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Estados para "Marcar como Entregado":</Text>
        {testStates.slice(12, 20).map((state, index) => (
          <TouchableOpacity
            key={index + 12}
            style={[
              styles.stateButton,
              styles.progressState,
              state.status === currentStatus && styles.activeState
            ]}
            onPress={() => onStateChange(state.status)}>
            <Text style={styles.stateButtonText}>
              {state.status || 'null'} - {state.description}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Estados completados:</Text>
        {testStates.slice(20, 28).map((state, index) => (
          <TouchableOpacity
            key={index + 20}
            style={[
              styles.stateButton,
              styles.completedState,
              state.status === currentStatus && styles.activeState
            ]}
            onPress={() => onStateChange(state.status)}>
            <Text style={styles.stateButtonText}>
              {state.status || 'null'} - {state.description}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Estados de prueba:</Text>
        {testStates.slice(28).map((state, index) => (
          <TouchableOpacity
            key={index + 28}
            style={[
              styles.stateButton,
              styles.testState,
              state.status === currentStatus && styles.activeState
            ]}
            onPress={() => onStateChange(state.status)}>
            <Text style={styles.stateButtonText}>
              {state.status || 'null'} - {state.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    maxHeight: 400,
  },
  title: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#E65100',
    textAlign: 'center',
    marginBottom: 8,
  },
  currentStatus: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#F57C00',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  statesContainer: {
    maxHeight: 280,
  },
  sectionTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#BF360C',
    marginTop: 12,
    marginBottom: 8,
  },
  stateButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  progressState: {
    borderColor: '#2196F3',
  },
  completedState: {
    borderColor: '#4CAF50',
  },
  testState: {
    borderColor: '#9C27B0',
  },
  activeState: {
    backgroundColor: '#FFE0B2',
    borderWidth: 2,
  },
  stateButtonText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#333',
  },
});

export default DriverTestStates;