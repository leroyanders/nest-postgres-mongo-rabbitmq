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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import type { IAuthUser } from '../../../shared/auth/types/auth-user';
import { AdjustStockDto } from '../dtos/adjust-stock.dto';
import { UpdateStockDto } from '../dtos/update-stock.dto';
import { StockService } from '../services/stock.service';

@UseGuards(JwtAuthGuard)
@Controller('stocks')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('store/:storeId')
  listStoreStocks(
    @CurrentUser() user: IAuthUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ) {
    return this.stockService.listStoreStocks(user.id, storeId);
  }

  @Get(':id/movements')
  listMovements(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stockService.listMovements(user.id, id);
  }

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  adjust(@CurrentUser() user: IAuthUser, @Body() dto: AdjustStockDto) {
    return this.stockService.adjustStock(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.stockService.updateStock(user.id, id, dto);
  }
}
