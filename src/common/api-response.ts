export interface ApiResponse<T> {
    statusCode: number;
    timestamp: string;
    path: string;
    message: string;
    data: T | null;
    error: string | null;
}

export function createApiResponse<T>(params: {
    statusCode: number;
    path: string;
    message: string;
    data: T | null;
    error: string | null;
}): ApiResponse<T> {
    return {
        statusCode: params.statusCode,
        timestamp: new Date().toISOString(),
        path: params.path,
        message: params.message,
        data: params.data,
        error: params.error,
    };
}
