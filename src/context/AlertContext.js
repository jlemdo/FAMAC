import React, { createContext, useContext, useState } from 'react';
import CustomAlert from '../components/CustomAlert';

const AlertContext = createContext();
export const useAlert = () => useContext(AlertContext);

export function AlertProvider({ children }) {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'info',
    title: '',
    message: '',
    cancelText: null,
    confirmText: 'OK',
    onConfirm: () => {},
    onCancel: null,
  });

  const showAlert = ({
    type = 'info',
    title = '',
    message = '',
    cancelText = null,
    confirmText = 'OK',
    onConfirm = () => {},
    onCancel = null,
  }) => {
    console.log('🚨 AlertContext: showAlert called with onCancel:', !!onCancel);
    setAlertConfig({ type, title, message, cancelText, confirmText, onConfirm, onCancel });
    setAlertVisible(true);
  };

  const hideAlert = () => setAlertVisible(false);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        cancelText={alertConfig.cancelText}
        confirmText={alertConfig.confirmText}
        onCancel={alertConfig.onCancel ? () => {
          console.log('🚨 AlertContext: ejecutando onCancel personalizado');
          hideAlert();
          alertConfig.onCancel();
        } : () => {
          console.log('🚨 AlertContext: ejecutando hideAlert por defecto');
          hideAlert();
        }}
        onConfirm={() => {
          hideAlert();
          alertConfig.onConfirm();
        }}
      />
    </AlertContext.Provider>
  );
}
