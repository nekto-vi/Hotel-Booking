import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingMealPlan, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

const bookingIncludes = {
  room: {
    include: {
      category: true,
      amenities: { include: { amenity: true } },
    },
  },
} satisfies Prisma.BookingInclude;

function toUtcDate(value: string): Date {
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBooking(userId: number, dto: CreateBookingDto) {
    const checkIn = toUtcDate(dto.checkIn);
    const checkOut = toUtcDate(dto.checkOut);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const nights =
      (checkOut.getTime() - checkIn.getTime()) / millisecondsPerDay;

    if (!Number.isInteger(nights) || nights <= 0) {
      throw new BadRequestException('checkOut must be later than checkIn');
    }

    const mealPlan = dto.mealPlan ?? BookingMealPlan.NO_MEALS;
    const mealGuests = dto.mealGuests ?? 1;

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const room = await transaction.room.findUnique({
            where: { id: dto.roomId },
          });

          if (!room) {
            throw new NotFoundException(`Room ${dto.roomId} not found`);
          }

          if (!room.isAvailable) {
            throw new ConflictException('Room is not available');
          }

          if (mealGuests > room.capacity) {
            throw new BadRequestException(
              'Meal guest count cannot exceed room capacity',
            );
          }

          const overlappingBooking = await transaction.booking.findFirst({
            where: {
              roomId: dto.roomId,
              status: { not: BookingStatus.CANCELLED },
              checkIn: { lt: checkOut },
              checkOut: { gt: checkIn },
            },
            select: { id: true },
          });

          if (overlappingBooking) {
            throw new ConflictException(
              'Room is already booked for these dates',
            );
          }

          const mealRatePerNight = {
            [BookingMealPlan.NO_MEALS]: new Prisma.Decimal(0),
            [BookingMealPlan.BREAKFAST_BUFFET]: new Prisma.Decimal(25),
            [BookingMealPlan.BREAKFAST_AND_DINNER]: new Prisma.Decimal(50),
            [BookingMealPlan.ALL_INCLUSIVE]: new Prisma.Decimal(80),
          }[mealPlan].mul(mealGuests);
          const nightlyTotal = new Prisma.Decimal(
            room.pricePerNight.toString(),
          ).add(mealRatePerNight);
          const totalPrice = nightlyTotal.mul(nights).toDecimalPlaces(2);

          return transaction.booking.create({
            data: {
              userId,
              roomId: dto.roomId,
              checkIn,
              checkOut,
              totalPrice,
              mealPlan,
              mealGuests,
              comment: dto.comment?.trim() || null,
              status: BookingStatus.CONFIRMED,
            },
            include: bookingIncludes,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException('Room is already booked for these dates');
      }

      throw error;
    }
  }

  getMyBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: bookingIncludes,
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelBooking(userId: number, bookingId: number) {
    return this.prisma.$transaction(async (transaction) => {
      const booking = await transaction.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, userId: true, checkIn: true },
      });

      if (!booking || booking.userId !== userId) {
        throw new NotFoundException(`Booking ${bookingId} not found`);
      }

      const today = toUtcDate(new Date().toISOString());
      if (booking.checkIn.getTime() <= today.getTime()) {
        throw new BadRequestException(
          'A booking cannot be cancelled on or after its check-in date',
        );
      }

      return transaction.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
        include: bookingIncludes,
      });
    });
  }

  getAllBookings() {
    return this.prisma.booking.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        ...bookingIncludes,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(bookingId: number, dto: UpdateBookingStatusDto) {
    if (dto.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Status can only be changed to CHECKED_IN, CHECKED_OUT, or CANCELLED',
      );
    }

    try {
      return await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: dto.status },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          ...bookingIncludes,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Booking ${bookingId} not found`);
      }

      throw error;
    }
  }
}
