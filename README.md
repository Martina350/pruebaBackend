# Backend - Horarios Feria

Backend desarrollado con NestJS, Prisma y PostgreSQL para el sistema de reservas de Global Money Week.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/horarios_feria?schema=public"
JWT_SECRET=tu-secret-key-seguro-min-32-caracteres
JWT_EXPIRES_IN=1h
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@globalmoneyweek.com
SMTP_FROM_NAME=Global Money Week
```

3. Generar Prisma Client:
```bash
npm run prisma:generate
```

4. Ejecutar migraciones:
```bash
npm run prisma:migrate
```

5. Ejecutar seed (datos iniciales):
```bash
npm run prisma:seed
```

6. Iniciar servidor:
```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

## 📋 Scripts Disponibles

- `npm run build` - Compilar proyecto
- `npm run start` - Iniciar en producción
- `npm run start:dev` - Iniciar en modo desarrollo (watch)
- `npm run start:debug` - Iniciar en modo debug
- `npm run prisma:generate` - Generar Prisma Client
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:studio` - Abrir Prisma Studio
- `npm run prisma:seed` - Ejecutar seed
- `npm test` - Ejecutar tests unitarios
- `npm run test:watch` - Ejecutar tests en modo watch
- `npm run test:cov` - Ejecutar tests con cobertura
- `npm run test:e2e` - Ejecutar tests end-to-end

## 🔐 Credenciales por Defecto

**Usuario Admin:**
- Email: `admin@globalmoneyweek.com`
- Password: `admin123`

⚠️ **IMPORTANTE:** Cambiar estas credenciales en producción.

## 📡 API Endpoints

### Públicos (Sin autenticación)

#### `GET /api/events/days`
Obtiene todos los días disponibles con sus horarios y cupos.

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "day": "Lunes 16 marzo",
    "slots": [
      {
        "id": "uuid",
        "time": "09h00 - 11h00",
        "capacity": 200,
        "available": 150
      }
    ]
  }
]
```

#### `GET /api/amie/:code`
Consulta una institución por código AMIE.

**Parámetros:**
- `code` (path): Código AMIE (8-10 caracteres alfanuméricos)

**Respuesta (200):**
```json
{
  "code": "1234567890",
  "name": "Nombre del Colegio"
}
```

**Errores:**
- `404`: AMIE no encontrado

#### `POST /api/reservations`
Crea una nueva reserva.

**Body:**
```json
{
  "amie": "1234567890",
  "schoolName": "Nombre del Colegio",
  "coordinatorName": "Juan Pérez",
  "email": "coordinador@example.com",
  "whatsapp": "0987654321",
  "students": 50,
  "dayId": "uuid-del-dia",
  "slotId": "uuid-del-slot"
}
```

**Respuesta (201):**
```json
{
  "id": "uuid",
  "amie": "1234567890",
  "schoolName": "Nombre del Colegio",
  "coordinatorName": "Juan Pérez",
  "email": "coordinador@example.com",
  "whatsapp": "0987654321",
  "students": 50,
  "dayId": "uuid",
  "slotId": "uuid",
  "status": "pendiente",
  "timestamp": "2026-03-16T10:00:00.000Z",
  "emailSent": true
}
```

**Errores:**
- `400`: Datos inválidos, cupos insuficientes, estudiantes <= 0
- `404`: Día o horario no encontrado
- `409`: Ya existe una reserva para este AMIE en este horario

### Autenticación

#### `POST /auth/login`
Inicia sesión como administrador.

**Body:**
```json
{
  "email": "admin@globalmoneyweek.com",
  "password": "admin123"
}
```

**Respuesta (200):**
```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "admin@globalmoneyweek.com",
    "role": "admin"
  }
}
```

**Errores:**
- `401`: Credenciales inválidas

### Admin (Requieren JWT Bearer Token)

#### `GET /api/reservations`
Obtiene todas las reservas con filtros opcionales.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Params (opcionales):**
- `dayId`: Filtrar por día
- `slotId`: Filtrar por horario
- `status`: Filtrar por estado (pendiente, confirmada, cancelada)
- `amie`: Buscar por código AMIE

**Respuesta (200):**
```json
[
  {
    "id": "uuid",
    "amie": "1234567890",
    "schoolName": "Nombre del Colegio",
    "coordinatorName": "Juan Pérez",
    "email": "coordinador@example.com",
    "whatsapp": "0987654321",
    "students": 50,
    "dayId": "uuid",
    "slotId": "uuid",
    "status": "pendiente",
    "timestamp": "2026-03-16T10:00:00.000Z"
  }
]
```

#### `GET /api/reservations/:id`
Obtiene una reserva específica por ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
{
  "id": "uuid",
  "amie": "1234567890",
  "schoolName": "Nombre del Colegio",
  ...
}
```

**Errores:**
- `404`: Reserva no encontrada

#### `PATCH /api/reservations/:id`
Actualiza una reserva existente.

**Headers:**
```
Authorization: Bearer <token>
```

**Body (campos opcionales):**
```json
{
  "students": 60,
  "status": "confirmada",
  "dayId": "nuevo-dia-id",
  "slotId": "nuevo-slot-id"
}
```

**Respuesta (200):**
```json
{
  "id": "uuid",
  "students": 60,
  "status": "confirmada",
  ...
}
```

**Errores:**
- `400`: Datos inválidos o cupos insuficientes
- `404`: Reserva no encontrada

#### `DELETE /api/reservations/:id`
Elimina una reserva.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta (204):** Sin contenido

**Errores:**
- `404`: Reserva no encontrada

#### `GET /api/metrics`
Obtiene métricas generales del sistema.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
{
  "totalSchools": 10,
  "totalStudents": 500,
  "totalCapacity": 1800,
  "occupancyRate": 27.78,
  "mostRequestedSlots": [...],
  "leastRequestedSlots": [...],
  "highestDemandDay": {
    "day": "Lunes 16 marzo",
    "students": 200
  }
}
```

