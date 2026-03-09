// IMPORTANTE: Cargar dotenv ANTES de importar PrismaClient
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Verificar que DATABASE_URL esté disponible
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL no está definida en el archivo .env');
  console.error('Por favor, crea un archivo .env con DATABASE_URL configurada.');
  console.error('Ejemplo: DATABASE_URL="postgresql://user:password@localhost:5432/horarios_feria?schema=public"');
  process.exit(1);
}

console.log('✅ DATABASE_URL cargada correctamente');

// Prisma 7: Requiere usar un adapter
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  // Conectar explícitamente con la URL
  await prisma.$connect();
  console.log('🌱 Iniciando seed...');

  // Crear usuario admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@globalmoneyweek.com' },
    update: {},
    create: {
      email: 'admin@globalmoneyweek.com',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });
  console.log('✅ Usuario admin creado:', admin.email);

  // Crear eventos con horarios
  // Usar Date.UTC para crear fechas en UTC y evitar problemas de zona horaria
  const events = [
    {
      name: 'Global Money Week 2026',
      date: new Date(Date.UTC(2026, 2, 16)), // Marzo es mes 2 (0-indexed), día 16
      slots: [
        { timeStart: '09h00', timeEnd: '11h00', capacity: 200 },
        { timeStart: '11h00', timeEnd: '13h00', capacity: 200 },
        { timeStart: '13h00', timeEnd: '15h00', capacity: 200 },
      ],
    },
    {
      name: 'Global Money Week 2026',
      date: new Date(Date.UTC(2026, 2, 17)), // Marzo es mes 2 (0-indexed), día 17
      slots: [
        { timeStart: '09h00', timeEnd: '11h00', capacity: 200 },
        { timeStart: '11h00', timeEnd: '13h00', capacity: 200 },
        { timeStart: '13h00', timeEnd: '15h00', capacity: 200 },
      ],
    },
    {
      name: 'Global Money Week 2026',
      date: new Date(Date.UTC(2026, 2, 18)), // Marzo es mes 2 (0-indexed), día 18
      slots: [
        { timeStart: '09h00', timeEnd: '11h00', capacity: 200 },
        { timeStart: '11h00', timeEnd: '13h00', capacity: 200 },
        { timeStart: '13h00', timeEnd: '15h00', capacity: 200 },
      ],
    },
  ];

  // Limpiar eventos existentes
  await prisma.reservation.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.event.deleteMany();

  for (const eventData of events) {
    // Verificar si el evento ya existe por fecha
    const existingEvent = await prisma.event.findFirst({
      where: {
        date: eventData.date,
      },
    });

    if (existingEvent) {
      console.log(`⏭️  Evento ya existe: ${eventData.date.toISOString().split('T')[0]}`);
      continue;
    }

    const event = await prisma.event.create({
      data: {
        name: eventData.name,
        date: eventData.date,
        timeSlots: {
          create: eventData.slots.map((slot) => ({
            timeStart: slot.timeStart,
            timeEnd: slot.timeEnd,
            capacity: slot.capacity,
            available: slot.capacity,
          })),
        },
      },
      include: {
        timeSlots: true,
      },
    });
    console.log(`✅ Evento creado: ${event.name} - ${event.date.toISOString().split('T')[0]}`);
  }

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
