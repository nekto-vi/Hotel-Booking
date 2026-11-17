import { Type } from 'class-transformer';
import { BookingMealPlan } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId: number;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsOptional()
  @IsEnum(BookingMealPlan)
  mealPlan?: BookingMealPlan;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mealGuests?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  totalPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
