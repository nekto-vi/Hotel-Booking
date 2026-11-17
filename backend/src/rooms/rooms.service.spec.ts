import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let prisma: {
    room: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    booking: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      room: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      booking: { count: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns rooms with overlapping non-cancelled booking state', async () => {
    prisma.room.findMany.mockResolvedValue([
      { id: 1, bookings: [{ id: 1 }] },
      { id: 2, bookings: [] },
    ]);

    await expect(service.findAll({
      checkIn: '2026-12-10',
      checkOut: '2026-12-15',
      capacity: 2,
      categoryId: 3,
      minPrice: 50,
      maxPrice: 200,
    })).resolves.toEqual([
      { id: 1, isBookedForDates: true },
      { id: 2, isBookedForDates: false },
    ]);

    expect(prisma.room.findMany).toHaveBeenCalledWith({
      where: {
        capacity: { gte: 2 },
        categoryId: 3,
        pricePerNight: { gte: 50, lte: 200 },
      },
      include: {
        category: true,
        amenities: { include: { amenity: true } },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            checkIn: { lt: new Date('2026-12-15') },
            checkOut: { gt: new Date('2026-12-10') },
          },
          select: { id: true },
          take: 1,
        },
      },
    });
  });

  it('rejects deleting a room with bookings without deleting it', async () => {
    prisma.booking.count.mockResolvedValue(1);

    await expect(service.remove(4)).rejects.toThrow(
      'Невозможно удалить номер, так как к нему привязаны бронирования. Сделайте номер недоступным (на ремонте) или отмените брони',
    );

    expect(prisma.booking.count).toHaveBeenCalledWith({
      where: { roomId: 4 },
    });
    expect(prisma.room.delete).not.toHaveBeenCalled();
  });

  it('creates room amenity relations from amenityIds', async () => {
    prisma.room.create.mockResolvedValue({});

    await service.create({
      roomNumber: '101',
      categoryId: 1,
      capacity: 2,
      pricePerNight: 100,
      amenityIds: [4, 7],
    });

    expect(prisma.room.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amenities: {
            create: [
              { amenity: { connect: { id: 4 } } },
              { amenity: { connect: { id: 7 } } },
            ],
          },
        }),
      }),
    );
  });
});