#### `GET /api/metrics/days`
Obtiene métricas por día.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
[
  {
    "dayId": "uuid",
    "day": "Lunes 16 marzo",
    "totalSchools": 5,
    "totalStudents": 250,
    "capacity": 600,
    "occupancyRate": 41.67,
    "slots": [...]
  }
]
```

#### `GET /api/metrics/slots`
Obtiene métricas por horario.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta (200):**
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

#### `GET /api/reports/export`
Exporta un reporte en formato Excel o CSV.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Params:**
- `format` (requerido): `xlsx` o `csv`
- `dayId` (opcional): Filtrar por día
- `slotId` (opcional): Filtrar por horario
- `status` (opcional): Filtrar por estado
- `amie` (opcional): Buscar por código AMIE

**Respuesta (200):** Archivo binario (Excel o CSV)

**Ejemplo:**
```
GET /api/reports/export?format=xlsx&status=confirmada
```

## 🏗️ Estructura del Proyecto

```
src/
├── auth/              # Módulo de autenticación
│   ├── guards/        # Guards de autenticación y roles
│   ├── strategies/    # Estrategia JWT
│   └── dto/           # DTOs de autenticación
├── events/             # Módulo de eventos
├── amie/               # Módulo de consulta AMIE
├── reservations/       # Módulo de reservas
│   ├── dto/           # DTOs de reservas
│   └── validators/     # Validadores personalizados
├── metrics/            # Módulo de métricas
├── reports/            # Módulo de reportes
├── email/              # Módulo de email
├── prisma/             # Prisma Service
└── common/             # Utilidades compartidas
    ├── decorators/     # Decoradores personalizados
    ├── filters/        # Exception filters
    └── interceptors/   # Interceptors
```

## 🗄️ Base de Datos

El proyecto usa Prisma como ORM. Los modelos están definidos en `prisma/schema.prisma`.

### Modelos Principales:

- **User**: Usuarios administradores
  - `id`, `email`, `passwordHash`, `role`, `createdAt`, `updatedAt`

- **Event**: Eventos (días de la feria)
  - `id`, `name`, `date`, `createdAt`, `updatedAt`

- **TimeSlot**: Horarios disponibles
  - `id`, `eventId`, `timeStart`, `timeEnd`, `capacity`, `available`, `createdAt`, `updatedAt`

- **Reservation**: Reservas de instituciones
  - `id`, `amie`, `schoolName`, `coordinatorName`, `coordinatorLastName`, `email`, `whatsapp`, `students`, `dayId`, `slotId`, `status`, `timestamp`, `createdAt`, `updatedAt`

## 🧪 Testing

### Tests Unitarios
```bash
npm test
```

Tests para servicios críticos:
- `ReservationsService` - Validaciones, control de concurrencia
- `AuthService` - Autenticación y validación de usuarios

### Tests End-to-End
```bash
npm run test:e2e
```

Tests de integración para endpoints principales.

### Cobertura
```bash
npm run test:cov
```

## 🔧 Tecnologías

- **NestJS** - Framework Node.js
- **Prisma** - ORM
- **PostgreSQL** - Base de datos
- **JWT** - Autenticación
- **bcrypt** - Hash de contraseñas
- **class-validator** - Validación de DTOs
- **Nodemailer** - Envío de emails
- **Handlebars** - Templates de email
- **XLSX** - Generación de reportes Excel

## 🔒 Seguridad

- Autenticación JWT con tokens expirables
- Hash de contraseñas con bcrypt
- Validación de DTOs con class-validator
- Control de concurrencia con transacciones atómicas
- CORS configurado para el frontend
- Guards para proteger rutas admin

## 📝 Notas de Desarrollo

### Control de Concurrencia

Las reservas usan transacciones con nivel de aislamiento `Serializable` para prevenir condiciones de carrera al actualizar cupos disponibles.

### Validaciones Críticas

- Verificación de cupos disponibles antes de crear reserva
- Validación de AMIE único por slot
- Validación de estudiantes > 0
- Validación de email válido
- Verificación de existencia de día y slot

### Email

El envío de emails se realiza fuera de la transacción para no bloquear la creación de reservas si falla el servicio de email.

## 🐛 Troubleshooting

### Error: DATABASE_URL no está definida
Asegúrate de tener un archivo `.env` con la variable `DATABASE_URL` configurada.

### Error: PrismaClientInitializationError
Verifica que PostgreSQL esté corriendo y que la URL de conexión sea correcta.

### Error: JWT_SECRET no está definida
Configura `JWT_SECRET` en el archivo `.env` con una clave segura de al menos 32 caracteres.

## 📄 LicenciaISC
