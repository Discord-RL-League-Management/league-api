import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { NotFoundException } from '@nestjs/common';
import { DiscordProfileDto } from './dto/discord-profile.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateDiscordUser(discordData: DiscordProfileDto) {
    // Try to find existing user
    let user;
    try {
      user = await this.usersService.findOne(discordData.discordId);
      
      // Update existing user
      user = await this.usersService.update(discordData.discordId, {
        username: discordData.username,
        discriminator: discordData.discriminator,
        globalName: discordData.globalName,
        avatar: discordData.avatar,
        email: discordData.email,
        accessToken: discordData.accessToken,
        refreshToken: discordData.refreshToken,
        lastLoginAt: new Date(),
      });
      
      this.logger.log(`User ${discordData.discordId} logged in successfully`);
    } catch (error) {
      // Only create user if error is NotFoundException
      if (error instanceof NotFoundException) {
        try {
          user = await this.usersService.create({
            id: discordData.discordId,
            username: discordData.username,
            discriminator: discordData.discriminator,
            globalName: discordData.globalName,
            avatar: discordData.avatar,
            email: discordData.email,
            accessToken: discordData.accessToken,
            refreshToken: discordData.refreshToken,
          });
          
          this.logger.log(`New user ${discordData.discordId} created successfully`);
        } catch (createError) {
          this.logger.error(`Failed to create user ${discordData.discordId}:`, createError);
          throw createError;
        }
      } else {
        // Re-throw other errors (database connection, validation, etc.)
        this.logger.error(`Failed to find user ${discordData.discordId}:`, error);
        throw error;
      }
    }

    return user;
  }

  async generateJwt(user: { id: string; username: string }) {
    const payload = { sub: user.id, username: user.username };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }
}
