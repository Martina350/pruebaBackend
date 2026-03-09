# Documentación Completa de la API

## Base URL
```
http://localhost:3000
```

## Autenticación

La mayoría de los endpoints requieren autenticación mediante JWT Bearer Token.

**Formato del header:**
```
Authorization: Bearer <token>
```

Para obtener un token, usar el endpoint `/auth/login`.

---

## Endpoints Públicos

### 1. Obtener Días y Horarios

**GET** `/api/events/days`

Obtiene todos los días disponibles con sus horarios y cupos disponibles.

**Respuesta exitosa (200):**
```json
[
  {
    "id": "1869dcb6-4394-416b-a76e-a0ccbad54ccf",
    "day": "Lunes 16 marzo",
    "slots": [
      {
        "id": "921749bb-28a7-4f4f-a9bc-99662c757b22",
        "time": "09h00 - 11h00",
        "capacity": 200,
        "available": 200
      },
      {
        "id": "bb6d6e02-b05b-4234-b818-bb298560a35b",
        "time": "11h00 - 13h00",
        "capacity": 200,
        "available": 200
      }
    ]
  }
]
```

---

### 2. Consultar AMIE

**GET** `/api/amie/:code`

Consulta una institución educativa por su código AMIE.

**Parámetros:**
- `code` (path, requerido): Código AMIE (8-10 caracteres alfanuméricos)

**Respuesta exitosa (200):**
```json
{
  "code": "1234567890",
  "name": "Nombre del Colegio"
}
```

**Errores:**
- `404 Not Found`: El código AMIE no existe en el sistema

**Ejemplo:**
```
GET /api/amie/1234567890
```

---

### 3. Crear Reserva

**POST** `/api/reservations`

Crea una nueva reserva para una institución educativa.

**Body (JSON):**
```json
{
  "amie": "1234567890",
  "schoolName": "Nombre del Colegio",
  "coordinatorName": "Juan Pérez",
  "coordinatorLastName": "García",
  "email": "coordinador@example.com",
  "whatsapp": "0987654321",
  "students": 50,
  "dayId": "1869dcb6-4394-416b-a76e-a0ccbad54ccf",
  "slotId": "921749bb-28a7-4f4f-a9bc-99662c757b22"
}
```

**Campos:**
- `amie` (string, requerido): Código AMIE (8-10 caracteres)
- `schoolName` (string, requerido): Nombre de la institución (max 255 caracteres)
- `coordinatorName` (string, requerido): Nombre completo del coordinador (max 100 caracteres)
- `coordinatorLastName` (string, opcional): Apellido del coordinador (max 100 caracteres)
- `email` (string, requerido): Email válido (max 255 caracteres)
- `whatsapp` (string, requerido): Número de WhatsApp (10 dígitos)
- `students` (number, requerido): Número de estudiantes (min: 1)
- `dayId` (string, requerido): ID del día del evento
- `slotId` (string, requerido): ID del horario

**Respuesta exitosa (201):**
```json
{
  "id": "reservation-uuid",
  "amie": "1234567890",
  "schoolName": "Nombre del Colegio",
  "coordinatorName": "Juan Pérez",
  "coordinatorLastName": "García",
  "email": "coordinador@example.com",
  "whatsapp": "0987654321",
  "students": 50,
  "dayId": "1869dcb6-4394-416b-a76e-a0ccbad54ccf",
  "slotId": "921749bb-28a7-4f4f-a9bc-99662c757b22",
  "status": "pendiente",
  "timestamp": "2026-03-16T10:00:00.000Z",
  "createdAt": "2026-03-16T10:00:00.000Z",
  "updatedAt": "2026-03-16T10:00:00.000Z",
  "emailSent": true
}
```

**Errores:**
- `400 Bad Request`: 
  - Datos inválidos (validación de DTOs)
  - Cupos insuficientes
  - Número de estudiantes <= 0
  - AMIE no válido
- `404 Not Found`: Día o horario no encontrado
- `409 Conflict`: Ya existe una reserva para este AMIE en este horario

---

## Autenticación

