import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import type { IAuthUser } from '../../../shared/auth/types/auth-user';
import { ProfileService } from '../../profiles/services/profile.service';
import { PayOrderDto } from '../dtos/pay-order.dto';
import { PaymentService } from '../services/payment.service';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly profileService: ProfileService,
  ) {}

  @Post('pay')
  @HttpCode(HttpStatus.OK)
  async pay(@CurrentUser() user: IAuthUser, @Body() dto: PayOrderDto) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.paymentService.payOrder(profileId, dto);
  }

  @Get('order/:orderId')
  async listForOrder(
    @CurrentUser() user: IAuthUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.paymentService.listOrderPayments(profileId, orderId);
  }
}
