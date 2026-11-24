import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Artist profile not found');
    }
    return profile;
  }

  async findById(id: string) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException('Artist profile not found');
    }
    return profile;
  }
}
