/**
 * Componente botón para verificar actualizaciones manualmente
 * Se puede agregar en la pantalla de Configuración/Perfil
 */

import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { useAutoUpdate } from '../hooks/useAutoUpdate';
import colors from '../theme/colors';
import fonts from '../theme/fonts';

const UpdateButton = ({ style, textStyle, showBadge = true }) => {
  const {
    isChecking,
    hasUpdate,
    isCriticalUpdate,
    manualCheck,
    latestVersion,
    currentVersion,
  } = useAutoUpdate({
    checkOnMount: false,
    showModalAutomatically: false, // No mostrar modal automático desde este botón
  });

  const handlePress = () => {
    manualCheck();
  };

  const getButtonText = () => {
    if (isChecking) return 'Verificando...';
    if (hasUpdate) return `Actualizar a v${latestVersion}`;
    return 'Buscar actualizaciones';
  };

  const getButtonColor = () => {
    if (isCriticalUpdate) return colors.error;
    if (hasUpdate) return colors.success;
    return colors.primary;
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: getButtonColor() },
          isChecking && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={isChecking}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          {isChecking && (
            <ActivityIndicator
              size="small"
              color={colors.white}
              style={styles.loader}
            />
          )}

          <Text style={[styles.buttonText, textStyle]}>
            {getButtonText()}
          </Text>

          {showBadge && hasUpdate && !isChecking && (
            <View style={[
              styles.badge,
              { backgroundColor: isCriticalUpdate ? colors.error : colors.warning }
            ]}>
              <Text style={styles.badgeText}>
                {isCriticalUpdate ? '⚠️' : '🆕'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Información adicional de versión */}
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>
          Versión actual: {currentVersion || '1.0.0'}
        </Text>
        {hasUpdate && (
          <Text style={styles.updateText}>
            Nueva versión disponible: {latestVersion}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = {
  container: {
    marginVertical: 10,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  loader: {
    marginRight: 8,
  },

  buttonText: {
    color: colors.white,
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },

  badge: {
    position: 'absolute',
    right: -12,
    top: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: fonts.bold,
  },

  versionInfo: {
    marginTop: 8,
    alignItems: 'center',
  },

  versionText: {
    fontSize: fonts.size.small,
    color: colors.placeholder,
    fontFamily: fonts.regular,
  },

  updateText: {
    fontSize: fonts.size.small,
    color: colors.success,
    fontFamily: fonts.bold,
    marginTop: 2,
  },
};

export default UpdateButton;