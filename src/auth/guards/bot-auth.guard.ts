import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class BotAuthGuard extends AuthGuard('bot-api-key') {}
