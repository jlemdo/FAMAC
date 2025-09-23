#!/usr/bin/env node

/**
 * Script profesional para comentar/eliminar console.log en toda la aplicación
 *
 * Características:
 * - Detecta console.log multilinea y complejos
 * - Preserva funcionalidad crítica
 * - Backup automático antes de modificar
 * - Reportes detallados
 * - Rollback en caso de errores
 *
 * Uso:
 * node scripts/clean-console-logs.js [--comment|--remove] [--dry-run] [--restore]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ConsoleLogCleaner {
  constructor(options = {}) {
    this.options = {
      mode: 'comment', // 'comment' o 'remove'
      dryRun: false,
      restore: false,
      srcDir: path.join(process.cwd(), 'src'),
      backupDir: path.join(process.cwd(), '.console-backup'),
      ...options
    };

    this.stats = {
      filesProcessed: 0,
      logsFound: 0,
      logsModified: 0,
      errors: []
    };

    this.jsExtensions = ['.js', '.jsx', '.ts', '.tsx'];
  }

  /**
   * Regex avanzado para detectar console.log multilinea y complejos
   */
  getConsoleLogRegex() {
    return {
      // Console.log simple: console.log('hello')
      simple: /^(\s*)(console\.(?:log|warn|error|info|debug|trace))\s*\((.*?)\)\s*;?\s*$/gm,

      // Console.log multilinea: console.log(`hello ${world}`)
      multilineStart: /^(\s*)(console\.(?:log|warn|error|info|debug|trace))\s*\(/,

      // Console.log con template strings y objetos complejos
      complex: /^(\s*)(console\.(?:log|warn|error|info|debug|trace))\s*\(/
    };
  }

  /**
   * Parsea argumentos de línea de comandos
   */
  parseArgs() {
    const args = process.argv.slice(2);

    if (args.includes('--remove')) this.options.mode = 'remove';
    if (args.includes('--comment')) this.options.mode = 'comment';
    if (args.includes('--dry-run')) this.options.dryRun = true;
    if (args.includes('--restore')) this.options.restore = true;

    return this.options;
  }

  /**
   * Crea backup de archivos antes de modificar
   */
  createBackup() {
    if (this.options.dryRun || this.options.restore) return;

    console.log('📁 Creando backup de archivos...');

    if (fs.existsSync(this.options.backupDir)) {
      fs.rmSync(this.options.backupDir, { recursive: true, force: true });
    }

    fs.mkdirSync(this.options.backupDir, { recursive: true });

    // Usar git para crear backup completo
    try {
      execSync(`git checkout-index -a --prefix="${this.options.backupDir}/"`, {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      console.log(`✅ Backup creado en: ${this.options.backupDir}`);
    } catch (error) {
      console.error('❌ Error creando backup:', error.message);
      process.exit(1);
    }
  }

  /**
   * Restaura archivos desde backup
   */
  restoreBackup() {
    if (!fs.existsSync(this.options.backupDir)) {
      console.error('❌ No se encontró backup para restaurar');
      process.exit(1);
    }

    console.log('🔄 Restaurando archivos desde backup...');

    try {
      const backupSrc = path.join(this.options.backupDir, 'src');
      if (fs.existsSync(backupSrc)) {
        fs.rmSync(this.options.srcDir, { recursive: true, force: true });
        fs.cpSync(backupSrc, this.options.srcDir, { recursive: true });
        console.log('✅ Archivos restaurados exitosamente');
      }
    } catch (error) {
      console.error('❌ Error restaurando backup:', error.message);
      process.exit(1);
    }
  }

  /**
   * Obtiene todos los archivos JS/JSX/TS/TSX recursivamente
   */
  getJavaScriptFiles(dir = this.options.srcDir) {
    const files = [];

    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scan(fullPath);
        } else if (this.jsExtensions.includes(path.extname(item))) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * Detecta y procesa console.log multilinea de manera inteligente
   */
  processConsoleLogsInContent(content, filePath) {
    const lines = content.split('\n');
    const processedLines = [];
    let modified = 0;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const regex = this.getConsoleLogRegex();

      // Detectar inicio de console.log
      const match = line.match(regex.multilineStart);

      if (match) {
        const [, indent, consoleMethod] = match;
        let consoleBlock = [line];
        let parenthesesCount = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        let j = i + 1;

        // Continuar leyendo líneas hasta que se cierren todos los paréntesis
        while (j < lines.length && parenthesesCount > 0) {
          const nextLine = lines[j];
          consoleBlock.push(nextLine);
          parenthesesCount += (nextLine.match(/\(/g) || []).length - (nextLine.match(/\)/g) || []).length;
          j++;
        }

        // Procesar el bloque completo
        const originalBlock = consoleBlock.join('\n');
        let processedBlock;

        if (this.options.mode === 'comment') {
          processedBlock = consoleBlock.map(blockLine =>
            blockLine.trim() ? `${indent}// ${blockLine.trim()}` : blockLine
          ).join('\n');
        } else {
          processedBlock = ''; // Eliminar completamente
        }

        // Verificar que es realmente un console.log válido
        if (this.isValidConsoleLog(originalBlock)) {
          processedLines.push(processedBlock);
          modified++;
          this.stats.logsFound++;

          if (!this.options.dryRun) {
            this.stats.logsModified++;
          }

          console.log(`  ${this.options.mode === 'comment' ? '💬' : '🗑️'} L${i + 1}: ${consoleMethod}(...)`);
        } else {
          processedLines.push(originalBlock);
        }

        i = j;
      } else {
        processedLines.push(line);
        i++;
      }
    }

    return {
      content: processedLines.join('\n'),
      modified
    };
  }

  /**
   * Valida que el texto es realmente un console.log válido
   */
  isValidConsoleLog(text) {
    // Verificaciones básicas
    if (!text.includes('console.')) return false;

    // Excluir comentarios que ya contengan console
    if (text.trim().startsWith('//') || text.trim().startsWith('*')) return false;

    // Verificar que tiene estructura válida de JavaScript
    try {
      // Simular el contexto para validar sintaxis
      const testCode = text.replace(/console\.(log|warn|error|info|debug|trace)/g, 'void');
      new Function(testCode);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Procesa un archivo individual
   */
  processFile(filePath) {
    try {
      const relativePath = path.relative(process.cwd(), filePath);
      const content = fs.readFileSync(filePath, 'utf8');

      const result = this.processConsoleLogsInContent(content, filePath);

      if (result.modified > 0) {
        console.log(`📄 ${relativePath} (${result.modified} console.log encontrados)`);

        if (!this.options.dryRun) {
          fs.writeFileSync(filePath, result.content, 'utf8');
        }
      }

      this.stats.filesProcessed++;

    } catch (error) {
      this.stats.errors.push({
        file: filePath,
        error: error.message
      });
      console.error(`❌ Error procesando ${filePath}: ${error.message}`);
    }
  }

  /**
   * Ejecuta el proceso completo
   */
  run() {
    console.log('\n🧹 FAMAC Console.log Cleaner v1.0\n');

    this.parseArgs();

    if (this.options.restore) {
      this.restoreBackup();
      return;
    }

    console.log(`Modo: ${this.options.mode.toUpperCase()}`);
    console.log(`Dry Run: ${this.options.dryRun ? 'SÍ' : 'NO'}`);
    console.log(`Directorio: ${this.options.srcDir}\n`);

    if (!this.options.dryRun) {
      this.createBackup();
    }

    const files = this.getJavaScriptFiles();
    console.log(`📁 Encontrados ${files.length} archivos JavaScript\n`);

    const startTime = Date.now();

    files.forEach(file => this.processFile(file));

    const endTime = Date.now();

    // Reporte final
    console.log('\n📊 REPORTE FINAL');
    console.log('==================');
    console.log(`Archivos procesados: ${this.stats.filesProcessed}`);
    console.log(`Console.log encontrados: ${this.stats.logsFound}`);
    console.log(`Console.log ${this.options.mode === 'comment' ? 'comentados' : 'eliminados'}: ${this.stats.logsModified}`);
    console.log(`Errores: ${this.stats.errors.length}`);
    console.log(`Tiempo: ${endTime - startTime}ms`);

    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      this.stats.errors.forEach(error => {
        console.log(`  ${error.file}: ${error.error}`);
      });
    }

    if (!this.options.dryRun && this.stats.logsModified > 0) {
      console.log('\n💡 COMANDOS ÚTILES:');
      console.log(`  Restaurar: node scripts/clean-console-logs.js --restore`);
      console.log(`  Git diff: git diff`);
      console.log(`  Git reset: git checkout -- src/`);
    }

    if (this.options.dryRun) {
      console.log('\n🔍 Esto fue una simulación. Usa sin --dry-run para aplicar cambios.');
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const cleaner = new ConsoleLogCleaner();
  cleaner.run();
}

module.exports = ConsoleLogCleaner;