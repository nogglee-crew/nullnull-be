export default class CustomResponse<T> {
    constructor(
        public readonly data: T | null,
        public readonly message: string = '요청이 성공적으로 처리되었습니다.',
    ) {}
}