### 4. Login

**POST** `/auth/login`

Inicia sesión como administrador.

**Body (JSON):**
```json
{
  "email": "admin@globalmoneyweek.com",
  "password": "admin123"
}
```

**Respuesta exitosa (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "admin@globalmoneyweek.com",
    "role": "admin"
  }
}
```

**Errores:**
- `401 Unauthorized`: Credenciales inválidas

**Nota:** El token expira según la configuración `JWT_EXPIRES_IN` (por defecto: 1 hora).

---

## Endpoints Admin (Requieren Autenticación)

### 5. Listar Reservas

**GET** `/api/reservations`

Obtiene todas las reservas con filtros opcionales.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters (todos opcionales):**
- `dayId`: Filtrar por ID de día
- `slotId`: Filtrar por ID de horario
- `status`: Filtrar por estado (`pendiente`, `confirmada`, `cancelada`)
- `amie`: Buscar por código AMIE (búsqueda parcial, case-insensitive)

**Ejemplo:**
```
GET /api/reservations?status=confirmada&dayId=uuid
```

**Respuesta exitosa (200):**
```json
[
  {
    "id": "reservation-uuid",
    "amie": "1234567890",
    "schoolName": "Nombre del Colegio",
    "coordinatorName": "Juan Pérez",
    "email": "coordinador@example.com",
    "whatsapp": "0987654321",
    "students": 50,
    "dayId": "day-uuid",
    "slotId": "slot-uuid",
    "status": "pendiente",
    "timestamp": "2026-03-16T10:00:00.000Z",
    "createdAt": "2026-03-16T10:00:00.000Z",
    "updatedAt": "2026-03-16T10:00:00.000Z"
  }
]
```

**Errores:**
- `401 Unauthorized`: Token inválido o expirado

---

### 6. Obtener Reserva por ID

**GET** `/api/reservations/:id`

Obtiene los detalles de una reserva específica.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros:**
- `id` (path): ID de la reserva

**Respuesta exitosa (200):**
```json
{
  "id": "reservation-uuid",
  "amie": "1234567890",
  "schoolName": "Nombre del Colegio",
  ...
}
```

**Errores:**
- `401 Unauthorized`: Token inválido
- `404 Not Found`: Reserva no encontrada

---

### 7. Actualizar Reserva

**PATCH** `/api/reservations/:id`

Actualiza una reserva existente. Todos los campos son opcionales.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros:**
- `id` (path): ID de la reserva

**Body (JSON, todos los campos opcionales):**
```json
{
  "students": 60,
  "status": "confirmada",
  "dayId": "nuevo-dia-id",
  "slotId": "nuevo-slot-id",
  "email": "nuevo@example.com"
}
```

**Respuesta exitosa (200):**
```json
{
  "id": "reservation-uuid",
  "students": 60,
  "status": "confirmada",
  ...
}
```

**Errores:**
- `400 Bad Request`: Datos inválidos o cupos insuficientes
- `401 Unauthorized`: Token inválido
- `404 Not Found`: Reserva no encontrada

**Nota:** Si se cambia el número de estudiantes o el slot, se recalcularán automáticamente los cupos disponibles.

---

### 8. Eliminar Reserva

**DELETE** `/api/reservations/:id`

Elimina una reserva y devuelve los cupos al horario.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros:**
- `id` (path): ID de la reserva

**Respuesta exitosa (204):** Sin contenido

**Errores:**
- `401 Unauthorized`: Token inválido
- `404 Not Found`: Reserva no encontrada

---

### 9. Métricas Generales

**GET** `/api/metrics`

Obtiene métricas generales del sistema.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "totalSchools": 10,
  "totalStudents": 500,
  "totalCapacity": 1800,
  "occupancyRate": 27.78,
  "mostRequestedSlots": [
    {
      "slotId": "uuid",
      "time": "09h00 - 11h00",
      "day": "Lunes 16 marzo",
      "students": 150,
      "reservations": 5
    }
  ],
  "leastRequestedSlots": [...],
  "highestDemandDay": {
    "day": "Lunes 16 marzo",
    "students": 200
  }
}
```

