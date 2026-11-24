import { api } from './client';
import { LoginInput, RegisterInput } from '@fairtune/validation';
import { UserDto, ArtistProfileDto } from '@fairtune/shared';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto & { artistProfile?: ArtistProfileDto | null };
}

export const authApi = {
  login: async (input: LoginInput): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/login', input, {}, false);
  },

  register: async (input: RegisterInput): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/register', input, {}, false);
  },

  getMe: async (): Promise<UserDto & { artistProfile?: ArtistProfileDto | null }> => {
    return api.get<UserDto & { artistProfile?: ArtistProfileDto | null }>('/auth/me');
  },

  logout: async (): Promise<{ message: string }> => {
    try {
      return await api.post<{ message: string }>('/auth/logout');
    } finally {
      api.clearTokens();
    }
  },
};
