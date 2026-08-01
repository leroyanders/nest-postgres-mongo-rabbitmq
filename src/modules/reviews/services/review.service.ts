import { Injectable } from '@nestjs/common';
import {
  DEFAULT_PAGE_SIZE,
  PaginationQueryDto,
} from '../../../common/dtos/pagination-query.dto';
import { PrismaService } from '../../../database/services/prisma.service';
import { OrderStatus } from '../../../generated/prisma/enums';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { UpdateReviewDto } from '../dtos/update-review.dto';
import { ReviewNotAllowedError } from '../errors/review-not-allowed.error';

const REVIEW_SELECT = {
  id: true,
  rating: true,
  title: true,
  comment: true,
  images: true,
  isPublished: true,
  productId: true,
  orderItemId: true,
  createdAt: true,
  updatedAt: true,
  profile: { select: { id: true, name: true, username: true, avatar: true } },
} as const;

const REVIEWABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  listProductReviews(productId: string, pagination: PaginationQueryDto) {
    return this.prisma.review.findMany({
      select: REVIEW_SELECT,
      where: { productId, isPublished: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: pagination.take ?? DEFAULT_PAGE_SIZE,
      skip: pagination.skip ?? 0,
    });
  }

  listMyReviews(profileId: string, pagination: PaginationQueryDto) {
    return this.prisma.review.findMany({
      select: REVIEW_SELECT,
      where: { profileId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: pagination.take ?? DEFAULT_PAGE_SIZE,
      skip: pagination.skip ?? 0,
    });
  }

  /**
   * A review is allowed only for an order item of the reviewer's own order
   * that has been delivered or completed. One review per product per
   * profile is enforced by the unique constraint in the database.
   */
  async createReview(profileId: string, dto: CreateReviewDto) {
    const orderItem = await this.prisma.orderItem.findFirstOrThrow({
      select: {
        id: true,
        productId: true,
        order: { select: { status: true } },
      },
      where: { id: dto.orderItemId, order: { profileId } },
    });

    if (
      !orderItem.productId ||
      !REVIEWABLE_ORDER_STATUSES.includes(orderItem.order.status)
    ) {
      throw new ReviewNotAllowedError();
    }

    return this.prisma.review.create({
      select: REVIEW_SELECT,
      data: {
        profileId,
        productId: orderItem.productId,
        orderItemId: orderItem.id,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        images: dto.images ?? [],
      },
    });
  }

  updateReview(profileId: string, reviewId: string, dto: UpdateReviewDto) {
    return this.prisma.review.update({
      select: REVIEW_SELECT,
      where: { id: reviewId, profileId, deletedAt: null },
      data: {
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        images: dto.images,
      },
    });
  }

  async deleteReview(profileId: string, reviewId: string): Promise<void> {
    await this.prisma.review.update({
      select: { id: true },
      where: { id: reviewId, profileId, deletedAt: null },
      data: { isPublished: false, deletedAt: new Date() },
    });
  }
}
