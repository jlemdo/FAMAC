# Script para reemplazar URLs hardcodeadas por configuracion dinamica
# Reemplaza awsoccr.pixelcrafters.digital por configuracion dinamica

$srcPath = ".\src"
$oldUrl = "https://awsoccr.pixelcrafters.digital"
$foodUrl = "https://food.siliconsoft.pk"

# Archivos que necesitan import de API_BASE_URL
$filesToProcess = @(
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

Write-Host "Procesando archivos..." -ForegroundColor Cyan

foreach ($file in $filesToProcess) {
    if (Test-Path $file) {
        Write-Host "Procesando: $file" -ForegroundColor Yellow

        $content = Get-Content $file -Raw -Encoding UTF8
        $modified = $false

        # Verificar si ya tiene el import
        $hasImport = $content -match "import.*API_BASE_URL.*from.*config/environment"

        # Reemplazar URLs de awsoccr.pixelcrafters.digital
        if ($content -match $oldUrl) {
            $content = $content -replace [regex]::Escape("'${oldUrl}/api"), "'`${API_BASE_URL}/api"
            $content = $content -replace [regex]::Escape("`"${oldUrl}/api"), "`"`${API_BASE_URL}/api"
            $content = $content -replace [regex]::Escape("``${oldUrl}/api"), "``${API_BASE_URL}/api"
            $content = $content -replace [regex]::Escape("'${oldUrl}/invoices"), "'`${API_BASE_URL}/invoices"
            $content = $content -replace [regex]::Escape("`"${oldUrl}/invoices"), "`"`${API_BASE_URL}/invoices"
            $content = $content -replace [regex]::Escape("``${oldUrl}/invoices"), "``${API_BASE_URL}/invoices"
            $content = $content -replace [regex]::Escape("'${oldUrl}/downloads"), "'`${API_BASE_URL}/downloads"
            $content = $content -replace [regex]::Escape("`"${oldUrl}/downloads"), "`"`${API_BASE_URL}/downloads"
            $content = $content -replace [regex]::Escape("``${oldUrl}/downloads"), "``${API_BASE_URL}/downloads"
            $modified = $true
        }

        # Reemplazar URLs de food.siliconsoft.pk
        if ($content -match $foodUrl) {
            $content = $content -replace [regex]::Escape("'${foodUrl}/api"), "'`${API_BASE_URL}/api"
            $content = $content -replace [regex]::Escape("`"${foodUrl}/api"), "`"`${API_BASE_URL}/api"
            $content = $content -replace [regex]::Escape("``${foodUrl}/api"), "``${API_BASE_URL}/api"
            $modified = $true
        }

        # Agregar import si no lo tiene y se hicieron cambios
        if ($modified -and -not $hasImport) {
            # Buscar la ultima linea de imports
            $lines = $content -split "`n"
            $lastImportIndex = -1

            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import ") {
                    $lastImportIndex = $i
                }
            }

            if ($lastImportIndex -ge 0) {
                # Insertar el import despues del ultimo import existente
                $importLine = "import { API_BASE_URL } from '../config/environment';"
                $lines = $lines[0..$lastImportIndex] + $importLine + $lines[($lastImportIndex + 1)..($lines.Count - 1)]
                $content = $lines -join "`n"
                Write-Host "  Import agregado" -ForegroundColor Green
            }
        }

        if ($modified) {
            Set-Content $file -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  URLs reemplazadas" -ForegroundColor Green
        } else {
            Write-Host "  Sin cambios necesarios" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Archivo no encontrado: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Proceso completado!" -ForegroundColor Green
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "  - Archivos procesados: $($filesToProcess.Count)" -ForegroundColor White
Write-Host "  - URLs reemplazadas de awsoccr.pixelcrafters.digital" -ForegroundColor White
Write-Host "  - URLs reemplazadas de food.siliconsoft.pk" -ForegroundColor White
