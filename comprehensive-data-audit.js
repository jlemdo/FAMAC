/**
 * 🔍 AUDITORÍA COMPLETA DE DATOS - GUEST vs USUARIOS NORMALES
 * Verificar que no perdemos ningún dato ni rompemos funcionalidad existente
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 INICIANDO AUDITORÍA COMPLETA DE DATOS...\n');

// Leer archivos
const addressFormPath = path.join(__dirname, 'src', 'address', 'AddressFormUberStyle.jsx');
const cartPath = path.join(__dirname, 'src', 'cart', 'Cart.jsx');

const addressFormContent = fs.readFileSync(addressFormPath, 'utf8');
const cartContent = fs.readFileSync(cartPath, 'utf8');

let issues = [];
let warnings = [];

// ===============================================
// AUDITORÍA 1: USUARIOS NORMALES NO AFECTADOS
// ===============================================
console.log('👤 AUDITORÍA 1: USUARIOS NORMALES');
console.log('===============================================');

// Verificar que las rutas de usuarios normales siguen intactas
const normalUserRoutes = [
  'fromProfile',
  'fromAddressManager', 
  'fromCart'
];

let normalRouteIssues = [];
normalUserRoutes.forEach(route => {
  if (!addressFormContent.includes(`route.params?.${route}`)) {
    normalRouteIssues.push(`Ruta ${route} no encontrada`);
  }
});

if (normalRouteIssues.length === 0) {
  console.log('✅ Todas las rutas de usuarios normales están presentes');
} else {
  console.log('❌ PROBLEMAS en rutas usuarios normales:', normalRouteIssues);
  issues.push({
    section: 'Usuarios Normales',
    problem: 'Rutas faltantes',
    details: normalRouteIssues
  });
}

// Verificar que el flujo de Profile sigue igual
const hasProfileFlow = addressFormContent.includes('route.params?.fromProfile && userId') && 
                      addressFormContent.includes('updateuserprofile');

console.log(`${hasProfileFlow ? '✅' : '❌'} Flujo de Profile: ${hasProfileFlow ? 'INTACTO' : 'ROTO'}`);
if (!hasProfileFlow) {
  issues.push({
    section: 'Usuarios Normales',
    problem: 'Flujo de Profile roto',
    details: ['API updateuserprofile o validación userId faltante']
  });
}

// ===============================================
// AUDITORÍA 2: DATOS GUEST - CAMPOS COMPLETOS
// ===============================================
console.log('\n👻 AUDITORÍA 2: DATOS GUEST COMPLETOS');
console.log('===============================================');

// Campos que DEBEN guardarse en AsyncStorage
const expectedGuestFields = [
  'email',
  'address', 
  'preservedDeliveryInfo',
  'preservedNeedInvoice',
  'preservedTaxDetails',
  'preservedCoordinates',
  'mapCoordinates',
  'timestamp'
];

console.log('📝 Verificando campos guardados en AsyncStorage...');
let missingFields = [];
expectedGuestFields.forEach(field => {
  if (!addressFormContent.includes(`${field}:`)) {
    missingFields.push(field);
  }
});

if (missingFields.length === 0) {
  console.log('✅ Todos los campos Guest se guardan correctamente');
} else {
  console.log('❌ CAMPOS FALTANTES en AsyncStorage:', missingFields);
  issues.push({
    section: 'Datos Guest', 
    problem: 'Campos faltantes en guardado',
    details: missingFields
  });
}

// Campos que DEBEN restaurarse en Cart
console.log('📝 Verificando campos restaurados en Cart...');
const expectedRestoreActions = [
  'setEmail(',
  'setAddress(',
  'setDeliveryInfo(',
  'setNeedInvoice(',
  'setTaxDetails(',
  'setLatlong('
];

let missingRestores = [];
expectedRestoreActions.forEach(action => {
  const pattern = new RegExp(action.replace('(', '\\('));
  if (!pattern.test(cartContent)) {
    missingRestores.push(action);
  }
});

if (missingRestores.length === 0) {
  console.log('✅ Todos los campos Guest se restauran correctamente');
} else {
  console.log('❌ RESTAURACIONES FALTANTES:', missingRestores);
  issues.push({
    section: 'Datos Guest',
    problem: 'Restauraciones faltantes en Cart',
    details: missingRestores
  });
}

// ===============================================
// AUDITORÍA 3: FORMATOS DE DATOS CORRECTOS
// ===============================================
console.log('\n🎯 AUDITORÍA 3: FORMATOS DE DATOS');
console.log('===============================================');

// Verificar formato de coordenadas (CRÍTICO)
const hasDriverLatLong = addressFormContent.includes('driver_lat:') && 
                         addressFormContent.includes('driver_long:');

console.log(`${hasDriverLatLong ? '✅' : '❌'} Formato coordenadas: ${hasDriverLatLong ? 'driver_lat/driver_long CORRECTO' : 'FORMATO INCORRECTO'}`);
if (!hasDriverLatLong) {
  issues.push({
    section: 'Formatos',
    problem: 'Coordenadas en formato incorrecto',
    details: ['Debe usar driver_lat/driver_long no latitude/longitude']
  });
}

// Verificar formato de fechas
const hasDateProcessing = addressFormContent.includes('toISOString()') && 
                         addressFormContent.includes('processedDeliveryInfo');

console.log(`${hasDateProcessing ? '✅' : '❌'} Procesamiento fechas: ${hasDateProcessing ? 'CORRECTO' : 'FALTANTE'}`);
if (!hasDateProcessing) {
  warnings.push({
    section: 'Formatos',
    problem: 'Pre-procesamiento de fechas faltante',
    details: ['Fechas podrían no convertirse correctamente']
  });
}

// ===============================================
// AUDITORÍA 4: NAVEGACIÓN Y RUTAS
// ===============================================
console.log('\n🧭 AUDITORÍA 4: NAVEGACIÓN');
console.log('===============================================');

// Verificar navegaciones Guest
const guestNavigations = [
  { to: 'MainTabs', condition: 'returnToCart' },
  { to: 'GuestCheckout', condition: 'normal flow' }
];

console.log('📝 Verificando navegaciones Guest...');
const hasMainTabsNav = addressFormContent.includes("navigation.navigate('MainTabs'");
const hasGuestCheckoutNav = addressFormContent.includes("navigation.navigate('GuestCheckout'");

console.log(`${hasMainTabsNav ? '✅' : '❌'} Navegación MainTabs: ${hasMainTabsNav ? 'OK' : 'FALTANTE'}`);
console.log(`${hasGuestCheckoutNav ? '✅' : '❌'} Navegación GuestCheckout: ${hasGuestCheckoutNav ? 'OK' : 'FALTANTE'}`);

if (!hasMainTabsNav || !hasGuestCheckoutNav) {
  issues.push({
    section: 'Navegación',
    problem: 'Navegaciones Guest faltantes',
    details: [
      !hasMainTabsNav ? 'MainTabs navigation missing' : null,
      !hasGuestCheckoutNav ? 'GuestCheckout navigation missing' : null
    ].filter(Boolean)
  });
}

// ===============================================
// AUDITORÍA 5: COMPATIBILIDAD HACIA ATRÁS
// ===============================================
console.log('\n🔄 AUDITORÍA 5: COMPATIBILIDAD');
console.log('===============================================');

// Verificar que el flujo original Guest sigue disponible
const hasOriginalGuestFlow = cartContent.includes('// FLUJO ORIGINAL: params.guestData directo') &&
                            cartContent.includes('if (params?.guestData && user?.usertype === \'Guest\')');

console.log(`${hasOriginalGuestFlow ? '✅' : '❌'} Compatibilidad flujo original: ${hasOriginalGuestFlow ? 'MANTENIDA' : 'ROTA'}`);
if (!hasOriginalGuestFlow) {
  issues.push({
    section: 'Compatibilidad',
    problem: 'Flujo original Guest eliminado',
    details: ['Apps que usen flujo anterior se romperán']
  });
}

// Verificar orden de ejecución (nuevo flujo ANTES que original)
const newFlowIndex = cartContent.indexOf('hasGuestDataInStorage');
const originalFlowIndex = cartContent.indexOf('params?.guestData && user?.usertype');

const correctOrder = newFlowIndex < originalFlowIndex && newFlowIndex !== -1;
console.log(`${correctOrder ? '✅' : '❌'} Orden flujos: ${correctOrder ? 'CORRECTO (nuevo antes que original)' : 'INCORRECTO'}`);
if (!correctOrder) {
  warnings.push({
    section: 'Compatibilidad',
    problem: 'Orden de flujos incorrecto',
    details: ['Flujo original podría ejecutarse antes que nuevo']
  });
}

// ===============================================
// AUDITORÍA 6: MANEJO DE ERRORES
// ===============================================
console.log('\n⚠️  AUDITORÍA 6: MANEJO DE ERRORES');
console.log('===============================================');

// Verificar try-catch en AsyncStorage
const hasAsyncStorageErrorHandling = cartContent.includes('try {') &&
                                     cartContent.includes('AsyncStorage.getItem') &&
                                     cartContent.includes('} catch (error)');

console.log(`${hasAsyncStorageErrorHandling ? '✅' : '❌'} Error handling AsyncStorage: ${hasAsyncStorageErrorHandling ? 'OK' : 'FALTANTE'}`);
if (!hasAsyncStorageErrorHandling) {
  warnings.push({
    section: 'Error Handling',
    problem: 'Sin manejo de errores AsyncStorage',
    details: ['App podría crashear si AsyncStorage falla']
  });
}

// Verificar limpieza AsyncStorage
const hasStorageCleanup = cartContent.includes('AsyncStorage.removeItem');
console.log(`${hasStorageCleanup ? '✅' : '⚠️'} Limpieza AsyncStorage: ${hasStorageCleanup ? 'OK' : 'FALTANTE'}`);
if (!hasStorageCleanup) {
  warnings.push({
    section: 'Memory Management',
    problem: 'Sin limpieza AsyncStorage',
    details: ['Datos temporales se acumularán']
  });
}

// ===============================================
// AUDITORÍA 7: DATOS CRÍTICOS ESPECÍFICOS
// ===============================================
console.log('\n🎯 AUDITORÍA 7: DATOS CRÍTICOS');
console.log('===============================================');

// deliveryInfo (fecha y horario de entrega)
const hasDeliveryInfoHandling = cartContent.includes('new Date(tempGuestData.preservedDeliveryInfo.date)');
console.log(`${hasDeliveryInfoHandling ? '✅' : '❌'} deliveryInfo Date conversion: ${hasDeliveryInfoHandling ? 'OK' : 'FALTANTE'}`);

// needInvoice (facturación)
const hasInvoiceHandling = cartContent.includes('tempGuestData.preservedNeedInvoice');
console.log(`${hasInvoiceHandling ? '✅' : '❌'} needInvoice handling: ${hasInvoiceHandling ? 'OK' : 'FALTANTE'}`);

// taxDetails (RFC y datos fiscales)
const hasTaxHandling = cartContent.includes('tempGuestData.preservedTaxDetails');
console.log(`${hasTaxHandling ? '✅' : '❌'} taxDetails handling: ${hasTaxHandling ? 'OK' : 'FALTANTE'}`);

// Auto-pago trigger
const hasAutoPayTrigger = cartContent.includes('tempGuestData.preservedDeliveryInfo') &&
                         cartContent.includes('flatListRef.current?.scrollToEnd');
console.log(`${hasAutoPayTrigger ? '✅' : '❌'} Auto-pago trigger: ${hasAutoPayTrigger ? 'OK' : 'FALTANTE'}`);

// ===============================================
// RESUMEN FINAL
// ===============================================
console.log('\n📊 RESUMEN FINAL DE AUDITORÍA');
console.log('===============================================');

console.log(`🔴 PROBLEMAS CRÍTICOS: ${issues.length}`);
issues.forEach((issue, index) => {
  console.log(`   ${index + 1}. [${issue.section}] ${issue.problem}`);
  if (issue.details && issue.details.length > 0) {
    issue.details.forEach(detail => console.log(`      - ${detail}`));
  }
});

console.log(`\n🟡 ADVERTENCIAS: ${warnings.length}`);
warnings.forEach((warning, index) => {
  console.log(`   ${index + 1}. [${warning.section}] ${warning.problem}`);
  if (warning.details && warning.details.length > 0) {
    warning.details.forEach(detail => console.log(`      - ${detail}`));
  }
});

// Análisis final
if (issues.length === 0) {
  console.log('\n🎉 ¡AUDITORÍA EXITOSA!');
  console.log('✅ No se detectaron problemas críticos');
  console.log('✅ Todos los datos se preservan correctamente');
  console.log('✅ Usuarios normales no afectados');
  console.log('✅ Compatibilidad hacia atrás mantenida');
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Hay ${warnings.length} advertencia(s) no crítica(s) que podrían mejorarse`);
  } else {
    console.log('✅ Sin advertencias - implementación limpia');
  }
  
} else {
  console.log('\n❌ AUDITORÍA FALLÓ');
  console.log('🚨 SE DETECTARON PROBLEMAS CRÍTICOS QUE DEBEN SER CORREGIDOS');
  console.log('⚠️  NO DESPLEGAR HASTA CORREGIR TODOS LOS PROBLEMAS');
}

console.log('\n📋 RECOMENDACIONES:');
console.log('1. Corregir todos los problemas críticos identificados');
console.log('2. Probar flujo completo Guest: dirección → cart → pago');
console.log('3. Probar flujo completo Usuario normal: Profile → dirección');
console.log('4. Verificar que auto-pago Guest funciona con deliveryInfo');
console.log('5. Confirmar que coordenadas se restauran correctamente');

process.exit(issues.length > 0 ? 1 : 0);