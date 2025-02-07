import type { BuniosInstance, BuniosResponse } from "..";

// Define TypeScript interfaces for the authentication plugin
interface AuthPluginConfig {
    getAccessToken: () => string | null;
    setAccessToken: (res: BuniosResponse<{ access_token: string }>) => void;
    getRefreshToken: () => string | null;
    setRefreshToken: (res: BuniosResponse<{ refresh_token: string }>) => void;
    refreshPath?: string;
    loginPath?: string;
    maxRefresh?: number;
    onError?: (error: any) => void;
    onRefreshError?: (error: any) => void;
}

// Define the authentication plugin function
export const buniosAuth = ({
    getAccessToken,
    setAccessToken,
    getRefreshToken,
    setRefreshToken,
    refreshPath = "/refresh",
    loginPath = "/login",
    maxRefresh = 1,
    onError,
    onRefreshError,
}: AuthPluginConfig) => {
    return (instance: BuniosInstance) => {
        let refreshAttempts = 0;

        instance.interceptors.request.use(async (config) => {
            const token = getAccessToken();
            if (token) {
                config.headers = {
                    ...config.headers,
                    Authorization: `Bearer ${token}`,
                };
            }
            return config;
        });

        instance.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.status === 401 && refreshAttempts < maxRefresh) {
                    refreshAttempts++;
                    try {
                        const refreshToken = getRefreshToken();
                        if (!refreshToken) throw new Error("No refresh token available");

                        const res = await instance.post<{
                            access_token: string;
                            refresh_token: string;
                        }>(refreshPath, { refreshToken });
                        setAccessToken(res);
                        setRefreshToken(res);
                        return instance.request(error.config);
                    } catch (refreshError) {
                        onRefreshError?.(refreshError);
                        throw refreshError;
                    }
                }
                onError?.(error);
                throw error;
            }
        );

        // Automatically set the access token with custom login path
        instance.interceptors.response.use(
            (response) => {
                if (response.config.url === loginPath && response.status === 200) {
                    setAccessToken(response);
                }
                return response;
            },
            (error) => {
                throw error;
            }
        );
    };
};
