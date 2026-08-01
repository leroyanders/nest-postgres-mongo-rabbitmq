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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import type { AuthUser } from '../../../shared/auth/types/auth-user';
import { ProfileService } from '../../profiles/services/profile.service';
import { AddCartItemDto } from '../dtos/add-cart-item.dto';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';
import { CartService } from '../services/cart.service';

@UseGuards(JwtAuthGuard)
@Controller('carts')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  async listMy(@CurrentUser() user: AuthUser) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.cartService.listMyCarts(profileId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  async addItem(@CurrentUser() user: AuthUser, @Body() dto: AddCartItemDto) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.cartService.addItem(profileId, dto);
  }

  @Patch('items/:itemId')
  async updateItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.cartService.updateItem(profileId, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    const profileId = await this.profileService.requireProfileId(user.id);
    await this.cartService.removeItem(profileId, itemId);
  }

  @Delete(':cartId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(
    @CurrentUser() user: AuthUser,
    @Param('cartId', ParseUUIDPipe) cartId: string,
  ): Promise<void> {
    const profileId = await this.profileService.requireProfileId(user.id);
    await this.cartService.clearCart(profileId, cartId);
  }
}
