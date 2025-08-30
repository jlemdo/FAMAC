#!/usr/bin/env node
/**
 * 🚀 EJECUTOR RÁPIDO DE TESTS - AddressForm
 * Ejecuta los tests del flujo de direcciones y muestra resultados
 */

const path = require('path');

// Mock simple de jest
global.jest = {
  fn: (impl) => {
    const mockFn = impl || (() => {});
    mockFn.mock = { calls: [] };
    const originalFn = mockFn;
    const wrappedFn = (...args) => {
      wrappedFn.mock.calls.push(args);
      return originalFn(...args);
    };
    wrappedFn.mock = mockFn.mock;
    return wrappedFn;
  }
};

// Importar el sistema de testing
const { runTests } = require('./test-address-form.js');

console.log('🧪 EJECUTANDO TESTS DE AddressFormUberStyle');
console.log('=' .repeat(50));
console.log('📱 Simulando flujo completo de usuario en iOS');
console.log('🎯 Objetivo: Detectar por qué se "congelan" los botones');
console.log('=' .repeat(50));

runTests()
  .then(() => {
    console.log('\n✅ TESTS COMPLETADOS');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Revisar los errores encontrados arriba');
    console.log('2. Si no hay errores críticos, el problema puede ser:');
    console.log('   - Problemas de UI/Thread en iOS');
    console.log('   - Interferencia con KeyboardAvoidingView');
    console.log('   - Estados asincrónicos que no se resuelven');
    console.log('3. Usar el debugger visual en el dispositivo iOS real');
  })
  .catch((error) => {
    console.error('\n❌ ERROR EJECUTANDO TESTS:', error.message);
    console.error(error.stack);
  });