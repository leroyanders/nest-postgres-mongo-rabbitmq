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
import type { IAuthUser } from '../../../shared/auth/types/auth-user';
import { CreateStoreDto } from '../dtos/create-store.dto';
import { UpdateStoreDto } from '../dtos/update-store.dto';
import { UpdateStoreStatusDto } from '../dtos/update-store-status.dto';
import { StoreService } from '../services/store.service';

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: IAuthUser, @Body() dto: CreateStoreDto) {
    return this.storeService.createStore(user.id, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  listMy(@CurrentUser() user: IAuthUser) {
    return this.storeService.listMyStores(user.id);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.storeService.getStoreBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storeService.updateStore(user.id, id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreStatusDto,
  ) {
    return this.storeService.updateStoreStatus(user.id, id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.storeService.deleteStore(user.id, id);
  }
}
