// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Like, Review, Store } from '@prisma/client';
import { CreateReviewDto } from '../dto/create-review.dto';
import { CreateLikeDto } from '../dto/create-like.dto';
import { CreateStoreDto } from '../dto/create-store.dto';
import { UpdateStoreDto } from '../dto/update-store.dto';
import axios from 'axios';

@Injectable()
export class StoreService {
  constructor(private readonly prismaService: PrismaService) {}

  async getDeatilStore(storeId: number, userId?: string) {
    let userKey;
    if (userId) {
      userKey = await this.prismaService.user.findUnique({
        where: {
          user_id: userId,
        },
        select: {
          idx: true,
        },
      });
    }
    console.log(userKey, 'userKye');

    const store = await this.prismaService.store.findUnique({
      where: {
        store_id: storeId,
      },
      include: {
        reviews: true,
        likes: {
          where: { user_id: userKey.idx },
          select: { user_id: true },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    return store;
  }
  async getStoresByType(
    storeType: string,
    page: number,
    sort: string,
  ): Promise<{ stores: Store[]; totalCount: number }> {
    const limit = 10;
    const skip = (page - 1) * limit;

    let orderBy = {};

    if (sort === 'newest') {
      orderBy = {
        reviews: {
          count: 'desc',
        },
        //created_at: 'desc',
      };
    } else if (sort === 'popular') {
      orderBy = {
        likes: {
          _count: 'desc',
        },
      };
    } else if (sort === 'reviews') {
      orderBy = {
        reviews: {
          _count: 'desc',
        },
      };
    } else {
      orderBy = {
        reviews: {
          _count: 'desc',
        },
        //created_at: 'desc',
      };
    }

    const [stores, totalCount] = await Promise.all([
      this.prismaService.store.findMany({
        where: {
          store_type: storeType,
        },
        include: {
          reviews: true,
          likes: true,
        },
        skip,
        orderBy,
      }),
      this.prismaService.store.count({
        where: {
          store_type: storeType,
        },
      }),
    ]);
    console.log(stores, totalCount, 'store service');
    return {
      stores,
      totalCount,
    };
  }

  async createStore(createStoreDto: CreateStoreDto): Promise<any> {
    const {
      store_type,
      name,
      address,
      detail_address,
      details,
      business_hours,
      contact,
    } = createStoreDto;

    const placeInfo = await this.getPlaceInfo(createStoreDto.address);

    const store = await this.prismaService.store.create({
      data: {
        store_type,
        name,
        address,
        detail_address,
        details,
        business_hours,
        contact,
        address_id: placeInfo.id,
        latitude: placeInfo.latitude,
        longitude: placeInfo.longitude,
      },
    });

    return store;
  }

  private async getPlaceInfo(address) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
      address,
    )}`;
    console.log(address);
    try {
      const response = await this.reqToMapApi(url);
      const place = response.data.documents.map((data) => ({
        id: data.id,
        name: data.place_name,
        address: data.address_name,
        latitude: data.x,
        longitude: data.y,
      }));

      const placeInfo = place[0];

      return placeInfo;
    } catch (error) {
      console.error('Error fetching place info from Kakao API:', error);
      throw new Error('Failed to fetch place info');
    }
  }

  //updateStore
  async updateStore(id: number, updateStoreDto: UpdateStoreDto): Promise<any> {
    const { name, address, details, business_hours, contact } = updateStoreDto;
    console.log('update', updateStoreDto);
    const existingStore = await this.prismaService.store.findUnique({
      where: { store_id: Number(id) },
    });

    if (!existingStore) {
      throw new NotFoundException('업체를 찾을 수 없습니다.');
    }

    const updatedStore = await this.prismaService.store.update({
      where: { store_id: Number(id) },
      data: {
        name: name || existingStore.name,
        address: address || existingStore.address,
        detail_address: detail_address || existingStore.detail_address,
        details: details || existingStore.details,
        business_hours: business_hours || existingStore.business_hours,
        contact: contact || existingStore.contact,
      },
    });

    return updatedStore;
  }

  async createReview(
    storeId: number,
    createReviewDto: CreateReviewDto,
  ): Promise<any> {
    console.log(createReviewDto);
    const { title, content, user_id } = createReviewDto;

    return this.prismaService.review.create({
      data: {
        title: createReviewDto.title,
        content: createReviewDto.content,
        store_id: Number(storeId),
        user_id: createReviewDto.userId,
      },
    });
  }

  async getStoreReview(storeId) {
    const review = await this.prismaService.review.findMany({
      where: { store_id: Number(storeId) },
    });

    if (!review) {
      throw new NotFoundException('리뷰가 존재하지 않습니다.');
    }
    return review;
  }

  async getReviewDetail(reviewId: number): Promise<Review> {
    const review = await this.prismaService.review.findUnique({
      where: { review_id: Number(reviewId) },
    });

    if (!review) {
      throw new NotFoundException('리뷰가 존재하지 않습니다.');
    }

    return review;
  }

  async updateReview(
    reviewId: number,
    createReviewDto: CreateReviewDto,
  ): Promise<any> {
    console.log(createReviewDto);
    const existingReview = await this.prismaService.review.findUnique({
      where: { review_id: Number(reviewId) },
    });
    console.log(existingReview);
    if (!existingReview) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    const updatedReview = await this.prismaService.review.update({
      where: { review_id: Number(reviewId) },
      data: {
        content: createReviewDto.content,
        title: createReviewDto.title,
      },
    });

    return { message: '성공적으로 수정되었습니다', updatedReview };
  }

  async deleteReview(reviewId: number) {
    const review = await this.prismaService.review.findUnique({
      where: { review_id: Number(reviewId) },
    });

    if (!review) {
      throw new NotFoundException('리뷰가 존재하지 않습니다.');
    }

    await this.prismaService.review.delete({
      where: { review_id: Number(reviewId) },
    });

    return { message: `리뷰가 성공적으로 삭제되었습니다.` };
  }

  async likeStore(createLikeDto: CreateLikeDto): Promise<void> {
    const { userId, storeId, isLike } = createLikeDto;

    const userKey = await this.prismaService.user.findFirst({
      where: {
        user_id: userId,
      },
      select: {
        idx: true,
      },
    });

    const existingLike = await this.prismaService.like.findFirst({
      where: {
        user_id: userKey.idx,
        store_id: Number(storeId),
      },
    });
    console.log('existingLike', existingLike, isLike);

    if (!existingLike && isLike) {
      await this.prismaService.like.create({
        data: {
          user_id: userKey.idx,
          store_id: Number(storeId),
        },
      });

      return { result: 'ok', message: '좋아요 성공' };
    } else if (existingLike && !isLike) {
      console.log('좋아요 취소');
      await this.prismaService.like.delete({
        where: {
          Like_id: existingLike.Like_id,
        },
      });

      return { result: 'ok', message: '좋아요 취소 성공' };
    } else if (existingLike && isLike) {
      throw new NotFoundException('이미 좋아하는 업체입니다.');
    }
    throw new NotFoundException('해당하는 업체를 찾을 수 없습니다.');
  }

  async deleteStore(id: number): Promise<any> {
    const existingStore = await this.prismaService.store.findUnique({
      where: { store_id: Number(id) },
    });

    if (!existingStore) {
      throw new NotFoundException('업체를 찾을 수 없습니다.');
    }

    await this.prismaService.store.delete({
      where: { store_id: Number(id) },
    });

    return { message: '업체가 삭제되었습니다.' };
  }

  private async getAllStores() {
    const allStore = this.prismaService.store.findMany();
    return allStore;
  }

  async searchStoresByName(keyword) {
    const stores = await this.prismaService.store.findMany({
      where: {
        name: { contains: keyword },
      },
    });

    console.log(stores);

    return stores;
  }

  async reqToMapApi(url) {
    const apiKey = process.env.KAKAO_API_KEY;
    const response = await axios.get(url, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });
    console.log('여기까지오나??', response.document)
    return response;
  }

  async getPlacesWithinRadiusTest(latitude,longitude,keyword,level) {
    
    const apiUrl = 'https://dapi.kakao.com/v2/local/search/category.json';
    const headers = { Authorization: 'KakaoAK YOUR_API_KEY' };
  
    const params = {
      category_group_code: keyword,
      x: longitude,
      y: latitude,
      radius : level,
      sort: 'distance',
    };

    const apiKey = process.env.KAKAO_API_KEY;

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      params
    });

    const data = response.data;
    console.log(data)
    const places = data.documents.map((place: any) => place.place_name);
    return places;
  }

  async getLocationByPosition(latitude, longitude, keyword, level) {
    const keywordMapping = {
      hospital: '동물병원',
      cafe: '애견카페',
      hotel: '애견호텔',
      academy: '훈련소',
      beauty: '반려동물미용',
      funeral: '반려동물장례',
      playground: '반려동물놀이터',
    };
    
    const levelMapping = {
      1:100, 
      2:200,
      3:300,
      4:400,
      5:500,
    }

    const key = keywordMapping[keyword] || '';
    const mylevel = levelMapping[level] !== undefined ? levelMapping[level] : 500;

    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?y=${latitude}&x=${longitude}&query=${encodeURIComponent(
      key,
    )}&radius=${mylevel}`;

    console.log(url)
    const response = await this.reqToMapApi(url);
    const data = response.data.documents.map((data) => ({
      id: data.id,
      name: data.place_name,
      address: data.address_name,
    }));
    return this.nearByStore(data);
  }

  async nearByStore(data) {
    const storeData = data;
    const stores = await this.getAllStores();
    const matchedStores = [];
    for (const store of stores) {
      for (const data of storeData) {
        const storeName = store.name.toLowerCase();
        const dataName = data.name.toLowerCase();
        if (storeName.includes(dataName) || dataName.includes(storeName)) {
          matchedStores.push({
            store_id: store.store_id,
            name: store.name,
            latitude: store.latitude,
            longitude: store.longitude,
          });
        }
      }
    }

    console.log(matchedStores);
    return matchedStores;
  }

  async getLocationByPositionTest(latitude, longitude, keyword, level) {
    const keywordMapping = {
      hospital: '동물병원',
      cafe: '애견카페',
      hotel: '애견호텔',
      academy: '훈련소',
      beauty: '반려동물미용',
      funeral: '반려동물장례',
      playground: '반려동물놀이터',
    };
    
    const levelMapping = {
      1:100, 
      2:200,
      3:300,
      4:400,
      5:500,
    }
    
    const key = keywordMapping[keyword] || '';
    const mylevel = levelMapping[level] !== undefined ? levelMapping[level] : 500;
    const apiUrl = 'https://dapi.kakao.com/v2/local/search/keyword.json';
    const url2 = `${apiUrl}?y=${latitude}&x=${longitude}&radius=20000`;
    console.log(latitude)
    console.log(longitude)
    console.log(url2)
    // const url2 = `https://dapi.kakao.com/v2/local/search/category.json?y=${latitude}&x=${longitude}&radius=${mylevel}`;
    // console.log(url2)
    const apiKey = process.env.KAKAO_API_KEY;
    // console.log('여기까지오나??', apiKey)
    // keyword.json?y=37.514322572335935&x=127.06283102249932&radius=20000"
    // const url2 = 'https://dapi.kakao.com/v2/local/search/category.json?category\_group\_code=PM9&radius=20000'
    // const url2 = 'https://dapi.kakao.com/v2/local/search/category.json?category\_group\_code=PM9&radius=20000'
    
    try {
      const response = await axios.get(url2+`&query=카카오프렌즈`, {
        headers: {
          Authorization: `KakaoAK ${apiKey}`,
        },
      });
      const place = response.data.documents.map((data) => ({
        id: data.id,
        name: data.place_name,
        address: data.address_name,
        latitude: data.x,
        longitude: data.y,
      }));
      console.log(place)
    } catch(E) {
      console.log(E)
    }
    

    
//     const url1 = 'https://dapi.kakao.com/v2/local/search/keyword.json';
// const latitude1 = 37.514322572335935;
// const longitude1 = 127.06283102249932;
// const radius1 = 20000;
// const keyword1 = '카카오프렌즈';
// const apiKey1 = apiKey;

// const headers = {
//   Authorization: `KakaoAK ${apiKey1}`,
// };

// const params = {
//   y: latitude1,
//   x: longitude1,
//   radius: radius1,
//   query: keyword1,
// };

  // const response = await axios.get(url, {
  //   headers: headers,
  //   params: params,
  // });

   

    return this.nearByStore(place);
  }

}
