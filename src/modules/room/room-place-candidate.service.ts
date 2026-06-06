import { Injectable, HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/exception/app.exception.js';
import { ErrorCode } from '../../common/exception/error-codes.js';
import { RoomCategory } from '../../generated/prisma/enums.js';

type Point = {
    latitude: number;
    longitude: number;
};

type KakaoPlaceDocument = {
    place_name: string;
    address_name: string;
    road_address_name: string;
    x: string;
    y: string;
};

type PlaceOrigin = Point & {
    address: string;
};

@Injectable()
export class RoomPlaceCandidateService {
    private readonly MAX_CANDIDATES = 3; // 최종 반환할 장소 후보 수
    private readonly INITIAL_RADIUS = 3000; // 초기 검색 반경 (미터)
    private readonly EXTENDED_RADIUS = 10000; // 확장 검색 반경 (미터)
    private readonly SEARCH_SIZE = 15; // Kakao Local API 한 번 호출당 반환할 결과 수

    // 제출된 출발지들을 바탕으로 중간 지점을 계산하고, 그 좌표 주변의 장소 후보를 만든다.
    // 장소 후보는 RoomCategory에 맞는 Kakao Local 검색 결과를 사용하며,
    // 각 장소별로 모든 참여자 출발지까지의 거리 합계를 계산해 이후 정렬/노출에 활용한다.
    async buildPlaceCandidates(category: RoomCategory, origins: PlaceOrigin[]) {
        if (origins.length === 0) {
            throw new AppException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                '후보를 생성할 수 있는 제출 데이터가 없습니다.',
                ErrorCode.NO_SUBMITTED_PARTICIPANTS,
            );
        }

        // 모든 제출 origin의 평균 좌표를 중간 지점으로 삼고, 그 근처의 장소를 외부 API로 찾는다.
        const midpoint = this.calculateMidpoint(origins);
        const places = await this.searchKakaoPlaces(category, midpoint);

        // collectOrigin=true 방에서 장소 후보가 하나도 없으면 READY 전이 없이 전체를 실패 처리한다.
        if (places.length === 0) {
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '외부 서비스 호출 중 오류가 발생했습니다.',
                ErrorCode.EXTERNAL_API_ERROR,
            );
        }

        return places.slice(0, this.MAX_CANDIDATES).map((place, index) => {
            const latitude = Number(place.y);
            const longitude = Number(place.x);

            // 각 후보 장소가 모든 참여자에게 얼마나 먼지 합산해 평균/총 거리 정보를 저장한다.
            // 후보 조회 화면에서는 rank 순으로 쓰고, 거리 정보는 후속 정렬/보조 정보로 재사용할 수 있다.
            const totalDistance = this.calculateTotalDistance(origins, { latitude, longitude });

            return {
                placeName: place.place_name,
                latitude,
                longitude,
                address: place.road_address_name || place.address_name,
                averageDistance: Math.round(totalDistance / origins.length),
                totalDistance,
                rank: index + 1,
            };
        });
    }

    // 방 카테고리에 맞는 검색어를 정하고, 중간 지점 주변의 Kakao 장소 검색 결과를 모은다.
    // 1차로 가까운 반경(3km)을 조회하고, 후보가 부족하면 반경을 넓혀(10km) 한 번 더 보강한다.
    private async searchKakaoPlaces(
        category: RoomCategory,
        midpoint: Point,
    ): Promise<KakaoPlaceDocument[]> {
        const apiKey = process.env.KAKAO_REST_API_KEY;

        // 장소 후보 생성은 외부 API 의존이므로 키가 없으면 전체 마감 처리를 실패시킨다.
        if (!apiKey) {
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '외부 서비스 호출 중 오류가 발생했습니다.',
                ErrorCode.EXTERNAL_API_ERROR,
            );
        }

        const { query, categoryGroupCode } = this.getPlaceSearchSpec(category);
        const documents = await this.requestKakaoPlaces({
            apiKey,
            query,
            categoryGroupCode,
            midpoint,
            radius: this.INITIAL_RADIUS,
        });

        if (documents.length >= this.MAX_CANDIDATES) {
            return documents;
        }

        return this.requestKakaoPlaces({
            apiKey,
            query,
            categoryGroupCode,
            midpoint,
            radius: this.EXTENDED_RADIUS,
        });
    }

    // Kakao Local keyword API를 한 번 호출해 반경 내 장소 목록을 가져온다.
    // 응답은 같은 장소명이 반복될 수 있어 place_name + 주소 기준으로 중복을 제거한다.
    private async requestKakaoPlaces(params: {
        apiKey: string;
        query: string;
        categoryGroupCode?: string;
        midpoint: Point;
        radius: number;
    }): Promise<KakaoPlaceDocument[]> {
        const searchParams = new URLSearchParams({
            query: params.query,
            x: String(params.midpoint.longitude),
            y: String(params.midpoint.latitude),
            radius: String(params.radius),
            size: String(this.SEARCH_SIZE),
            sort: 'distance',
        });

        if (params.categoryGroupCode) {
            searchParams.set('category_group_code', params.categoryGroupCode);
        }

        const response = await fetch(
            `https://dapi.kakao.com/v2/local/search/keyword.json?${searchParams.toString()}`,
            {
                headers: {
                    Authorization: `KakaoAK ${params.apiKey}`,
                },
            },
        );

        if (!response.ok) {
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '외부 서비스 호출 중 오류가 발생했습니다.',
                ErrorCode.EXTERNAL_API_ERROR,
            );
        }

        const payload = (await response.json()) as {
            documents: KakaoPlaceDocument[];
        };

        const deduplicatedDocuments = new Map<string, KakaoPlaceDocument>();

        for (const document of payload.documents) {
            const key = `${document.place_name}:${document.road_address_name || document.address_name}`;
            if (!deduplicatedDocuments.has(key)) {
                deduplicatedDocuments.set(key, document);
            }
        }

        return [...deduplicatedDocuments.values()];
    }

    // RoomCategory를 Kakao 검색에 사용할 키워드/카테고리 코드로 매핑한다.
    // 시간 후보와 달리 장소 후보는 외부 검색 품질에 영향을 받으므로 검색어를 여기서 고정한다.
    private getPlaceSearchSpec(category: RoomCategory): {
        query: string;
        categoryGroupCode?: string;
    } {
        const specs: Record<RoomCategory, { query: string; categoryGroupCode?: string }> = {
            [RoomCategory.MEAL]: { query: '맛집', categoryGroupCode: 'FD6' },
            [RoomCategory.CAFE]: { query: '카페', categoryGroupCode: 'CE7' },
            [RoomCategory.DRINK]: { query: '술집' },
            [RoomCategory.STUDY]: { query: '스터디카페' },
            [RoomCategory.MEETING]: { query: '회의실' },
            [RoomCategory.EXERCISE]: { query: '운동시설' },
            [RoomCategory.GAME]: { query: '보드게임카페' },
            [RoomCategory.PARTY]: { query: '파티룸' },
            [RoomCategory.ETC]: { query: '모임 장소' },
        };

        return specs[category];
    }

    // 모든 origin의 위도/경도 평균을 구해 장소 검색의 기준점으로 쓴다.
    // 현재는 단순 평균 좌표를 사용하고, 이후 필요하면 가중치나 보정 로직을 여기서 확장할 수 있다.
    private calculateMidpoint(points: Point[]): Point {
        const { latitude, longitude } = points.reduce(
            (accumulator, point) => ({
                latitude: accumulator.latitude + point.latitude,
                longitude: accumulator.longitude + point.longitude,
            }),
            { latitude: 0, longitude: 0 },
        );

        return {
            latitude: latitude / points.length,
            longitude: longitude / points.length,
        };
    }

    // 한 장소 후보가 전체 참여자에게 얼마나 먼지 합산해 총 이동 거리로 환산한다.
    // 이 값은 averageDistance 계산의 기반이 되고, 후보 품질 비교에도 재사용할 수 있다.
    private calculateTotalDistance(origins: Point[], destination: Point): number {
        return Math.round(
            origins.reduce((totalDistance, origin) => {
                return totalDistance + this.calculateDistanceInMeters(origin, destination);
            }, 0),
        );
    }

    // 두 좌표 사이의 직선 거리를 haversine 공식으로 계산한다.
    // 실제 경로 탐색은 아니고, 후보 간 상대 비교를 위한 근사 거리 용도다.
    private calculateDistanceInMeters(from: Point, to: Point): number {
        const earthRadius = 6371000;
        const deltaLatitude = this.toRadians(to.latitude - from.latitude);
        const deltaLongitude = this.toRadians(to.longitude - from.longitude);
        const fromLatitude = this.toRadians(from.latitude);
        const toLatitude = this.toRadians(to.latitude);

        const haversine =
            Math.sin(deltaLatitude / 2) ** 2 +
            Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

        return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    }

    // 거리 계산용 공통 보조 함수로, degree 값을 radian으로 변환한다.
    private toRadians(value: number): number {
        return (value * Math.PI) / 180;
    }
}
