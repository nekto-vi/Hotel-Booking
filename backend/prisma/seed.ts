import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Создаем категории
  const catStandard = await prisma.category.upsert({
    where: { name: 'Стандарт' },
    update: {},
    create: { name: 'Стандарт', description: 'Уютный однокомнатный номер со всеми удобствами' },
  });

  const catDeluxe = await prisma.category.upsert({
    where: { name: 'Делюкс' },
    update: {},
    create: { name: 'Делюкс', description: 'Просторный улучшенный номер с панорамным видом' },
  });

  const catSuite = await prisma.category.upsert({
    where: { name: 'Люкс' },
    update: {},
    create: { name: 'Люкс', description: 'Двухкомнатные апартаменты премиум-класса' },
  });

  // 2. Создаем удобства
  const wifi = await prisma.amenity.upsert({ where: { name: 'Бесплатный Wi-Fi' }, update: {}, create: { name: 'Бесплатный Wi-Fi', icon: 'Wifi' } });
  const tv = await prisma.amenity.upsert({ where: { name: 'Smart TV' }, update: {}, create: { name: 'Smart TV', icon: 'Tv' } });
  const ac = await prisma.amenity.upsert({ where: { name: 'Кондиционер' }, update: {}, create: { name: 'Кондиционер', icon: 'Wind' } });
  const bar = await prisma.amenity.upsert({ where: { name: 'Мини-бар' }, update: {}, create: { name: 'Мини-бар', icon: 'Coffee' } });

  // 3. Создаем номера с красивыми фотографиями Unsplash
  const roomsData = [
    {
      roomNumber: '101',
      categoryId: catStandard.id,
      capacity: 2,
      pricePerNight: 120,
      images: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80',
    },
    {
      roomNumber: '102',
      categoryId: catStandard.id,
      capacity: 1,
      pricePerNight: 95,
      images: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    },
    {
      roomNumber: '201',
      categoryId: catDeluxe.id,
      capacity: 2,
      pricePerNight: 210,
      images: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    },
    {
      roomNumber: '301',
      categoryId: catSuite.id,
      capacity: 4,
      pricePerNight: 380,
      images: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
    },
  ];

  for (const r of roomsData) {
    const room = await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: {},
      create: {
        roomNumber: r.roomNumber,
        categoryId: r.categoryId,
        capacity: r.capacity,
        pricePerNight: r.pricePerNight,
        images: r.images,
      },
    });

    // привязываем Wi-Fi и TV к каждому
    await prisma.roomAmenity.upsert({
      where: { roomId_amenityId: { roomId: room.id, amenityId: wifi.id } },
      update: {},
      create: { roomId: room.id, amenityId: wifi.id },
    });
    await prisma.roomAmenity.upsert({
      where: { roomId_amenityId: { roomId: room.id, amenityId: tv.id } },
      update: {},
      create: { roomId: room.id, amenityId: tv.id },
    });
  }

  console.log('Seed успешно выполнен: добавлены категории, удобства и номера!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());