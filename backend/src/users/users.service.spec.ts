import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('prevents an administrator from changing their own role', async () => {
    await expect(service.updateRole(7, 7, Role.CLIENT)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates another user role', async () => {
    prisma.user.update.mockResolvedValue({
      id: 8,
      role: Role.ADMIN,
    });

    await expect(service.updateRole(8, 7, Role.ADMIN)).resolves.toEqual({
      id: 8,
      role: Role.ADMIN,
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 8 },
        data: { role: Role.ADMIN },
      }),
    );
  });

  it('deletes the current account and relies on the database booking cascade', async () => {
    prisma.user.delete.mockResolvedValue({ id: 7 });

    await expect(service.deleteAccount(7)).resolves.toEqual({ success: true });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 7 } });
  });
});
