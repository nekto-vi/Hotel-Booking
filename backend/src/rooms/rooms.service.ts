import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { FilterRoomsDto } from './dto/filter-rooms.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

const roomIncludes = {
  category: true,
  amenities: { include: { amenity: true } },
} satisfies Prisma.RoomInclude;

const standardAmenities = [
  { name: 'Wi-Fi', icon: 'wifi' },
  { name: 'Smart TV', icon: 'tv' },
  { name: 'Кондиционер', icon: 'air-conditioning' },
  { name: 'Балкон', icon: 'balcony' },
  { name: 'Фен', icon: 'hair-dryer' },
  { name: 'Ванна', icon: 'bath' },
  { name: 'Утюг', icon: 'iron' },
  { name: 'Чайник', icon: 'kettle' },
];
const roomHasBookingsMessage =
  'Невозможно удалить номер, так как к нему привязаны бронирования. Сделайте номер недоступным (на ремонте) или отмените брони';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  findCategories() {
    return this.prisma.category.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAmenities() {
    await Promise.all(
      standardAmenities.map((amenity) =>
        this.prisma.amenity.upsert({
          where: { name: amenity.name },
          create: amenity,
          update: {},
        }),
      ),
    );

    return this.prisma.amenity.findMany({
      where: { name: { in: standardAmenities.map(({ name }) => name) } },
      orderBy: { id: 'asc' },
    });
  }

  async findAll(filters: FilterRoomsDto) {
    const { checkIn, checkOut, capacity, categoryId, minPrice, maxPrice } =
      filters;

    if (Boolean(checkIn) !== Boolean(checkOut)) {
      throw new BadRequestException(
        'checkIn and checkOut must be provided together',
      );
    }

    const targetCheckIn = checkIn ? new Date(checkIn) : undefined;
    const targetCheckOut = checkOut ? new Date(checkOut) : undefined;

    if (
      targetCheckIn &&
      targetCheckOut &&
      targetCheckIn.getTime() >= targetCheckOut.getTime()
    ) {
      throw new BadRequestException('checkOut must be later than checkIn');
    }

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new BadRequestException('minPrice must not exceed maxPrice');
    }

    const where: Prisma.RoomWhereInput = {
      ...(capacity !== undefined ? { capacity: { gte: capacity } } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            pricePerNight: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
    };

    const rooms = await this.prisma.room.findMany({
      where,
      include: {
        ...roomIncludes,
        bookings: {
          where: {
            status: {
              in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
            },
            ...(targetCheckIn && targetCheckOut
              ? {
                  checkIn: { lt: targetCheckOut },
                  checkOut: { gt: targetCheckIn },
                }
              : { id: -1 }),
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    return rooms.map(({ bookings, ...room }) => ({
      ...room,
      isBookedForDates: bookings.length > 0,
    }));
  }

  async findOne(id: number) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: roomIncludes,
    });

    if (!room) {
      throw new NotFoundException(`Room ${id} not found`);
    }

    return room;
  }

  async create(dto: CreateRoomDto) {
    const { amenityIds = [], ...roomData } = dto;

    return this.prisma.room.create({
      data: {
        ...roomData,
        amenities: {
          create: amenityIds.map((id) => ({
            amenity: { connect: { id } },
          })),
        },
      },
      include: roomIncludes,
    });
  }

  async update(id: number, dto: UpdateRoomDto) {
    const { amenityIds, ...roomData } = dto;

    try {
      return await this.prisma.room.update({
        where: { id },
        data: {
          ...roomData,
          ...(amenityIds !== undefined
            ? {
                amenities: {
                  deleteMany: {},
                  create: amenityIds.map((amenityId) => ({
                    amenity: { connect: { id: amenityId } },
                  })),
                },
              }
            : {}),
        },
        include: roomIncludes,
      });
    } catch (error) {
      this.throwIfRoomNotFound(error, id);
      throw error;
    }
  }

  async remove(id: number) {
    const bookingCount = await this.prisma.booking.count({
      where: { roomId: id },
    });

    if (bookingCount > 0) {
      throw new BadRequestException(roomHasBookingsMessage);
    }

    try {
      return await this.prisma.room.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(roomHasBookingsMessage);
      }

      this.throwIfRoomNotFound(error, id);
      throw error;
    }
  }

  private throwIfRoomNotFound(error: unknown, id: number): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(`Room ${id} not found`);
    }
  }
}
