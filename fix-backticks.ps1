# Script para corregir comillas simples a backticks en template literals

$filesToFix = @(
    ".\src\address\AddressFormUberStyle.jsx",
    ".\src\home\SpecificCategoryProduct.jsx",
    ".\src\home\SearchResults.jsx",
    ".\src\home\CategoriesList.jsx",
    ".\src\context\ProfileContext.jsx",
    ".\src\components\DeliverySlotPicker.jsx",
    ".\src\components\EmailVerification.jsx",
    ".\src\context\OrderContext.js",
    ".\src\header\Header.jsx",
    ".\src\context\CartContext.js",
    ".\src\cart\Cart.jsx",
    ".\src\profile\Profile.jsx",
    ".\src\utils\orderMigration.js",
    ".\src\authentication\ForgotPassword.jsx",
    ".\src\authentication\Login.jsx",
    ".\src\order\Chat.jsx",
    ".\src\order\Order.jsx",
    ".\src\order\driver\CustomerTracking.jsx",
    ".\src\authentication\Signup.jsx",
    ".\src\order\driver\new.jsx",
    ".\src\order\OrderDetail.jsx",
    ".\src\order\driver\DriverTracking.jsx",
    ".\src\suggestions\Suggestions.jsx"
)

Write-Host "Corrigiendo comillas simples a backticks..." -ForegroundColor Cyan

$totalFixed = 0

foreach ($file in $filesToFix) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -Encoding UTF8
        $originalContent = $content

        # Reemplazar comillas simples por backticks en template literals con API_BASE_URL
        $content = $content -replace "'(\$\{API_BASE_URL\}[^']*)'", '`$1`'
        $content = $content -replace '"(\$\{API_BASE_URL\}[^"]*)"', '`$1`'

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
