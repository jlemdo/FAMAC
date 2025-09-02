const fs = require('fs');
const path = require('path');

// Directorio del proyecto FAMAC
const projectDir = './src';

// Patrones de console.log a eliminar
const logPatterns = [
  /console\.log\([^)]*\);?/g,
  /console\.warn\([^)]*\);?/g,
  /console\.error\([^)]*\);?/g,
  /console\.info\([^)]*\);?/g,
  /console\.debug\([^)]*\);?/g,
  // Logs con emojis
  /console\.log\(['"][^'"]*['"], [^)]*\);?/g,
  // Logs multilinea
  /console\.log\(\s*['"][^'"]*['"],?\s*[^)]*\);?/g,
];

// Contador de archivos procesados
let filesProcessed = 0;
let logsRemoved = 0;

// Función recursiva para procesar archivos
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Procesar subdirectorios
      processDirectory(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      // Procesar archivos JS/JSX/TS/TSX
      processFile(fullPath);
    }
  });
}

// Función para procesar un archivo individual
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileLogsRemoved = 0;
    
    // Aplicar todos los patrones
    logPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        fileLogsRemoved += matches.length;
        content = content.replace(pattern, '');
      }
    });
    
    // Limpiar líneas vacías extra
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Solo escribir si hubo cambios
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath}: ${fileLogsRemoved} logs eliminados`);
      logsRemoved += fileLogsRemoved;
    }
    
    filesProcessed++;
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
  }
}

// Ejecutar script
console.log('🧹 INICIANDO LIMPIEZA DE LOGS DEL FRONTEND FAMAC...');
console.log('📁 Directorio:', path.resolve(projectDir));
console.log('');

if (fs.existsSync(projectDir)) {
  processDirectory(projectDir);
  
  console.log('');
  console.log('🎉 LIMPIEZA COMPLETADA:');
  console.log(`📄 Archivos procesados: ${filesProcessed}`);
  console.log(`🗑️ Logs eliminados: ${logsRemoved}`);
} else {
  console.error('❌ Directorio no encontrado:', projectDir);
}