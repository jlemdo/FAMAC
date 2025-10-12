# Script para actualizar endpoints del frontend
# Reemplaza todas las URLs de occr.pixelcrafters.digital por awsoccr.pixelcrafters.digital

Write-Host "🔄 Actualizando endpoints del frontend..." -ForegroundColor Cyan

$oldUrl = "https://occr.pixelcrafters.digital"
$newUrl = "https://awsoccr.pixelcrafters.digital"

$files = Get-ChildItem -Path ".\src" -Recurse -Include *.js,*.jsx,*.ts,*.tsx

$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace [regex]::Escape($oldUrl), $newUrl

    if ($content -ne $newContent) {
        $count = ([regex]::Matches($content, [regex]::Escape($oldUrl))).Count
        $totalReplacements += $count
        $totalFiles++

        Set-Content $file.FullName -Value $newContent -NoNewline
        Write-Host "✅ $($file.Name): $count reemplazos" -ForegroundColor Green
    }
}

Write-Host "`n✨ Completado!" -ForegroundColor Green
Write-Host "📊 Total: $totalReplacements reemplazos en $totalFiles archivos" -ForegroundColor Yellow
Write-Host "`n🔍 Verificando que no queden URLs antiguas..." -ForegroundColor Cyan

$remaining = Get-ChildItem -Path ".\src" -Recurse -Include *.js,*.jsx,*.ts,*.tsx | Select-String -Pattern $oldUrl

if ($remaining) {
    Write-Host "⚠️  Aún quedan URLs antiguas en:" -ForegroundColor Red
    $remaining | ForEach-Object { Write-Host "   - $($_.Path):$($_.LineNumber)" }
} else {
    Write-Host "✅ No se encontraron URLs antiguas. ¡Todo actualizado!" -ForegroundColor Green
}
