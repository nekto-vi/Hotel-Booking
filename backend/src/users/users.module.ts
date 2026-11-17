import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersMeController } from './users-me.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, UsersMeController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
