import { api } from './client';
import { UpdateUserProfileInput } from '@fairtune/validation';
import { UserDto, ArtistProfileDto } from '@fairtune/shared';

export interface FullProfile extends UserDto {
  artistProfile?: ArtistProfileDto | null;
}

export const usersApi = {
  getProfile: async (): Promise<FullProfile> => {
    return api.get<FullProfile>('/users/me');
  },

  updateProfile: async (input: UpdateUserProfileInput): Promise<FullProfile> => {
    return api.patch<FullProfile>('/users/me', input);
  },
};
