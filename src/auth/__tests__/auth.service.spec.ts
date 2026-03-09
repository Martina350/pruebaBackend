import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('debería retornar el usuario si el ID existe', async () => {
      const userId = 'user-1';
      const email = 'admin@globalmoneyweek.com';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        role: 'admin',
      });

      const result = await service.validateUser(userId);

      expect(result).toBeDefined();
      expect(result.email).toBe(email);
      expect(result.role).toBe('admin');
    });

    it('debería retornar null si el usuario no existe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('debería retornar un token y el usuario si las credenciales son válidas', async () => {
      const email = 'admin@globalmoneyweek.com';
      const password = 'admin123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockToken = 'mock-jwt-token';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email,
        passwordHash: hashedPassword,
        role: 'admin',
      });

      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login({ email, password });

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe(mockToken);
      expect(result.user.email).toBe(email);
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('debería lanzar UnauthorizedException si las credenciales son inválidas', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
