/**
 * COMPONENTE DE EJEMPLO - SISTEMA RESPONSIVE FAMAC
 * Demuestra cómo usar el nuevo sistema de auto-scaling
 * NOTA: Este archivo es solo para demostración - puede eliminarse
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import fonts from '../theme/fonts';
import spacing from '../theme/spacing';
import { colors } from '../theme/theme';

const ResponsiveExample = () => {
  const { 
    screenSize, 
    isSmallScreen, 
    isLargeScreen, 
    scale, 
    dimensions,
    deviceInfo 
  } = useResponsive();

  return (
    <ScrollView style={styles.container}>
      {/* Header con información del dispositivo */}
      <View style={styles.infoCard}>
        <Text style={styles.title}>📱 Info del Dispositivo</Text>
        <Text style={styles.infoText}>Tamaño: {screenSize.toUpperCase()}</Text>
        <Text style={styles.infoText}>Dimensiones: {deviceInfo.screenWidth}x{deviceInfo.screenHeight}</Text>
        <Text style={styles.infoText}>Pantalla pequeña: {isSmallScreen ? 'Sí' : 'No'}</Text>
        <Text style={styles.infoText}>Pantalla grande: {isLargeScreen ? 'Sí' : 'No'}</Text>
      </View>

      {/* Ejemplos de fuentes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔤 Fuentes Responsivas</Text>
        <Text style={styles.tinyText}>Texto muy pequeño (tiny)</Text>
        <Text style={styles.smallText}>Texto pequeño (small)</Text>
        <Text style={styles.mediumText}>Texto mediano (medium)</Text>
        <Text style={styles.largeText}>Texto grande (large)</Text>
        <Text style={styles.xlText}>Texto extra grande (XL)</Text>
      </View>

      {/* Botones adaptativos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔘 Botones Adaptativos</Text>
        <TouchableOpacity style={[styles.button, dimensions.button('small')]}>
          <Text style={[styles.buttonText, { fontSize: scale.font(14) }]}>
            Botón Pequeño
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, dimensions.button('medium')]}>
          <Text style={[styles.buttonText, { fontSize: scale.font(16) }]}>
            Botón Mediano
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, dimensions.button('large')]}>
          <Text style={[styles.buttonText, { fontSize: scale.font(18) }]}>
            Botón Grande
          </Text>
        </TouchableOpacity>
      </View>

      {/* Espaciados */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📏 Espaciados</Text>
        <View style={[styles.spacingExample, { padding: spacing.sm }]}>
          <Text style={styles.spacingText}>Padding pequeño</Text>
        </View>
        <View style={[styles.spacingExample, { padding: spacing.md }]}>
          <Text style={styles.spacingText}>Padding mediano</Text>
        </View>
        <View style={[styles.spacingExample, { padding: spacing.lg }]}>
          <Text style={styles.spacingText}>Padding grande</Text>
        </View>
      </View>

      {/* Estilos condicionales */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Estilos Condicionales</Text>
        <View style={[
          styles.conditionalBox,
          isSmallScreen && styles.conditionalBoxSmall,
          isLargeScreen && styles.conditionalBoxLarge
        ]}>
          <Text style={styles.conditionalText}>
            {isSmallScreen && "📱 Estilo para pantalla pequeña"}
            {!isSmallScreen && !isLargeScreen && "📱 Estilo para pantalla mediana"}
            {isLargeScreen && "📺 Estilo para pantalla grande"}
          </Text>
        </View>
      </View>

      {/* Modal dimensions preview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🪟 Dimensiones de Modal</Text>
        <Text style={styles.infoText}>
          Ancho: {Math.round(dimensions.modal.width)}px
        </Text>
        <Text style={styles.infoText}>
          Altura máxima: {Math.round(dimensions.modal.maxHeight)}px
        </Text>
        <Text style={styles.infoText}>
          Padding: {dimensions.modal.padding}px
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  
  infoCard: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    marginBottom: spacing.md,
  },
  
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  title: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: colors.surface,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  
  cardTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  
  infoText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: colors.surface,
    marginBottom: spacing.xs,
  },
  
  // Ejemplos de fuentes
  tinyText: {
    fontSize: fonts.size.tiny,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  smallText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  mediumText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  largeText: {
    fontSize: fonts.size.large,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  
  xlText: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  // Botones
  button: {
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  
  buttonText: {
    color: colors.surface,
    fontFamily: fonts.bold,
  },
  
  // Espaciados
  spacingExample: {
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
    borderRadius: spacing.borderRadius.small,
  },
  
  spacingText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: 'center',
  },
  
  // Estilos condicionales
  conditionalBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.medium,
    alignItems: 'center',
  },
  
  conditionalBoxSmall: {
    backgroundColor: '#FFE5E5', // Rosa claro para pantallas pequeñas
  },
  
  conditionalBoxLarge: {
    backgroundColor: '#E5F5FF', // Azul claro para pantallas grandes
  },
  
  conditionalText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
});

export default ResponsiveExample;