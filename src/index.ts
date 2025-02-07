export interface RequestConfig {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "get" | "post" | "put" | "delete" | "patch";
    url: string;
    data?: any;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    timeout?: number;
  }
  
  export interface BuniosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
    config: RequestConfig;
  }
  
  
  export interface BuniosInstance extends Bunios {
      
  }

class Bunios {
  private baseURL?: string;
  private defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  private plugins: Array<(instance: Bunios) => void> = [];

  interceptors = {
    request: {
      handlers: [] as ((
        config: RequestConfig
      ) => RequestConfig | Promise<RequestConfig>)[],
      use: (
        onFulfilled: (
          config: RequestConfig
        ) => RequestConfig | Promise<RequestConfig>,
        onRejected?: (error: any) => any | Promise<any>
      ) => {
        this.interceptors.request.handlers.push(onFulfilled);
        if (onRejected) {
          this.interceptors.request.handlers.push(onRejected);
        }
        return this;
      },
    },
    response: {
      handlers: [] as ((
        response: BuniosResponse
      ) => BuniosResponse | Promise<BuniosResponse>)[],
      errorHandlers: [] as ((error: any) => any | Promise<any>)[],
      use: (
        onFulfilled: (
          response: BuniosResponse
        ) => BuniosResponse | Promise<BuniosResponse>,
        onRejected?: (error: any) => any | Promise<any>
      ) => {
        this.interceptors.response.handlers.push(onFulfilled);
        if (onRejected) {
          this.interceptors.response.errorHandlers.push(onRejected);
        }
        return this;
      },
    },
  };

  constructor(config?: { baseURL?: string; headers?: Record<string, string> }) {
    this.baseURL = config?.baseURL;
    if (config?.headers) {
      this.defaultHeaders = { ...this.defaultHeaders, ...config.headers };
    }
  }

  create(config?: { baseURL?: string; headers?: Record<string, string> }) {
    const instance = new Bunios(config);
    this.plugins.forEach((plugin) => plugin(instance)); // Apply existing plugins
    return instance;
  }

  use(plugin: (instance: Bunios) => void) {
    this.plugins.push(plugin);
    plugin(this);
  }

  private async applyRequestInterceptors(
    config: RequestConfig
  ): Promise<RequestConfig> {
    let processedConfig = config;
    for (const handler of this.interceptors.request.handlers) {
      processedConfig = await handler(processedConfig);
    }
    return processedConfig;
  }

  private async applyResponseInterceptors(
    response: BuniosResponse
  ): Promise<BuniosResponse> {
    let processedResponse = response;
    for (const handler of this.interceptors.response.handlers) {
      processedResponse = await handler(processedResponse);
    }
    return processedResponse;
  }

  private async applyResponseErrorInterceptors(error: any): Promise<any> {
    let processedError = error;
    for (const handler of this.interceptors.response.errorHandlers) {
      processedError = await handler(processedError);
    }
    return processedError;
  }

  private buildURL(url: string, params?: Record<string, string>): string {
    let fullURL = this.baseURL ? `${this.baseURL}${url}` : url;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      fullURL += `?${queryString}`;
    }
    return fullURL;
  }

  public async request<T>(config: RequestConfig): Promise<BuniosResponse<T>> {
    try {
      const interceptedConfig = await this.applyRequestInterceptors(config);
      const {
        method = "GET",
        url,
        data,
        params,
        headers = {},
        timeout = 10000,
      } = interceptedConfig;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const requestHeaders = { ...this.defaultHeaders, ...headers };
      const requestConfig: RequestInit = {
        method,
        headers: requestHeaders,
        signal: controller.signal,
      };
      if (data) {
        requestConfig.body = JSON.stringify(data);
      }
      const fullURL = this.buildURL(url, params);
      const response = await fetch(fullURL, requestConfig);
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorResponse = {
          status: response.status,
          statusText: response.statusText,
          data: await response.json().catch(() => ({})),
          config: interceptedConfig,
        };
        throw errorResponse;
      }
      const responseData = await response.json();
      const bunioshResponse: BuniosResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: interceptedConfig,
      };
      return await this.applyResponseInterceptors(bunioshResponse);
    } catch (error) {
      throw await this.applyResponseErrorInterceptors(error);
    }
  }

  get<T>(
    url: string,
    config: Omit<RequestConfig, "method" | "url" | "data"> = {}
  ) {
    return this.request<T>({ method: "GET", url, ...config });
  }
  post<T>(
    url: string,
    data?: any,
    config: Omit<RequestConfig, "method" | "url" | "data"> = {}
  ) {
    return this.request<T>({ method: "POST", url, data, ...config });
  }
  put<T>(
    url: string,
    data?: any,
    config: Omit<RequestConfig, "method" | "url" | "data"> = {}
  ) {
    return this.request<T>({ method: "PUT", url, data, ...config });
  }
  delete<T>(
    url: string,
    config: Omit<RequestConfig, "method" | "url" | "data"> = {}
  ) {
    return this.request<T>({ method: "DELETE", url, ...config });
  }
  patch<T>(
    url: string,
    data?: any,
    config: Omit<RequestConfig, "method" | "url" | "data"> = {}
  ) {
    return this.request<T>({ method: "PATCH", url, data, ...config });
  }
}

export default new Bunios() as BuniosInstance;

export { Bunios };