# Script para corregir rutas relativas /api/ a usar API_BASE_URL

$filesToFix = @(
    ".\src\address\AddressFormUberStyle.jsx",
    ".\src\cart\Cart.jsx",
    ".\src\order\OrderDetail.jsx",
    ".\src\order\Chat.jsx",
    ".\src\components\DeliverySlotPicker.jsx",
    ".\src\profile\Profile.jsx"
)

Write-Host "Corrigiendo rutas relativas..." -ForegroundColor Cyan

$totalFixed = 0

foreach ($file in $filesToFix) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -Encoding UTF8
        $originalContent = $content

        # Reemplazar rutas relativas que empiezan con `/api/
        # Patrón: axios.get(`/api/... → axios.get(`${API_BASE_URL}/api/...
        $content = $content -replace '(axios\.(get|post|put|delete|patch)\()`(/api/[^`]+)`', '$1`${API_BASE_URL}$3`'

        # Verificar si axios.get(`${API_BASE_URL}/api/ aparece como duplicado
        $content = $content -replace '`\$\{API_BASE_URL\}\$\{API_BASE_URL\}', '`${API_BASE_URL}'

        if ($content -ne $originalContent) {
            Set-Content $file -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  Corregido: $file" -ForegroundColor Green
            $totalFixed++
        } else {
            Write-Host "  Sin cambios: $file" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No encontrado: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Proceso completado!" -ForegroundColor Green
Write-Host "Archivos corregidos: $totalFixed" -ForegroundColor White
