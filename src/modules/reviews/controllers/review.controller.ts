import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../common/dtos/pagination-query.dto';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import type { IAuthUser } from '../../../shared/auth/types/auth-user';
import { ProfileService } from '../../profiles/services/profile.service';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { UpdateReviewDto } from '../dtos/update-review.dto';
import { ReviewService } from '../services/review.service';

@Controller('reviews')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly profileService: ProfileService,
  ) {}

  @Get('product/:productId')
  listForProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.reviewService.listProductReviews(productId, pagination);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async listMy(
    @CurrentUser() user: IAuthUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.reviewService.listMyReviews(profileId, pagination);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: IAuthUser, @Body() dto: CreateReviewDto) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.reviewService.createReview(profileId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.reviewService.updateReview(profileId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const profileId = await this.profileService.requireProfileId(user.id);
    await this.reviewService.deleteReview(profileId, id);
  }
}
