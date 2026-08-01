import {
  Body,
  Controller,
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
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import type { IAuthUser } from '../../../shared/auth/types/auth-user';
import { ProfileService } from '../../profiles/services/profile.service';
import { CancelOrderDto } from '../dtos/cancel-order.dto';
import { CheckoutDto } from '../dtos/checkout.dto';
import { ListOrdersQueryDto } from '../dtos/list-orders-query.dto';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto';
import { OrderService } from '../services/order.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly profileService: ProfileService,
  ) {}

  // ---------------------------------------------------------------
  // Buyer side
  // ---------------------------------------------------------------

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@CurrentUser() user: IAuthUser, @Body() dto: CheckoutDto) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.orderService.checkout(user.id, profileId, dto);
  }

  @Get('my')
  async listMy(
    @CurrentUser() user: IAuthUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.orderService.listMyOrders(profileId, query);
  }

  @Get('my/:id')
  async getMy(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.orderService.getMyOrder(profileId, id);
  }

  @Post('my/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelMy(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.orderService.cancelMyOrder(user.id, profileId, id, dto.reason);
  }

  @Post('my/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeMy(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.orderService.completeMyOrder(user.id, profileId, id);
  }

  // ---------------------------------------------------------------
  // Store owner side
  // ---------------------------------------------------------------

  @Get('store/:storeId')
  listStoreOrders(
    @CurrentUser() user: IAuthUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.orderService.listStoreOrders(user.id, storeId, query);
  }

  @Get('managed/:id')
  getStoreOrder(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orderService.getStoreOrder(user.id, id);
  }

  @Patch('managed/:id/status')
  changeStatus(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.changeStoreOrderStatus(user.id, id, dto);
  }
}
