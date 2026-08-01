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
import { CreateProductDto } from '../dtos/create-product.dto';
import { CreateProductVariantDto } from '../dtos/create-product-variant.dto';
import { ListProductsQueryDto } from '../dtos/list-products-query.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { UpdateProductVariantDto } from '../dtos/update-product-variant.dto';
import { ProductService } from '../services/product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list(@Query() query: ListProductsQueryDto) {
    return this.productService.listProducts(query);
  }

  @Get('store/:storeId')
  @UseGuards(JwtAuthGuard)
  listStoreProducts(
    @CurrentUser() user: IAuthUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.productService.listStoreProducts(user.id, storeId, pagination);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.getProduct(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: IAuthUser, @Body() dto: CreateProductDto) {
    return this.productService.createProduct(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.productService.deleteProduct(user.id, id);
  }

  @Post(':id/variants')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  addVariant(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productService.addVariant(user.id, id, dto);
  }

  @Patch('variants/:variantId')
  @UseGuards(JwtAuthGuard)
  updateVariant(
    @CurrentUser() user: IAuthUser,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productService.updateVariant(user.id, variantId, dto);
  }

  @Delete('variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async removeVariant(
    @CurrentUser() user: IAuthUser,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<void> {
    await this.productService.deleteVariant(user.id, variantId);
  }
}
