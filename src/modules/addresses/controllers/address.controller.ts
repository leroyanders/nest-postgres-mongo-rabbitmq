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
import { CreateAddressDto } from '../dtos/create-address.dto';
import { UpdateAddressDto } from '../dtos/update-address.dto';
import { AddressService } from '../services/address.service';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.addressService.listAddresses(profileId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.addressService.createAddress(profileId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.addressService.updateAddress(profileId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const profileId = await this.profileService.requireProfileId(user.id);
    await this.addressService.deleteAddress(profileId, id);
  }
}
