import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    it('/auth/login (POST) - debería autenticar un usuario válido', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@globalmoneyweek.com',
          password: 'admin123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      authToken = response.body.access_token;
    });

    it('/auth/login (POST) - debería rechazar credenciales inválidas', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Events', () => {
    it('/api/events/days (GET) - debería retornar días y horarios', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/days')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('day');
        expect(response.body[0]).toHaveProperty('slots');
        expect(Array.isArray(response.body[0].slots)).toBe(true);
      }
    });
  });

  describe('Reservations', () => {
    let dayId: string;
    let slotId: string;

    beforeAll(async () => {
      // Obtener un día y slot válidos
      const eventsResponse = await request(app.getHttpServer())
        .get('/api/events/days');

      if (eventsResponse.body.length > 0) {
        dayId = eventsResponse.body[0].id;
        if (eventsResponse.body[0].slots.length > 0) {
          slotId = eventsResponse.body[0].slots[0].id;
        }
      }
    });

    it('/api/reservations (POST) - debería crear una reserva', async () => {
      if (!dayId || !slotId) {
        console.warn('No hay días/slots disponibles para probar');
        return;
      }

      const reservationData = {
        amie: `TEST${Date.now()}`,
        schoolName: 'Colegio de Prueba E2E',
        coordinatorName: 'Test User',
        email: 'test@example.com',
        whatsapp: '0987654321',
        students: 10,
        dayId,
        slotId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/reservations')
        .send(reservationData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.amie).toBe(reservationData.amie);
    });

    it('/api/reservations (POST) - debería rechazar datos inválidos', async () => {
      await request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          amie: '',
          students: -1,
        })
        .expect(400);
    });
  });

  describe('Metrics (Admin)', () => {
    it('/api/metrics (GET) - debería requerir autenticación', async () => {
      await request(app.getHttpServer())
        .get('/api/metrics')
        .expect(401);
    });

    it('/api/metrics (GET) - debería retornar métricas con token válido', async () => {
      if (!authToken) {
        // Obtener token si no existe
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'admin@globalmoneyweek.com',
            password: 'admin123',
          });
        authToken = loginResponse.body.access_token;
      }

      const response = await request(app.getHttpServer())
        .get('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSchools');
      expect(response.body).toHaveProperty('totalStudents');
      expect(response.body).toHaveProperty('totalCapacity');
      expect(response.body).toHaveProperty('occupancyRate');
    });
  });
});
