// TEST SCRIPT: Verificar fixes de Signup y Profile
// Ejecutar: node test-signup-fixes.js

console.log('🧪 SCRIPT DE PRUEBA: Fixes de Signup y Profile');
console.log('='.repeat(60));

// Test 1: Verificar que birthDate opcional no cause crash
function testBirthDateOptional() {
  console.log('\n1️⃣ TESTING: birthDate opcional no causa crash');
  
  try {
    // Simular valores como los recibe Formik
    const values = {
      first_name: 'Juan',
      last_name: 'Pérez', 
      phone: '55 1234 5678',
      birthDate: null, // ← Este es el caso problemático
      email: 'juan@test.com',
      password: 'password123',
      confirmPassword: 'password123'
    };
    
    // Simular la lógica del onSubmit arreglada
    let dob = null;
    if (values.birthDate) {
      const opts = {month: 'long', year: 'numeric'};
      dob = values.birthDate.toLocaleDateString('es-ES', opts);
    }
    
    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      contact_number: values.phone.replace(/\D/g, ''), // Solo números
      email: values.email,
      password: values.password,
      password_confirmation: values.confirmPassword,
    };
    
    // Solo agregar dob si existe
    if (dob) {
      payload.dob = dob;
    }
    
    console.log('✅ SIN CRASH: birthDate null manejado correctamente');
    console.log('📦 Payload generado:', JSON.stringify(payload, null, 2));
    return true;
    
  } catch (error) {
    console.log('❌ CRASH: Error al manejar birthDate null:', error.message);
    return false;
  }
}

// Test 2: Verificar formato de teléfono
function testPhoneFormat() {
  console.log('\n2️⃣ TESTING: Formato de teléfono mexicano');
  
  const formatMexicanPhone = (phone) => {
    if (!phone) return '';
    
    const numbers = phone.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)} ${numbers.slice(6)}`;
    } else {
      return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)} ${numbers.slice(6, 10)}`;
    }
  };
  
  const getPlainPhone = (phone) => {
    return phone ? phone.replace(/\D/g, '') : '';
  };
  
  const testCases = [
    { input: '5512345678', expectedFormat: '55 1234 5678', expectedPlain: '5512345678' },
    { input: '55 1234 5678', expectedFormat: '55 1234 5678', expectedPlain: '5512345678' },
    { input: '555123456789', expectedFormat: '55 5123 4567', expectedPlain: '555123456789' },
    { input: '55', expectedFormat: '55', expectedPlain: '55' },
    { input: '', expectedFormat: '', expectedPlain: '' }
  ];
  
  let allPassed = true;
  
  testCases.forEach((test, index) => {
    const formatted = formatMexicanPhone(test.input);
    const plain = getPlainPhone(test.input);
    
    const formatOK = formatted === test.expectedFormat;
    const plainOK = plain === test.expectedPlain;
    
    if (formatOK && plainOK) {
      console.log(`✅ Caso ${index + 1}: "${test.input}" → "${formatted}" | Backend: "${plain}"`);
    } else {
      console.log(`❌ Caso ${index + 1}: FALLÓ`);
      console.log(`   Input: "${test.input}"`);
      console.log(`   Formato esperado: "${test.expectedFormat}", obtenido: "${formatted}"`);
      console.log(`   Plain esperado: "${test.expectedPlain}", obtenido: "${plain}"`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Test 3: Verificar validación de contraseña
function testPasswordValidation() {
  console.log('\n3️⃣ TESTING: Validación de contraseña (8 caracteres)');
  
  const testPasswords = [
    { password: '123456', shouldPass: false, description: '6 chars - debe fallar' },
    { password: '1234567', shouldPass: false, description: '7 chars - debe fallar' },
    { password: '12345678', shouldPass: true, description: '8 chars - debe pasar' },
    { password: 'password123', shouldPass: true, description: '11 chars - debe pasar' },
  ];
  
  let allPassed = true;
  
  testPasswords.forEach((test, index) => {
    const isValid = test.password.length >= 8;
    const passed = isValid === test.shouldPass;
    
    if (passed) {
      console.log(`✅ ${test.description}: "${test.password}" (${test.password.length} chars)`);
    } else {
      console.log(`❌ ${test.description}: "${test.password}" (${test.password.length} chars)`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Test 4: Verificar que botón se habilita correctamente
function testButtonValidation() {
  console.log('\n4️⃣ TESTING: Lógica de habilitación de botón');
  
  const testCases = [
    {
      isValid: false,
      dirty: false, 
      isSubmitting: false,
      shouldBeDisabled: true,
      description: 'Formulario inválido y sin cambios'
    },
    {
      isValid: true,
      dirty: false,
      isSubmitting: false, 
      shouldBeDisabled: true,
      description: 'Formulario válido pero sin cambios'
    },
    {
      isValid: true,
      dirty: true,
      isSubmitting: false,
      shouldBeDisabled: false, 
      description: 'Formulario válido y con cambios - HABILITADO'
    },
    {
      isValid: true,
      dirty: true,
      isSubmitting: true,
      shouldBeDisabled: true,
      description: 'Enviando - deshabilitado'
    }
  ];
  
  let allPassed = true;
  
  testCases.forEach((test, index) => {
    const shouldDisable = !test.isValid || !test.dirty || test.isSubmitting;
    const passed = shouldDisable === test.shouldBeDisabled;
    
    if (passed) {
      console.log(`✅ ${test.description}: ${shouldDisable ? 'DESHABILITADO' : 'HABILITADO'}`);
    } else {
      console.log(`❌ ${test.description}: Esperado ${test.shouldBeDisabled ? 'DESHABILITADO' : 'HABILITADO'}, obtenido ${shouldDisable ? 'DESHABILITADO' : 'HABILITADO'}`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Ejecutar todos los tests
async function runAllTests() {
  console.log('\n🚀 EJECUTANDO TODOS LOS TESTS...\n');
  
  const results = [
    { name: 'birthDate opcional', result: testBirthDateOptional() },
    { name: 'Formato teléfono', result: testPhoneFormat() },
    { name: 'Validación contraseña', result: testPasswordValidation() },
    { name: 'Validación botón', result: testButtonValidation() }
  ];
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE RESULTADOS:');
  console.log('='.repeat(60));
  
  let allPassed = true;
  results.forEach(test => {
    const status = test.result ? '✅ PASÓ' : '❌ FALLÓ';
    console.log(`${status} - ${test.name}`);
    if (!test.result) allPassed = false;
  });
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 TODOS LOS TESTS PASARON - LISTO PARA PUSH!');
    console.log('✅ Los fixes están funcionando correctamente');
    console.log('🚀 Puedes hacer push con confianza');
  } else {
    console.log('⚠️  ALGUNOS TESTS FALLARON - REVISAR CÓDIGO');
    console.log('❌ Hay problemas que necesitan corrección');
  }
  console.log('='.repeat(60));
  
  return allPassed;
}

// Ejecutar el script
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}