---

### 10. Métricas por Día

**GET** `/api/metrics/days`

Obtiene métricas detalladas por cada día.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
[
  {
    "dayId": "uuid",
    "day": "Lunes 16 marzo",
    "totalSchools": 5,
    "totalStudents": 250,
    "capacity": 600,
    "occupancyRate": 41.67,
    "slots": [
      {
        "slotId": "uuid",
        "time": "09h00 - 11h00",
        "capacity": 200,
        "available": 150,
        "occupied": 50,
        "occupancyPercentage": 25.0
      }
    ]
  }
]
```

---

### 11. Métricas por Horario

**GET** `/api/metrics/slots`

Obtiene métricas detalladas por cada horario.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
[
  {
    "slotId": "uuid",
    "day": "Lunes 16 marzo",
    "time": "09h00 - 11h00",
    "capacity": 200,
    "available": 150,
    "occupied": 50,
    "schools": 3,
    "students": 50,
    "occupancyPercentage": 25.0
  }
]
```

---

### 12. Exportar Reporte

**GET** `/api/reports/export`

Exporta un reporte en formato Excel (XLSX) o CSV.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `format` (requerido): `xlsx` o `csv`
- `dayId` (opcional): Filtrar por día
- `slotId` (opcional): Filtrar por horario
- `status` (opcional): Filtrar por estado
- `amie` (opcional): Buscar por código AMIE

**Ejemplo:**
```
GET /api/reports/export?format=xlsx&status=confirmada
```

**Respuesta exitosa (200):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
- Content-Type: `text/csv; charset=utf-8` (CSV)
- Content-Disposition: `attachment; filename="reservas-2026-03-16.xlsx"`

**Errores:**
- `400 Bad Request`: Formato inválido
- `401 Unauthorized`: Token inválido

---

## Códigos de Estado HTTP

- `200 OK`: Solicitud exitosa
- `201 Created`: Recurso creado exitosamente
- `204 No Content`: Solicitud exitosa sin contenido
- `400 Bad Request`: Datos inválidos o error de validación
- `401 Unauthorized`: No autenticado o token inválido
- `403 Forbidden`: No tiene permisos (no usado actualmente)
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Conflicto (ej: reserva duplicada)
- `500 Internal Server Error`: Error interno del servidor

---

## Ejemplos de Uso

### Ejemplo 1: Crear una reserva

```bash
# 1. Obtener días disponibles
curl http://localhost:3000/api/events/days

# 2. Crear reserva
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "amie": "1234567890",
    "schoolName": "Colegio Ejemplo",
    "coordinatorName": "Juan Pérez",
    "email": "juan@example.com",
    "whatsapp": "0987654321",
    "students": 50,
    "dayId": "day-uuid",
    "slotId": "slot-uuid"
  }'
```

### Ejemplo 2: Obtener métricas (Admin)

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@globalmoneyweek.com","password":"admin123"}' \
  | jq -r '.access_token')

# 2. Obtener métricas
curl http://localhost:3000/api/metrics \
  -H "Authorization: Bearer $TOKEN"
```

### Ejemplo 3: Exportar reporte

```bash
curl http://localhost:3000/api/reports/export?format=xlsx \
  -H "Authorization: Bearer $TOKEN" \
  -o reporte.xlsx
```

---

## Notas Importantes

1. **Control de Concurrencia**: Las reservas usan transacciones atómicas para prevenir condiciones de carrera.

2. **Validaciones**: 
   - El AMIE debe existir en el sistema
   - No se permiten reservas duplicadas (mismo AMIE + mismo slot)
   - Los cupos se validan antes de crear la reserva

3. **Email**: Se envía un email de confirmación automáticamente al crear una reserva (si SMTP está configurado).

4. **Tokens JWT**: Los tokens expiran según `JWT_EXPIRES_IN`. Si un token expira, se debe hacer login nuevamente.

5. **CORS**: El servidor está configurado para aceptar peticiones desde `FRONTEND_URL` (por defecto: `http://localhost:5173`).
