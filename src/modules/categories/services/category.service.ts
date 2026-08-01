import { Injectable } from '@nestjs/common';
import { randomSlugSuffix, slugify } from '../../../common/utils/slugify';
import { PrismaService } from '../../../database/services/prisma.service';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  image: true,
  isActive: true,
  position: true,
  parentId: true,
} as const;

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  listTree() {
    return this.prisma.category.findMany({
      select: {
        ...CATEGORY_SELECT,
        children: {
          select: CATEGORY_SELECT,
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
      where: { isActive: true, parentId: null },
      orderBy: { position: 'asc' },
    });
  }

  getCategoryBySlug(slug: string) {
    return this.prisma.category.findUniqueOrThrow({
      select: {
        ...CATEGORY_SELECT,
        children: {
          select: CATEGORY_SELECT,
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
      where: { slug },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      select: CATEGORY_SELECT,
      data: {
        name: dto.name,
        slug: await this.uniqueSlug(dto.name),
        description: dto.description,
        image: dto.image,
        parentId: dto.parentId,
        position: dto.position ?? 0,
      },
    });
  }

  updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({
      select: CATEGORY_SELECT,
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.prisma.category.delete({
      select: { id: true },
      where: { id },
    });
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'category';
    const existing = await this.prisma.category.findUnique({
      select: { id: true },
      where: { slug: base },
    });

    return existing ? `${base}-${randomSlugSuffix()}` : base;
  }
}
