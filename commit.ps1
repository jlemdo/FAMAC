Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CREANDO COMMIT - Estado Actual Proyecto" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Verificando estado..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "[2/4] Agregando archivos..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "[3/4] Creando commit..." -ForegroundColor Yellow
git commit -m "chore: Preparacion proyecto antes de refactor Signup - Sistema estable" -m "Estado actual del proyecto Sabores de Origen antes de refactorizar Signup.jsx" -m "Caracteristicas principales estables:" -m "- Firebase iOS notifications funcionando (registerDeviceForRemoteMessages)" -m "- OXXO payments con allowsDelayedPaymentMethods activo" -m "- Sistema Guest Orders completo (ver pedidos sin registro)" -m "- Navegacion iOS Guest checkout funcionando correctamente" -m "- Auto-pago Guest despues de completar datos" -m "- Theme system global implementado (Phase 1 completada en Profile.jsx)" -m "- Sistema de direcciones con 3 metodos (GPS, busqueda, manual)" -m "- Geocoding inteligente automatico" -m "- Carrusel de categorias estilo Uber Eats" -m "- Modal de atencion al cliente en Profile y OrderDetail" -m "- Sistema de fuentes numericas global" -m "" -m "Version: 1.3.1" -m "React Native: 0.79.1"

Write-Host ""
Write-Host "[4/4] Haciendo push..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "COMMIT COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Read-Host "Presiona Enter para continuar"
