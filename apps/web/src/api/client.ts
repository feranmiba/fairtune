export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Array<{ field?: string; message: string }>;
  timestamp: string;
  path?: string;
}

const API_BASE_URL = '/api/v1';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.accessToken = localStorage.getItem('fairtune_access_token');
    this.refreshToken = localStorage.getItem('fairtune_refresh_token');
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('fairtune_access_token', accessToken);
    localStorage.setItem('fairtune_refresh_token', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('fairtune_access_token');
    localStorage.removeItem('fairtune_refresh_token');
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  async request<T>(endpoint: string, options: RequestInit = {}, requiresAuth = true): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    // Set authorization header if token exists
    if (requiresAuth && this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    // Default Content-Type to JSON unless sending FormData
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token refresh on 401
    if (response.status === 401 && requiresAuth && this.refreshToken) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: this.refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = (await refreshRes.json()) as ApiResponse<{
              accessToken: string;
              refreshToken: string;
            }>;
            const newAccessToken = refreshData.data.accessToken;
            const newRefreshToken = refreshData.data.refreshToken;
            this.setTokens(newAccessToken, newRefreshToken);
            this.onTokenRefreshed(newAccessToken);
          } else {
            this.clearTokens();
            window.dispatchEvent(new CustomEvent('auth:expired'));
            throw new Error('Session expired');
          }
        } catch (err) {
          this.clearTokens();
          window.dispatchEvent(new CustomEvent('auth:expired'));
          throw err;
        } finally {
          this.isRefreshing = false;
        }
      }

      // Retry original request with new token
      return new Promise<T>((resolve, reject) => {
        this.addRefreshSubscriber(async (token) => {
          headers.set('Authorization', `Bearer ${token}`);
          try {
            const retryRes = await fetch(url, { ...options, headers });
            const data = await this.parseResponse<T>(retryRes);
            resolve(data);
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorPayload = data as ApiError;
      const error = new Error(
        errorPayload.message || `Request failed with status ${response.status}`,
      ) as Error & { apiError: ApiError };
      error.apiError = errorPayload;
      throw error;
    }

    // Unwrap NestJS TransformInterceptor envelope
    if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
      return (data as ApiResponse<T>).data;
    }

    return data as T;
  }

  // Convenience methods
  get<T>(endpoint: string, options?: RequestInit, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' }, requiresAuth);
  }

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
    requiresAuth = true,
  ): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'POST',
        body: isFormData ? body : JSON.stringify(body),
      },
      requiresAuth,
    );
  }

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
    requiresAuth = true,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      requiresAuth,
    );
  }

  delete<T>(endpoint: string, options?: RequestInit, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' }, requiresAuth);
  }
}

export const api = new ApiClient();
