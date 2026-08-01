import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { ProfileModule } from '../profiles/profile.module';
import { ReviewController } from './controllers/review.controller';
import { ReviewService } from './services/review.service';

@Module({
  imports: [DatabaseModule, AuthModule, ProfileModule],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
