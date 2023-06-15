// @ts-nocheck
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Delete,
} from '@nestjs/common';
import { StoreService } from '../service/store.service';
import { Like, Review, Store } from '@prisma/client';
import { CreateReviewDto } from '../dto/create-review.dto';
import { CreateLikeDto } from '../dto/create-like.dto';
import { CreateStoreDto } from '../dto/create-store.dto';
import { UpdateStoreDto } from '../dto/update-store.dto';

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  async getStoresByType(
    @Query('type') storeType: string,
    @Query('page') page: number,
    @Query('sort') sort: string,
  ): Promise<{ stores: Store[]; totalCount: number }> {
    return this.storeService.getStoresByType(storeType, page, sort);
  }

  @Get('detail/:storeId')
  async getDeatilStore(
    @Param('storeId') storeId: string,
    @Query('storeName') storeName?: string,
    @Query('userId') userId?: string,
  ): Promise<Store> {
    if (userId) {
      const storeIntId = parseInt(storeId, 10);
      return this.storeService.getDeatilStore(storeIntId, storeName, userId);
    } else {
      const storeIntId = parseInt(storeId, 10);
<<<<<<< HEAD
      return this.storeService.getDeatilStore(storeIntId, storeName);
=======
      return this.storeService.getDeatilStore(storeIntId);
>>>>>>> 98ad42468f1f723edf264fe034113592ca9c43af
    }
  }

  @Post()
  async createCompany(@Body() createStoreDto: CreateStoreDto): Promise<any> {
    return this.storeService.createStore(createStoreDto);
  }

  @Patch('/:id')
  async updateCompany(
    @Param('id') id: number,
    @Body() updateStoreDto: UpdateStoreDto,
  ): Promise<any> {
    return this.storeService.updateStore(id, updateStoreDto);
  }

  @Post('review/:storeId')
  async createReview(
    @Param('storeId') storeId: number,
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<Review> {
    return this.storeService.createReview(storeId, createReviewDto);
  }

  @Get('/:storeId/reviews')
  async getReview(@Param('storeId') storeId: number): Promise<Review> {
    return this.storeService.getStoreReview(storeId);
  }

  @Get('review/:reviewId')
  async getReviewDetail(@Param('reviewId') reviewId: number): Promise<Review> {
    return this.storeService.getReviewDetail(reviewId);
  }

  @Patch('review/:reviewId')
  async updateReview(
    @Param('reviewId') reviewId: number,
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<Review> {
    return this.storeService.updateReview(reviewId, createReviewDto);
  }

  @Delete('review/:reviewId')
  async deleteReview(@Param('reviewId') reviewId) {
    return this.storeService.deleteReview(reviewId);
  }

  @Post('/likes')
  async likeStore(@Body() createLikeDto: CreateLikeDto): Promise<void> {
    return await this.storeService.likeStore(createLikeDto);
  }

  @Delete(':id')
  async deleteCompany(@Param('id') id: number): Promise<any> {
    return this.storeService.deleteStore(id);
  }
}
