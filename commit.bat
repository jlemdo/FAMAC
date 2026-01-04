@echo off
echo ========================================
echo CREANDO COMMIT - Estado Actual Proyecto
echo ========================================
echo.

echo [1/4] Verificando estado...
git status

echo.
echo [2/4] Agregando archivos...
git add .

echo.
echo [3/4] Creando commit...
git commit -m "chore: Preparacion proyecto antes de refactor Signup - Sistema estable" -m "Estado actual del proyecto Sabores de Origen antes de refactorizar Signup.jsx" -m "Caracteristicas principales estables:" -m "- Firebase iOS notifications funcionando (registerDeviceForRemoteMessages)" -m "- OXXO payments con allowsDelayedPaymentMethods activo" -m "- Sistema Guest Orders completo (ver pedidos sin registro)" -m "- Navegacion iOS Guest checkout funcionando correctamente" -m "- Auto-pago Guest despues de completar datos" -m "- Theme system global implementado (Phase 1 completada en Profile.jsx)" -m "- Sistema de direcciones con 3 metodos (GPS, busqueda, manual)" -m "- Geocoding inteligente automatico" -m "- Carrusel de categorias estilo Uber Eats" -m "- Modal de atencion al cliente en Profile y OrderDetail" -m "- Sistema de fuentes numericas global" -m "" -m "Version: 1.3.1" -m "React Native: 0.79.1"

echo.
echo [4/4] Haciendo push...
git push origin main

echo.
echo ========================================
echo COMMIT COMPLETADO EXITOSAMENTE
echo ========================================
pause
