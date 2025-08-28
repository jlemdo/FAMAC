// Test temporal para validación de códigos postales
const fs = require('fs');

// Leer y evaluar el contenido del archivo de validación
const validatorContent = fs.readFileSync('./src/utils/postalCodeValidator.js', 'utf8');

// Convertir exports a module.exports para compatibilidad con Node.js
const convertedContent = validatorContent
  .replace(/export const /g, 'const ')
  .replace(/export default.*$/gm, '')
  + '\n\nmodule.exports = { validatePostalCode, getPostalCodeInfo, getAllowedPostalCodes, getCoverageStats };';

// Evaluar el código convertido
eval(convertedContent);

const { validatePostalCode, getPostalCodeInfo, getAllowedPostalCodes, getCoverageStats } = module.exports;

console.log('🧪 TESTING VALIDACIÓN DE CÓDIGO POSTAL\n');

// Test 1: Códigos válidos conocidos
console.log('✅ CÓDIGOS VÁLIDOS:');
const validCodes = ['03100', '11000', '06000', '53000', '54000'];
validCodes.forEach(cp => {
  const result = validatePostalCode(cp);
  const status = result.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO';
  const description = result.isValid ? result.location.description : result.message;
  console.log(`CP ${cp}: ${status} - ${description}`);
});

console.log('\n❌ CÓDIGOS INVÁLIDOS:');
// Test 2: Códigos inválidos
const invalidCodes = ['12345', '99999', '00000', '55555'];
invalidCodes.forEach(cp => {
  const result = validatePostalCode(cp);
  const status = result.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO';
  console.log(`CP ${cp}: ${status} - ${result.message}`);
});

console.log('\n📊 ESTADÍSTICAS:');
const stats = getCoverageStats();
console.log(`Total de CPs permitidos: ${stats.total}`);
console.log(`CDMX: ${stats.cdmx} CPs`);
console.log(`Estado de México: ${stats.edomex} CPs`);

console.log('\n🌟 PRIMEROS 5 CÓDIGOS PERMITIDOS:');
const allowedCodes = getAllowedPostalCodes();
allowedCodes.slice(0, 5).forEach(cp => {
  console.log(`${cp.code} - ${cp.description} (${cp.state})`);
});

// Limpiar archivo temporal
setTimeout(() => {
  fs.unlinkSync('./test-postal-validation.js');
}, 1000);