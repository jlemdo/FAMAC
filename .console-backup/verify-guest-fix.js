/**
 * 🔍 SCRIPT DE VERIFICACIÓN DEL FIX GUEST AsyncStorage
 * Verifica que la implementación sea correcta y funcional
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO FIX DE AsyncStorage PARA GUEST...\n');

// Leer archivos modificados
const addressFormPath = path.join(__dirname, 'src', 'address', 'AddressFormUberStyle.jsx');
const cartPath = path.join(__dirname, 'src', 'cart', 'Cart.jsx');

const addressFormContent = fs.readFileSync(addressFormPath, 'utf8');
const cartContent = fs.readFileSync(cartPath, 'utf8');

let allChecks = [];

// ===============================================
// VERIFICACIONES ADDRESSFORM
// ===============================================
console.log('📋 VERIFICANDO AddressFormUberStyle.jsx:');
console.log('===============================================');

// 1. Import AsyncStorage
const hasAsyncStorageImport = addressFormContent.includes("import AsyncStorage from '@react-native-async-storage/async-storage'");
allChecks.push({
  check: 'AsyncStorage import en AddressForm',
  passed: hasAsyncStorageImport,
  critical: true
});
console.log(`${hasAsyncStorageImport ? '✅' : '❌'} Import AsyncStorage: ${hasAsyncStorageImport ? 'OK' : 'FALTA'}`);

// 2. AsyncStorage.setItem usage
const hasSetItem = addressFormContent.includes('AsyncStorage.setItem(\'tempGuestData\'');
allChecks.push({
  check: 'AsyncStorage.setItem para tempGuestData',
  passed: hasSetItem,
  critical: true
});
console.log(`${hasSetItem ? '✅' : '❌'} AsyncStorage.setItem: ${hasSetItem ? 'OK' : 'FALTA'}`);

// 3. Navegación simplificada
const hasSimpleNavigation = addressFormContent.includes('hasGuestDataInStorage: true');
allChecks.push({
  check: 'Navegación simplificada con flag',
  passed: hasSimpleNavigation,
  critical: true
});
console.log(`${hasSimpleNavigation ? '✅' : '❌'} Navegación simple: ${hasSimpleNavigation ? 'OK' : 'FALTA'}`);

// 4. Pre-procesamiento de fechas
const hasDatePreprocessing = addressFormContent.includes('toISOString()') && addressFormContent.includes('processedDeliveryInfo');
allChecks.push({
  check: 'Pre-procesamiento de fechas',
  passed: hasDatePreprocessing,
  critical: true
});
console.log(`${hasDatePreprocessing ? '✅' : '❌'} Pre-procesamiento fechas: ${hasDatePreprocessing ? 'OK' : 'FALTA'}`);

// 5. Estructura tempGuestData completa
const requiredFields = [
  'email:',
  'address:',
  'preservedDeliveryInfo:',
  'preservedNeedInvoice:',
  'preservedTaxDetails:',
  'preservedCoordinates:',
  'mapCoordinates:',
  'timestamp:'
];

let missingFields = [];
requiredFields.forEach(field => {
  if (!addressFormContent.includes(field)) {
    missingFields.push(field);
  }
});

const hasCompleteStructure = missingFields.length === 0;
allChecks.push({
  check: 'Estructura tempGuestData completa',
  passed: hasCompleteStructure,
  critical: true
});
console.log(`${hasCompleteStructure ? '✅' : '❌'} Estructura completa: ${hasCompleteStructure ? 'OK' : `FALTAN: ${missingFields.join(', ')}`}`);

// ===============================================
// VERIFICACIONES CART.JSX
// ===============================================
console.log('\n📋 VERIFICANDO Cart.jsx:');
console.log('===============================================');

// 6. Import AsyncStorage en Cart
const cartHasAsyncStorageImport = cartContent.includes("import AsyncStorage from '@react-native-async-storage/async-storage'");
allChecks.push({
  check: 'AsyncStorage import en Cart',
  passed: cartHasAsyncStorageImport,
  critical: true
});
console.log(`${cartHasAsyncStorageImport ? '✅' : '❌'} Import AsyncStorage: ${cartHasAsyncStorageImport ? 'OK' : 'FALTA'}`);

// 7. Detector del nuevo flujo
const hasNewFlowDetector = cartContent.includes('hasGuestDataInStorage') && cartContent.includes('AsyncStorage.getItem(\'tempGuestData\')');
allChecks.push({
  check: 'Detector de flujo AsyncStorage',
  passed: hasNewFlowDetector,
  critical: true
});
console.log(`${hasNewFlowDetector ? '✅' : '❌'} Detector nuevo flujo: ${hasNewFlowDetector ? 'OK' : 'FALTA'}`);

// 8. Lectura y parsing de datos
const hasDataParsing = cartContent.includes('JSON.parse(tempGuestDataStr)');
allChecks.push({
  check: 'Parsing de datos AsyncStorage',
  passed: hasDataParsing,
  critical: true
});
console.log(`${hasDataParsing ? '✅' : '❌'} JSON.parse datos: ${hasDataParsing ? 'OK' : 'FALTA'}`);

// 9. Limpieza AsyncStorage
const hasCleanup = cartContent.includes('AsyncStorage.removeItem(\'tempGuestData\')');
allChecks.push({
  check: 'Limpieza AsyncStorage',
  passed: hasCleanup,
  critical: true
});
console.log(`${hasCleanup ? '✅' : '❌'} Limpieza storage: ${hasCleanup ? 'OK' : 'FALTA'}`);

// 10. Compatibilidad con flujo original
const hasBackwardsCompatibility = cartContent.includes('// FLUJO ORIGINAL: params.guestData directo');
allChecks.push({
  check: 'Compatibilidad con flujo original',
  passed: hasBackwardsCompatibility,
  critical: false
});
console.log(`${hasBackwardsCompatibility ? '✅' : '⚠️'} Compatibilidad original: ${hasBackwardsCompatibility ? 'OK' : 'ADVERTENCIA'}`);

// 11. Restauración de todos los campos
const cartRestoreFields = [
  'setEmail(',
  'setAddress(',
  'setDeliveryInfo(',
  'setNeedInvoice(',
  'setTaxDetails(',
  'setLatlong('
];

let missingRestoreFields = [];
cartRestoreFields.forEach(field => {
  const pattern = new RegExp(field.replace('(', '\\('));
  if (!pattern.test(cartContent)) {
    missingRestoreFields.push(field);
  }
});

const hasAllRestores = missingRestoreFields.length === 0;
allChecks.push({
  check: 'Restauración completa de campos',
  passed: hasAllRestores,
  critical: true
});
console.log(`${hasAllRestores ? '✅' : '❌'} Restauración campos: ${hasAllRestores ? 'OK' : `FALTAN: ${missingRestoreFields.join(', ')}`}`);

// ===============================================
// ANÁLISIS DE FLUJO
// ===============================================
console.log('\n🔄 ANÁLISIS DE FLUJO:');
console.log('===============================================');

// Extraer el flujo AsyncStorage de AddressForm
const asyncFlowMatch = addressFormContent.match(/await AsyncStorage\.setItem\('tempGuestData'[\s\S]*?navigation\.navigate\('MainTabs'/);
if (asyncFlowMatch) {
  console.log('✅ Flujo AsyncStorage identificado');
  const flowText = asyncFlowMatch[0];
  
  // Verificar orden correcto
  const hasCorrectOrder = flowText.indexOf('AsyncStorage.setItem') < flowText.indexOf('navigation.navigate');
  console.log(`${hasCorrectOrder ? '✅' : '❌'} Orden correcto: ${hasCorrectOrder ? 'Storage ANTES de Navigation' : 'ORDEN INCORRECTO'}`);
  
  allChecks.push({
    check: 'Orden correcto AsyncStorage -> Navigation',
    passed: hasCorrectOrder,
    critical: true
  });
} else {
  console.log('❌ No se pudo identificar el flujo AsyncStorage');
  allChecks.push({
    check: 'Flujo AsyncStorage identificable',
    passed: false,
    critical: true
  });
}

// ===============================================
// VERIFICACIÓN DE SINTAXIS
// ===============================================
console.log('\n🔍 VERIFICACIÓN DE SINTAXIS:');
console.log('===============================================');

// Verificar balanceado de llaves en el bloque setTimeout
const setTimeoutMatches = addressFormContent.match(/setTimeout\(async \(\) => \{[\s\S]*?}, 0\);/g);
if (setTimeoutMatches && setTimeoutMatches.length > 0) {
  console.log(`✅ setTimeout encontrado: ${setTimeoutMatches.length} instancia(s)`);
  
  // Verificar que el setTimeout de Guest esté cerrado correctamente
  const guestTimeoutMatch = addressFormContent.match(/\/\/ Si viene de GuestCheckout[\s\S]*?}, 0\); \/\/ Cierre del setTimeout de iOS fix/);
  const hasCorrectClosure = !!guestTimeoutMatch;
  
  allChecks.push({
    check: 'setTimeout Guest cerrado correctamente',
    passed: hasCorrectClosure,
    critical: true
  });
  console.log(`${hasCorrectClosure ? '✅' : '❌'} setTimeout cerrado: ${hasCorrectClosure ? 'OK' : 'SINTAXIS INCORRECTA'}`);
} else {
  console.log('❌ No se encontró setTimeout en Guest');
  allChecks.push({
    check: 'setTimeout presente en Guest',
    passed: false,
    critical: true
  });
}

// ===============================================
// RESUMEN FINAL
// ===============================================
console.log('\n📊 RESUMEN FINAL:');
console.log('===============================================');

const criticalChecks = allChecks.filter(check => check.critical);
const passedCritical = criticalChecks.filter(check => check.passed).length;
const totalCritical = criticalChecks.length;

const nonCriticalChecks = allChecks.filter(check => !check.critical);
const passedNonCritical = nonCriticalChecks.filter(check => check.passed).length;
const totalNonCritical = nonCriticalChecks.length;

console.log(`✅ Verificaciones críticas: ${passedCritical}/${totalCritical}`);
console.log(`⚠️  Verificaciones no críticas: ${passedNonCritical}/${totalNonCritical}`);

const allCriticalPassed = passedCritical === totalCritical;

if (allCriticalPassed) {
  console.log('\n🎯 ¡TODAS LAS VERIFICACIONES CRÍTICAS PASARON!');
  console.log('✅ El fix está implementado correctamente');
  console.log('🚀 Listo para probar en iPhone');
  
  console.log('\n📱 FLUJO ESPERADO:');
  console.log('1. Guest completa dirección → presiona "Completar dirección"');
  console.log('2. AddressForm → guarda datos en AsyncStorage');
  console.log('3. AddressForm → navega simple a Cart');
  console.log('4. Cart → lee AsyncStorage → restaura datos → limpia storage');
  console.log('5. Cart → auto-pago si tiene deliveryInfo + coordenadas');
  
} else {
  console.log('\n❌ FALTAN VERIFICACIONES CRÍTICAS:');
  criticalChecks.filter(check => !check.passed).forEach(check => {
    console.log(`   - ${check.check}`);
  });
  console.log('\n⚠️  CORREGIR ANTES DE PROBAR');
}

// Mostrar advertencias no críticas
if (totalNonCritical > 0 && passedNonCritical < totalNonCritical) {
  console.log('\n⚠️  ADVERTENCIAS (no críticas):');
  nonCriticalChecks.filter(check => !check.passed).forEach(check => {
    console.log(`   - ${check.check}`);
  });
}

// Exit code
process.exit(allCriticalPassed ? 0 : 1);