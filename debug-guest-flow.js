/**
 * 🔍 SCRIPT DE ANÁLISIS DEL FLUJO GUEST
 * Analiza el código Guest para identificar posibles puntos de congelamiento
 */

const fs = require('fs');
const path = require('path');

// Leer el archivo AddressFormUberStyle.jsx
const filePath = path.join(__dirname, 'src', 'address', 'AddressFormUberStyle.jsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

console.log('🔍 ANALIZANDO FLUJO GUEST EN AddressFormUberStyle.jsx...\n');

// Extraer la sección de Guest
const guestSectionMatch = fileContent.match(/\/\/ Si viene de GuestCheckout[\s\S]*?}, 0\); \/\/ Cierre del setTimeout de iOS fix/);

if (!guestSectionMatch) {
  console.log('❌ ERROR: No se encontró la sección de Guest');
  process.exit(1);
}

const guestSection = guestSectionMatch[0];
const lines = guestSection.split('\n');

console.log('📊 ANÁLISIS DEL FLUJO GUEST:');
console.log('===============================================\n');

// Analizar línea por línea
let currentStep = 1;
let inNavigationBlock = false;
let operationCount = 0;
let potentialProblems = [];

lines.forEach((line, index) => {
  const trimmedLine = line.trim();
  
  // Detectar operaciones complejas
  if (trimmedLine.includes('navigation.navigate')) {
    console.log(`🚨 PUNTO CRÍTICO ${currentStep}: NAVIGATION.NAVIGATE (línea ${index + 1})`);
    console.log(`   Código: ${trimmedLine}`);
    inNavigationBlock = true;
    potentialProblems.push({
      step: currentStep,
      type: 'NAVIGATION',
      line: index + 1,
      code: trimmedLine,
      risk: 'ALTO'
    });
    currentStep++;
  }
  
  // Detectar construcción de objetos complejos
  if (trimmedLine.includes('guestData:') || trimmedLine.includes('params:')) {
    console.log(`⚠️  OPERACIÓN COMPLEJA ${currentStep}: CONSTRUCCIÓN DE OBJETO (línea ${index + 1})`);
    console.log(`   Código: ${trimmedLine}`);
    operationCount++;
    if (operationCount > 5) {
      potentialProblems.push({
        step: currentStep,
        type: 'OBJECT_CONSTRUCTION',
        line: index + 1,
        code: trimmedLine,
        risk: 'MEDIO'
      });
    }
    currentStep++;
  }
  
  // Detectar validaciones síncronas
  if (trimmedLine.includes('if (') && !trimmedLine.includes('console.log')) {
    console.log(`🔍 VALIDACIÓN ${currentStep}: ${trimmedLine} (línea ${index + 1})`);
    currentStep++;
  }
  
  // Detectar transformaciones de datos
  if (trimmedLine.includes('toISOString()') || trimmedLine.includes('preservedDeliveryInfo =')) {
    console.log(`🔄 TRANSFORMACIÓN ${currentStep}: ${trimmedLine} (línea ${index + 1})`);
    potentialProblems.push({
      step: currentStep,
      type: 'DATA_TRANSFORMATION',
      line: index + 1,
      code: trimmedLine,
      risk: 'BAJO'
    });
    currentStep++;
  }
});

console.log('\n📋 RESUMEN DEL ANÁLISIS:');
console.log('===============================================');
console.log(`Total de operaciones detectadas: ${currentStep - 1}`);
console.log(`Operaciones complejas de objeto: ${operationCount}`);
console.log(`Puntos críticos identificados: ${potentialProblems.length}`);

console.log('\n🚨 PUNTOS DE RIESGO ALTO/MEDIO:');
potentialProblems.forEach(problem => {
  if (problem.risk === 'ALTO' || problem.risk === 'MEDIO') {
    console.log(`${problem.risk === 'ALTO' ? '🔴' : '🟡'} ${problem.type} (línea ${problem.line})`);
    console.log(`   Código: ${problem.code.substring(0, 80)}...`);
  }
});

console.log('\n💡 HIPÓTESIS DEL PROBLEMA:');
console.log('===============================================');

// Buscar patrón específico que podría causar el problema
if (fileContent.includes('navigation.navigate(\'MainTabs\'')) {
  console.log('🎯 PROBABLE CAUSA: navigation.navigate con parámetros complejos');
  console.log('   - Guest construye objetos MUCHO más complejos que usuarios normales');
  console.log('   - React Navigation podría estar serializando/deserializando objetos grandes');
  console.log('   - iOS es más sensible a parámetros de navegación complejos');
}

if (guestSection.includes('preservedDeliveryInfo') && guestSection.includes('toISOString()')) {
  console.log('🎯 POSIBLE CAUSA: Transformación de fechas Date -> String');
  console.log('   - iOS podría estar bloqueando durante Date.toISOString()');
  console.log('   - Especialmente si hay múltiples objetos Date');
}

console.log('\n🔧 PRÓXIMOS PASOS SUGERIDOS:');
console.log('1. Simplificar parámetros de navegación Guest');
console.log('2. Pre-procesar todas las fechas ANTES del setTimeout');
console.log('3. Dividir navigation.navigate en pasos más pequeños');
console.log('4. Usar AsyncStorage temporal en lugar de parámetros complejos');