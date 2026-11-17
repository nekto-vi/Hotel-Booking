import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the editable profile fields for the authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'guest@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+375 29 123-45-67',
      role: 'CLIENT',
    });

    await expect(service.getProfile(7)).resolves.toMatchObject({
      sub: 7,
      email: 'guest@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+375 29 123-45-67',
    });
  });

  it('updates and returns the authenticated user profile', async () => {
    prisma.user.update.mockResolvedValue({
      id: 7,
      email: 'guest@example.com',
      firstName: 'Grace',
      lastName: 'Hopper',
      phone: '+375 29 123-45-67',
      role: 'CLIENT',
    });

    await expect(
      service.updateProfile(7, { firstName: ' Grace ' }),
    ).resolves.toMatchObject({
      sub: 7,
      firstName: 'Grace',
      lastName: 'Hopper',
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { firstName: 'Grace' },
      }),
    );
  });
});
