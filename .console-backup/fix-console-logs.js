const fs = require('fs');
const path = require('path');

/**
 * Script avanzado para comentar todos los console.log() del proyecto
 * Maneja casos complejos:
 * - console.log(), console.error(), console.warn(), console.info(), console.debug(), console.trace()
 * - Logs simples y multilínea
 * - Logs anidados con paréntesis complejos
 * - Strings con escape characters
 * - Template literals
 * - Ya comentados (los omite)
 * - Preserva indentación original
 * - Manejo seguro de strings y caracteres especiales
 */

// Configuración
const CONSOLE_METHODS = ['log', 'error', 'warn', 'info', 'debug', 'trace'];

// Estadísticas globales
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  consoleStatementsCommented: 0,
  multilineStatementsCommented: 0,
  alreadyCommentedSkipped: 0
};

/**
 * Función principal para comentar console statements en contenido
 */
function commentConsoleStatements(content) {
  const lines = content.split('\n');
  const result = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Verificar si ya está comentada
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine === '') {
      if (containsConsoleStatement(trimmedLine)) {
        stats.alreadyCommentedSkipped++;
      }
      result.push(line);
      i++;
      continue;
    }
    
    // Buscar console statements
    const consoleMatch = findConsoleStatementInLine(line);
    
    if (consoleMatch) {
      // Procesar statement (puede ser multilínea)
      const processed = processConsoleStatement(lines, i);
      result.push(...processed.commentedLines);
      i += processed.linesConsumed;
      
      stats.consoleStatementsCommented++;
      if (processed.linesConsumed > 1) {
        stats.multilineStatementsCommented++;
      }
    } else {
      result.push(line);
      i++;
    }
  }
  
  return result.join('\n');
}

/**
 * Buscar console statement en una línea
 */
function findConsoleStatementInLine(line) {
  for (const method of CONSOLE_METHODS) {
    const regex = new RegExp(`\\bconsole\\.${method}\\s*\\(`, 'i');
    const match = line.match(regex);
    if (match) {
      return {
        method: method,
        index: match.index,
        fullMatch: match[0]
      };
    }
  }
  return null;
}

/**
 * Verificar si una línea contiene console statement
 */
function containsConsoleStatement(line) {
  return CONSOLE_METHODS.some(method => {
    const regex = new RegExp(`\\bconsole\\.${method}\\s*\\(`, 'i');
    return regex.test(line);
  });
}

/**
 * Procesar console statement que puede ser multilínea
 */
function processConsoleStatement(lines, startIndex) {
  const commentedLines = [];
  let currentIndex = startIndex;
  let parenthesesCount = 0;
  let inString = false;
  let stringChar = null;
  let inTemplateString = false;
  let templateDepth = 0;
  let escaped = false;
  let foundOpeningParen = false;
  let linesConsumed = 0;
  
  while (currentIndex < lines.length && linesConsumed < 100) { // Límite de seguridad
    const line = lines[currentIndex];
    const originalIndentation = getLineIndentation(line);
    
    // Analizar cada carácter de la línea
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\' && (inString || inTemplateString)) {
        escaped = true;
        continue;
      }
      
      // Manejo de template literals
      if (char === '`' && !inString) {
        if (!inTemplateString) {
          inTemplateString = true;
          templateDepth = 1;
        } else if (templateDepth === 1) {
          inTemplateString = false;
          templateDepth = 0;
        }
        continue;
      }
      
      if (inTemplateString) {
        if (char === '{' && charIndex > 0 && line[charIndex - 1] === '$') {
          templateDepth++;
        } else if (char === '}' && templateDepth > 1) {
          templateDepth--;
        }
        continue;
      }
      
      // Manejo de strings normales
      if (!inTemplateString && (char === '"' || char === "'")) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = null;
        }
        continue;
      }
      
      // Solo contar paréntesis fuera de strings
      if (!inString && !inTemplateString) {
        if (char === '(') {
          parenthesesCount++;
          foundOpeningParen = true;
        } else if (char === ')') {
          parenthesesCount--;
        }
      }
    }
    
    // Comentar la línea completa
    if (line.trim() !== '') {
      commentedLines.push(`${originalIndentation}// ${line.trim()}`);
    } else {
      commentedLines.push(line); // Preservar líneas vacías
    }
    
    linesConsumed++;
    currentIndex++;
    
    // Si cerramos todos los paréntesis, terminamos
    if (foundOpeningParen && parenthesesCount === 0) {
      break;
    }
  }
  
  return {
    commentedLines,
    linesConsumed
  };
}

/**
 * Obtener la indentación de una línea
 */
function getLineIndentation(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

function processFile(filePath) {
  try {
    stats.filesProcessed++;
    const content = fs.readFileSync(filePath, 'utf8');
    const modifiedContent = commentConsoleStatements(content);
    
    if (content !== modifiedContent) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      stats.filesModified++;
      console.log(`✅ Procesado: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ Sin cambios: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return false;
  }
}

function findJSFiles(dir) {
  const files = [];
  
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules' && item !== '__tests__') {
          walk(fullPath);
        }
      } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

// Solo procesar archivos específicos que sabemos que tienen console.log
const filesToProcess = [
  'src/address/AddressFormUberStyle.jsx',
  'src/cart/Cart.jsx',
  'src/cart/GuestCheckout.jsx', 
  'src/components/DeliverySlotPicker.jsx',
  'src/context/CartContext.js',
  'src/home/CategoriesList.jsx',
  'src/order/Order.jsx',
  'src/profile/Profile.jsx'
];

// Función principal
function main() {
  const rootDir = path.join(__dirname, 'src'); // carpeta raíz del código
  const filesToProcess = findJSFiles(rootDir);

  console.log(`🔍 Procesando ${filesToProcess.length} archivos en ${rootDir}`);
  console.log(`📋 Buscando: ${CONSOLE_METHODS.map(m => `console.${m}()`).join(', ')}`);

  for (const file of filesToProcess) {
    if (fs.existsSync(file)) {
      processFile(file);
    }
  }

  // Estadísticas finales
  console.log(`\n📊 Resumen de procesamiento:`);
  console.log(`   📁 Archivos procesados: ${stats.filesProcessed}`);
  console.log(`   ✏️ Archivos modificados: ${stats.filesModified}`);
  console.log(`   💬 Console statements comentados: ${stats.consoleStatementsCommented}`);
  console.log(`   📄 Statements multilínea: ${stats.multilineStatementsCommented}`);
  console.log(`   ⏭️ Ya comentados (omitidos): ${stats.alreadyCommentedSkipped}`);
  console.log(`\n✨ Completado exitosamente!`);
}

// Ejecutar
main();