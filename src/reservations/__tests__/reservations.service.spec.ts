import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ReservationsService } from '../reservations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AmieService } from '../../amie/amie.service';
import { EmailService } from '../../email/email.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prismaService: PrismaService;
  let amieService: AmieService;
  let emailService: EmailService;

  const mockPrismaService = {
    timeSlot: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reservation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      aggregate: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAmieService = {
    getSchoolNameByAmie: jest.fn(),
  };

  const mockEmailService = {
    sendReservationConfirmation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AmieService,
          useValue: mockAmieService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    amieService = module.get<AmieService>(AmieService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateReservationDto = {
      amie: '1234567890',
      schoolName: 'Colegio Test',
      coordinatorName: 'Juan Pérez',
      email: 'test@example.com',
      whatsapp: '0987654321',
      students: 50,
      dayId: 'day-1',
      slotId: 'slot-1',
    };

    it('debería crear una reserva exitosamente', async () => {
      // Mock del slot con evento
      mockPrismaService.timeSlot.findUnique.mockResolvedValueOnce({
        id: 'slot-1',
        eventId: 'day-1',
        event: { id: 'day-1' },
      });

      // Mock de la transacción
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          timeSlot: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'slot-1',
              capacity: 200,
            }),
          },
          reservation: {
            aggregate: jest.fn().mockResolvedValue({
              _sum: { students: 0 },
            }),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'reservation-1',
              ...createDto,
              status: 'pendiente',
              timestamp: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        };
        return callback(tx);
      });

      mockAmieService.getSchoolNameByAmie.mockResolvedValue('Colegio Test');
      mockPrismaService.event.findUnique.mockResolvedValue({
        id: 'day-1',
        date: new Date(),
      });
      mockPrismaService.timeSlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        timeStart: '09h00',
        timeEnd: '11h00',
      });
      mockEmailService.sendReservationConfirmation.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result).toHaveProperty('id');
      expect(result.amie).toBe(createDto.amie);
      expect(result.students).toBe(createDto.students);
      expect(mockAmieService.getSchoolNameByAmie).toHaveBeenCalledWith(createDto.amie);
    });

    it('debería lanzar error si el AMIE no existe', async () => {
      mockPrismaService.timeSlot.findUnique.mockResolvedValueOnce({
        id: 'slot-1',
        eventId: 'day-1',
        event: { id: 'day-1' },
      });

      mockAmieService.getSchoolNameByAmie.mockRejectedValue(
        new NotFoundException('AMIE no encontrado')
      );

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar error si no hay cupos suficientes', async () => {
      mockPrismaService.timeSlot.findUnique.mockResolvedValueOnce({
        id: 'slot-1',
        eventId: 'day-1',
        event: { id: 'day-1' },
      });

      mockAmieService.getSchoolNameByAmie.mockResolvedValue('Colegio Test');

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          timeSlot: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'slot-1',
              capacity: 200,
            }),
          },
          reservation: {
            aggregate: jest.fn().mockResolvedValue({
              _sum: { students: 180 },
            }),
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar error si ya existe una reserva con el mismo AMIE y slot', async () => {
      mockPrismaService.timeSlot.findUnique.mockResolvedValueOnce({
        id: 'slot-1',
        eventId: 'day-1',
        event: { id: 'day-1' },
      });

      mockAmieService.getSchoolNameByAmie.mockResolvedValue('Colegio Test');

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          timeSlot: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'slot-1',
              capacity: 200,
            }),
          },
          reservation: {
            aggregate: jest.fn().mockResolvedValue({
              _sum: { students: 0 },
            }),
            findFirst: jest.fn().mockResolvedValue({
              id: 'existing-reservation',
              amie: createDto.amie,
              slotId: createDto.slotId,
            }),
          },
        };
        return callback(tx);
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });
});
