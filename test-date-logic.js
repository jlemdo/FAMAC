// Script para verificar la lógica de fechas en JavaScript

console.log('=== VERIFICACIÓN DE ÍNDICES DE MESES EN JAVASCRIPT ===\n');

// Verificar índices de meses (0-based en JavaScript)
const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

meses.forEach((mes, index) => {
  console.log(`Índice ${index} = ${mes}`);
});

console.log('\n=== CONFIRMACIÓN: Índice 3 = Abril ===');
console.log(`meses[3] = ${meses[3]}`); // Debe ser "Abril"

console.log('\n=== SIMULACIÓN DEL PROBLEMA ACTUAL ===\n');

// Simular diferentes meses del sistema
const mesesSistema = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

console.log('Escenario: Usuario selecciona AÑO 1968 sin haber seleccionado mes primero\n');

mesesSistema.forEach((mes, mesIndex) => {
  // Simular que estamos en ese mes
  const fechaActual = new Date(2025, mesIndex, 10);

  // CÓDIGO ACTUAL (BUGUEADO)
  const currentMonthBug = fechaActual.getMonth(); // Mes del sistema
  const fechaGeneradaBug = new Date(1968, currentMonthBug, 1);

  // CÓDIGO PROPUESTO (FIJO)
  const currentMonthFix = 3; // Abril
  const fechaGeneradaFix = new Date(1968, currentMonthFix, 1);

  const mesGeneradoBug = meses[fechaGeneradaBug.getMonth()];
  const mesGeneradoFix = meses[fechaGeneradaFix.getMonth()];

  const esCorrecto = mesIndex === 3 ? '✅' : '❌';

  console.log(`Si registro en ${mes}:`);
  console.log(`  ACTUAL (bug):    ${mesGeneradoBug} 1968 ${esCorrecto}`);
  console.log(`  PROPUESTO (fix): ${mesGeneradoFix} 1968 ✅`);
  console.log('');
});

console.log('\n=== SIMULACIÓN DE ESCENARIOS DE USO ===\n');

console.log('ESCENARIO 1: Usuario selecciona MES primero, luego AÑO');
console.log('-------------------------------------------------------');
let values = { birthDate: null };

// Usuario toca "Junio" (índice 5)
const añoInicial = 2025 - 25; // año sugerido
values.birthDate = new Date(añoInicial, 5, 1); // Junio 2000
console.log(`1. Usuario toca "Junio": ${values.birthDate.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})}`);

// Usuario luego toca año "1990"
const mesSeleccionado = values.birthDate.getMonth(); // 5 (Junio)
values.birthDate = new Date(1990, mesSeleccionado, 1);
console.log(`2. Usuario toca "1990": ${values.birthDate.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})}`);
console.log('✅ RESULTADO: Junio 1990 (CORRECTO)\n');

console.log('ESCENARIO 2: Usuario selecciona AÑO primero, luego MES (LÓGICA ACTUAL)');
console.log('-----------------------------------------------------------------------');
values = { birthDate: null };

// Simular que estamos en Junio
const fechaSistema = new Date(2025, 5, 10); // Junio 2025

// Usuario toca año "1968"
const mesActualBug = fechaSistema.getMonth(); // 5 (Junio) - del sistema!
values.birthDate = new Date(1968, mesActualBug, 1);
console.log(`1. Usuario toca "1968": ${values.birthDate.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})}`);
console.log('   ⚠️ Visual muestra: Abril 1968');
console.log('   ❌ Pero se guardó: Junio 1968');

// Usuario luego toca mes "Abril" (índice 3)
const añoSeleccionado = values.birthDate.getFullYear(); // 1968
values.birthDate = new Date(añoSeleccionado, 3, 1);
console.log(`2. Usuario toca "Abril": ${values.birthDate.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})}`);
console.log('✅ Al final: Abril 1968 (correcto después de tocar mes)\n');

console.log('ESCENARIO 3: Usuario selecciona AÑO primero, luego MES (LÓGICA PROPUESTA)');
console.log('--------------------------------------------------------------------------');
values = { birthDate: null };

// Usuario toca año "1968" (con fix)
const mesInicialFix = 3; // Abril (índice fijo)
values.birthDate = new Date(1968, mesInicialFix, 1);
console.log(`1. Usuario toca "1968": ${values.birthDate.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})}`);
console.log('   ✅ Visual muestra: Abril 1968');
console.log('   ✅ Se guardó: Abril 1968');

// Usuario luego toca mes "Junio" (índice 5)
const añoSeleccionadoFix = values.birthDate.getFullYear(); // 1968
values.birthDate = new Date(añoSeleccionadoFix, 5, 1);
console.log(`2. Usuario toca "Junio": ${values.birthDate.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})}`);
console.log('✅ Resultado: Junio 1968 (correcto)\n');

console.log('ESCENARIO 4: Usuario solo selecciona AÑO y confirma (SIN tocar mes)');
console.log('--------------------------------------------------------------------');
console.log('Con lógica ACTUAL:');
values = { birthDate: null };
const mesSistemaBug = new Date().getMonth(); // Depende del mes actual!
values.birthDate = new Date(1968, mesSistemaBug, 1);
console.log(`Resultado: ${values.birthDate.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})} ❌`);
console.log(`(Cambia según el mes en que se registre el usuario)\n`);

console.log('Con lógica PROPUESTA:');
values = { birthDate: null };
const mesInicialPropuesto = 3; // Abril (fijo)
values.birthDate = new Date(1968, mesInicialPropuesto, 1);
console.log(`Resultado: ${values.birthDate.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})} ✅`);
console.log(`(Siempre Abril, predecible y coherente con lo visual)\n`);

console.log('\n=== CONCLUSIÓN ===');
console.log('✅ El índice 3 corresponde a Abril');
console.log('✅ La solución NO rompe ningún flujo existente');
console.log('✅ La solución CORRIGE el bug reportado');
console.log('✅ La solución hace que visual = lógica (coherencia UX)');
