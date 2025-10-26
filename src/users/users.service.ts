import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Decrypt refresh token if present
    if (user.refreshToken) {
      user.refreshToken = this.encryptionService.decrypt(user.refreshToken);
    }

    return user;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Decrypt refresh tokens for all users
    return users.map((user) => ({
      ...user,
      refreshToken: user.refreshToken
        ? this.encryptionService.decrypt(user.refreshToken)
        : null,
    }));
  }

  async create(createUserDto: CreateUserDto) {
    // Encrypt refresh token if present
    const data = { ...createUserDto };
    if (data.refreshToken) {
      data.refreshToken = this.encryptionService.encrypt(data.refreshToken);
      this.logger.debug('Encrypted refresh token on user creation');
    }

    return this.prisma.user.create({ data });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Encrypt refresh token if being updated
    const data = { ...updateUserDto };
    if (data.refreshToken) {
      data.refreshToken = this.encryptionService.encrypt(data.refreshToken);
      this.logger.debug('Encrypted refresh token on user update');
    }

    const user = await this.prisma.user.update({ where: { id }, data });

    // Decrypt refresh token for response
    if (user.refreshToken) {
      user.refreshToken = this.encryptionService.decrypt(user.refreshToken);
    }

    return user;
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
