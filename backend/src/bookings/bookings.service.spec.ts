import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { BookingMealPlan, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let service: BookingsService;
  const transaction = {
    room: { findUnique: jest.fn() },
    booking: { findFirst: jest.fn(), create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    booking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a confirmed booking and calculates its total price', async () => {
    transaction.room.findUnique.mockResolvedValue({
      id: 8,
      isAvailable: true,
      pricePerNight: new Prisma.Decimal('125.50'),
    });
    transaction.booking.findFirst.mockResolvedValue(null);
    transaction.booking.create.mockResolvedValue({ id: 11 });

    await expect(
      service.createBooking(4, {
        roomId: 8,
        checkIn: '2026-12-10',
        checkOut: '2026-12-13',
        mealPlan: BookingMealPlan.NO_MEALS,
        mealGuests: 1,
        comment: 'Late arrival',
        totalPrice: 1,
      }),
    ).resolves.toEqual({ id: 11 });

    expect(transaction.booking.findFirst).toHaveBeenCalledWith({
      where: {
        roomId: 8,
        status: { not: BookingStatus.CANCELLED },
        checkIn: { lt: new Date('2026-12-13T00:00:00.000Z') },
        checkOut: { gt: new Date('2026-12-10T00:00:00.000Z') },
      },
      select: { id: true },
    });
    expect(transaction.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 4,
          roomId: 8,
          checkIn: new Date('2026-12-10T00:00:00.000Z'),
          checkOut: new Date('2026-12-13T00:00:00.000Z'),
          totalPrice: new Prisma.Decimal('376.50'),
          mealPlan: BookingMealPlan.NO_MEALS,
          mealGuests: 1,
          comment: 'Late arrival',
          status: BookingStatus.CONFIRMED,
        }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('rejects a booking when the room has an overlapping reservation', async () => {
    transaction.room.findUnique.mockResolvedValue({
      id: 8,
      isAvailable: true,
      pricePerNight: new Prisma.Decimal('125.50'),
    });
    transaction.booking.findFirst.mockResolvedValue({ id: 10 });

    await expect(
      service.createBooking(4, {
        roomId: 8,
        checkIn: '2026-12-10',
        checkOut: '2026-12-13',
        mealPlan: BookingMealPlan.NO_MEALS,
        mealGuests: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transaction.booking.create).not.toHaveBeenCalled();
  });

  it('calculates buffet breakfast per guest instead of trusting client total', async () => {
    transaction.room.findUnique.mockResolvedValue({
      id: 8,
      capacity: 3,
      isAvailable: true,
      pricePerNight: new Prisma.Decimal('100.00'),
    });
    transaction.booking.findFirst.mockResolvedValue(null);
    transaction.booking.create.mockResolvedValue({ id: 12 });

    await service.createBooking(4, {
      roomId: 8,
      checkIn: '2026-12-10',
      checkOut: '2026-12-12',
      mealPlan: BookingMealPlan.BREAKFAST_BUFFET,
      mealGuests: 2,
      totalPrice: 1,
    });

    expect(transaction.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalPrice: new Prisma.Decimal('300.00'),
          mealPlan: BookingMealPlan.BREAKFAST_BUFFET,
          mealGuests: 2,
        }),
      }),
    );
  });

  it('calculates every meal plan per guest and per night', async () => {
    transaction.room.findUnique.mockResolvedValue({
      id: 8,
      capacity: 4,
      isAvailable: true,
      pricePerNight: new Prisma.Decimal('100.00'),
    });
    transaction.booking.findFirst.mockResolvedValue(null);
    transaction.booking.create.mockResolvedValue({ id: 13 });

    await service.createBooking(4, {
      roomId: 8,
      checkIn: '2026-12-10',
      checkOut: '2026-12-11',
      mealPlan: BookingMealPlan.ALL_INCLUSIVE,
      mealGuests: 4,
      totalPrice: 1,
    });

    expect(transaction.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalPrice: new Prisma.Decimal('420.00'),
          mealPlan: BookingMealPlan.ALL_INCLUSIVE,
          mealGuests: 4,
        }),
      }),
    );
  });
});
