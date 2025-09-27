#!/usr/bin/env node

/**
 * Script SEGURO para limpiar logs de React Native
 * Identifica y elimina SOLO logs reales sin romper el código
 */

const fs = require('fs');
const path = require('path');

// Patrones SEGUROS para logs que podemos eliminar
const SAFE_LOG_PATTERNS = [
  // Console logs básicos
  /^\s*console\.log\([^)]*\);\s*$/gm,
  /^\s*console\.warn\([^)]*\);\s*$/gm,
  /^\s*console\.error\([^)]*\);\s*$/gm,
  /^\s*console\.info\([^)]*\);\s*$/gm,
  /^\s*console\.debug\([^)]*\);\s*$/gm,
  
  // Logs comentados (// console.log)
  /^\s*\/\/\s*console\.(log|warn|error|info|debug)\([^)]*\).*$/gm,
  
  // Logs multilinea simples con template strings
  /^\s*console\.log\(\s*`[^`]*`\s*\);\s*$/gm,
  
  // Logs con emojis de debug específicos
  /^\s*console\.log\(\s*['"`][🔍🐛🚨🔥⚡][^'"`]*['"`][^)]*\);\s*$/gm,
];

// Patrones PELIGROSOS que NO debemos tocar
const UNSAFE_PATTERNS = [
  /console\.(log|error|warn)\s*\([^)]*\)\s*&&/,  // Logs con operadores lógicos
  /return\s+console\./,                          // Logs como return values
  /\?\s*console\./,                              // Logs en operadores ternarios
  /console\.[^(]*\([^)]*=>/,                     // Logs con arrow functions
  /console\.[^(]*\([^)]*function/,               // Logs con functions
  /console\.[^(]*\([^)]*{/,                      // Logs con objetos complejos que abren llaves
];

let totalFilesProcessed = 0;
let totalLogsRemoved = 0;
let filesWithChanges = 0;

function isSafeToRemove(line, fileContent, lineIndex) {
  // No tocar líneas con patrones peligrosos
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(line)) {
      console.log(`⚠️ SALTANDO línea peligrosa: ${line.trim().substring(0, 50)}...`);
      return false;
    }
  }
  
  // Verificar que no esté dentro de un string
  const lines = fileContent.split('\n');
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i <= lineIndex; i++) {
    const currentLine = lines[i];
    for (let j = 0; j < currentLine.length; j++) {
      const char = currentLine[j];
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && currentLine[j-1] !== '\\') {
        inString = false;
      }
    }
    
    if (i === lineIndex && inString) {
      return false; // Estamos dentro de un string, no tocar
    }
  }
  
  return true;
}

function cleanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const originalLines = content.split('\n');
    let modifiedContent = content;
    let logsRemovedInFile = 0;
    
    console.log(`\n📁 Procesando: ${path.relative(process.cwd(), filePath)}`);
    
    // Procesar línea por línea para mayor seguridad
    const lines = content.split('\n');
    const cleanLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let shouldRemove = false;
      
      // Verificar cada patrón seguro
      for (const pattern of SAFE_LOG_PATTERNS) {
        if (pattern.test(line)) {
          if (isSafeToRemove(line, content, i)) {
            console.log(`  ✂️ Removiendo: ${line.trim().substring(0, 60)}...`);
            shouldRemove = true;
            logsRemovedInFile++;
            break;
          }
        }
      }
      
      if (!shouldRemove) {
        cleanLines.push(line);
      }
    }
    
    if (logsRemovedInFile > 0) {
      const cleanContent = cleanLines.join('\n');
      fs.writeFileSync(filePath, cleanContent, 'utf8');
      console.log(`  ✅ ${logsRemovedInFile} logs removidos de ${path.basename(filePath)}`);
      filesWithChanges++;
      totalLogsRemoved += logsRemovedInFile;
    } else {
      console.log(`  ✨ Sin logs para limpiar en ${path.basename(filePath)}`);
    }
    
    totalFilesProcessed++;
    
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}: ${error.message}`);
  }
}

function findJSFiles(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Evitar node_modules, .git, build, etc.
        if (!['node_modules', '.git', 'build', 'dist', '.expo', 'android', 'ios'].includes(item)) {
          files.push(...findJSFiles(fullPath));
        }
      } else if (item.match(/\.(js|jsx|ts|tsx)$/)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error leyendo directorio ${dir}: ${error.message}`);
  }
  
  return files;
}

// Ejecutar limpieza
console.log('🧹 INICIANDO LIMPIEZA SEGURA DE LOGS');
console.log('=====================================');

const srcDir = path.join(__dirname, 'src');
if (!fs.existsSync(srcDir)) {
  console.error('❌ No se encontró el directorio src/');
  process.exit(1);
}

const jsFiles = findJSFiles(srcDir);
console.log(`📊 Encontrados ${jsFiles.length} archivos JS/JSX/TS/TSX para procesar`);

// Crear backup de seguridad
console.log('\n💾 Creando backup de seguridad...');
const backupDir = path.join(__dirname, `backup_${Date.now()}`);
fs.mkdirSync(backupDir, { recursive: true });

jsFiles.forEach(file => {
  const relativePath = path.relative(srcDir, file);
  const backupFile = path.join(backupDir, relativePath);
  const backupFileDir = path.dirname(backupFile);
  
  fs.mkdirSync(backupFileDir, { recursive: true });
  fs.copyFileSync(file, backupFile);
});

console.log(`✅ Backup creado en: ${backupDir}`);

// Procesar archivos
console.log('\n🔄 Procesando archivos...');
jsFiles.forEach(cleanFile);

// Reporte final
console.log('\n📋 REPORTE FINAL');
console.log('================');
console.log(`📁 Archivos procesados: ${totalFilesProcessed}`);
console.log(`✂️ Archivos modificados: ${filesWithChanges}`);
console.log(`🗑️ Total logs removidos: ${totalLogsRemoved}`);
console.log(`💾 Backup disponible en: ${path.relative(process.cwd(), backupDir)}`);
console.log('\n✅ Limpieza completada de forma SEGURA');

if (totalLogsRemoved === 0) {
  console.log('\n🎉 No se encontraron logs para limpiar. ¡Tu código ya está limpio!');
}