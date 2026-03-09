# Script de prueba de endpoints
$baseUrl = "http://localhost:3000"
$tokenFile = "test-token.txt"

Write-Host "`n=== PRUEBA DE ENDPOINTS ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n1. POST /auth/login" -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@globalmoneyweek.com"
        password = "admin123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    $token | Out-File $tokenFile
    Write-Host "✅ Login exitoso - Token guardado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Obtener eventos
Write-Host "`n2. GET /api/events/days" -ForegroundColor Yellow
try {
    $events = Invoke-RestMethod -Uri "$baseUrl/api/events/days" -Method GET
    Write-Host "✅ ${($events | Measure-Object).Count} eventos encontrados" -ForegroundColor Green
    $firstDay = $events[0]
    $firstSlot = $firstDay.slots[0]
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Crear reserva
Write-Host "`n3. POST /api/reservations" -ForegroundColor Yellow
try {
    $reservationBody = @{
        amie = "TEST$(Get-Random -Maximum 9999)"
        schoolName = "Colegio de Prueba"
        coordinatorName = "Juan Pérez"
        email = "test@example.com"
        whatsapp = "0987654321"
        students = 50
        dayId = $firstDay.id
        slotId = $firstSlot.id
    } | ConvertTo-Json
    
    $reservation = Invoke-RestMethod -Uri "$baseUrl/api/reservations" -Method POST -Body $reservationBody -ContentType "application/json" -TimeoutSec 15
    Write-Host "✅ Reserva creada: $($reservation.id)" -ForegroundColor Green
    Write-Host "   Email enviado: $($reservation.emailSent)" -ForegroundColor Gray
    $reservationId = $reservation.id
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    $reservationId = $null
}

# 4. Listar reservas (Admin)
Write-Host "`n4. GET /api/reservations (Admin)" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $reservations = Invoke-RestMethod -Uri "$baseUrl/api/reservations" -Method GET -Headers $headers
    Write-Host "✅ ${($reservations | Measure-Object).Count} reservas encontradas" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Obtener reserva por ID
if ($reservationId) {
    Write-Host "`n5. GET /api/reservations/:id" -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $reservation = Invoke-RestMethod -Uri "$baseUrl/api/reservations/$reservationId" -Method GET -Headers $headers
        Write-Host "✅ Reserva encontrada: $($reservation.schoolName)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 6. Actualizar reserva
if ($reservationId) {
    Write-Host "`n6. PATCH /api/reservations/:id" -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $updateBody = @{ status = "confirmada"; students = 60 } | ConvertTo-Json
        $updated = Invoke-RestMethod -Uri "$baseUrl/api/reservations/$reservationId" -Method PATCH -Body $updateBody -ContentType "application/json" -Headers $headers
        Write-Host "✅ Reserva actualizada - Estado: $($updated.status)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 7. Métricas generales
Write-Host "`n7. GET /api/metrics" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $metrics = Invoke-RestMethod -Uri "$baseUrl/api/metrics" -Method GET -Headers $headers
    Write-Host "✅ Métricas:" -ForegroundColor Green
    Write-Host "   - Colegios: $($metrics.totalSchools)" -ForegroundColor Gray
    Write-Host "   - Estudiantes: $($metrics.totalStudents)" -ForegroundColor Gray
    Write-Host "   - Ocupación: $($metrics.occupancyRate)%" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Métricas por día
Write-Host "`n8. GET /api/metrics/days" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $dayMetrics = Invoke-RestMethod -Uri "$baseUrl/api/metrics/days" -Method GET -Headers $headers
    Write-Host "✅ ${($dayMetrics | Measure-Object).Count} días con métricas" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Métricas por horario
Write-Host "`n9. GET /api/metrics/slots" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $slotMetrics = Invoke-RestMethod -Uri "$baseUrl/api/metrics/slots" -Method GET -Headers $headers
    Write-Host "✅ ${($slotMetrics | Measure-Object).Count} horarios con métricas" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 10. Exportar Excel
Write-Host "`n10. GET /api/reports/export?format=xlsx" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $report = Invoke-WebRequest -Uri "$baseUrl/api/reports/export?format=xlsx" -Method GET -Headers $headers -TimeoutSec 10
    Write-Host "✅ Excel generado: $($report.Content.Length) bytes" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 11. Exportar CSV
Write-Host "`n11. GET /api/reports/export?format=csv" -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $token" }
    $report = Invoke-WebRequest -Uri "$baseUrl/api/reports/export?format=csv" -Method GET -Headers $headers -TimeoutSec 10
    Write-Host "✅ CSV generado: $($report.Content.Length) bytes" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 12. Eliminar reserva
if ($reservationId) {
    Write-Host "`n12. DELETE /api/reservations/:id" -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $token" }
        Invoke-RestMethod -Uri "$baseUrl/api/reservations/$reservationId" -Method DELETE -Headers $headers
        Write-Host "✅ Reserva eliminada" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Limpiar
if (Test-Path $tokenFile) { Remove-Item $tokenFile }

Write-Host "`n=== PRUEBAS COMPLETADAS ===" -ForegroundColor Cyan
