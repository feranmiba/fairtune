import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateUserProfileInput } from '@fairtune/validation';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        artistProfile: true,
        collaborator: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  async updateProfile(userId: string, input: UpdateUserProfileInput) {
    const { firstName, lastName, stageName, bio, profileImage, country } = input;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        artistProfile: {
          upsert: {
            create: {
              stageName: stageName || `${firstName || 'Artist'}`,
              bio,
              profileImage,
              country,
            },
            update: {
              stageName: stageName || undefined,
              bio,
              profileImage,
              country,
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        artistProfile: true,
      },
    });
  }
}
