import { Test, TestingModule } from '@nestjs/testing';
import { InternalUsersController } from './internal-users.controller';
import { UsersService } from './users.service';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { UserNotFoundException } from './exceptions/user.exceptions';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Mock UsersService
const mockUsersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('InternalUsersController', () => {
  let controller: InternalUsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    // ARRANGE: Setup the testing module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalUsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(BotAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<InternalUsersController>(InternalUsersController);
    usersService = module.get<UsersService>(
      UsersService,
    ) as jest.Mocked<UsersService>;
  });

  afterEach(() => {
    // Cleanup: Clear all mock usage data
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    // ASSERT
    expect(controller).toBeDefined();
  });

  describe('Authentication and Authorization', () => {
    it('should have BotAuthGuard applied', () => {
      // ARRANGE
      const guards = Reflect.getMetadata('__guards__', InternalUsersController);

      // ASSERT
      expect(guards).toContain(BotAuthGuard);
    });
  });

  describe('findAll', () => {
    it('should successfully return all users', async () => {
      // ARRANGE
      const expectedUsers = [
        {
          id: '123456789012345678',
          username: 'testuser1',
          discriminator: null,
          globalName: 'Test User 1',
          avatar: null,
          email: 'test1@example.com',
          accessToken: null,
          refreshToken: null,
          isBanned: false,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        },
        {
          id: '987654321098765432',
          username: 'testuser2',
          discriminator: null,
          globalName: 'Test User 2',
          avatar: null,
          email: 'test2@example.com',
          accessToken: null,
          refreshToken: null,
          isBanned: false,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        },
      ];
      usersService.findAll.mockResolvedValue(expectedUsers);

      // ACT
      const result = await controller.findAll();

      // ASSERT
      expect(result).toEqual(expectedUsers);
      expect(usersService.findAll).toHaveBeenCalledTimes(1);
      expect(usersService.findAll).toHaveBeenCalledWith();
    });

    it('should return empty array when no users exist', async () => {
      // ARRANGE
      usersService.findAll.mockResolvedValue([]);

      // ACT
      const result = await controller.findAll();

      // ASSERT
      expect(result).toEqual([]);
      expect(usersService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should successfully return a user by id', async () => {
      // ARRANGE
      const userId = '123456789012345678';
      const expectedUser = {
        id: userId,
        username: 'testuser',
        discriminator: null,
        globalName: 'Test User',
        avatar: null,
        email: 'test@example.com',
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      usersService.findOne.mockResolvedValue(expectedUser);

      // ACT
      const result = await controller.findOne(userId);

      // ASSERT
      expect(result).toEqual(expectedUser);
      expect(usersService.findOne).toHaveBeenCalledTimes(1);
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
    });

    it('should throw UserNotFoundException when user does not exist', async () => {
      // ARRANGE
      const userId = 'nonexistent-id';
      usersService.findOne.mockRejectedValue(new UserNotFoundException(userId));

      // ACT & ASSERT
      await expect(controller.findOne(userId)).rejects.toThrow(
        UserNotFoundException,
      );
      expect(usersService.findOne).toHaveBeenCalledTimes(1);
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('create', () => {
    it('should successfully create a new user', async () => {
      // ARRANGE
      const createUserDto: CreateUserDto = {
        id: '123456789012345678',
        username: 'newuser',
        globalName: 'New User',
        email: 'newuser@example.com',
        avatar: 'avatar123',
      };
      const expectedUser = {
        id: createUserDto.id,
        username: createUserDto.username,
        discriminator: null,
        globalName: createUserDto.globalName || null,
        avatar: createUserDto.avatar || null,
        email: createUserDto.email || null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      usersService.create.mockResolvedValue(expectedUser);

      // ACT
      const result = await controller.create(createUserDto);

      // ASSERT
      expect(result).toEqual(expectedUser);
      expect(usersService.create).toHaveBeenCalledTimes(1);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should successfully create a user with minimal required fields', async () => {
      // ARRANGE
      const createUserDto: CreateUserDto = {
        id: '123456789012345678',
        username: 'minimaluser',
      };
      const expectedUser = {
        id: createUserDto.id,
        username: createUserDto.username,
        discriminator: null,
        globalName: null,
        avatar: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      usersService.create.mockResolvedValue(expectedUser);

      // ACT
      const result = await controller.create(createUserDto);

      // ASSERT
      expect(result).toEqual(expectedUser);
      expect(usersService.create).toHaveBeenCalledTimes(1);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should propagate service errors when user creation fails', async () => {
      // ARRANGE
      const createUserDto: CreateUserDto = {
        id: '123456789012345678',
        username: 'failuser',
      };
      const error = new Error('Database connection failed');
      usersService.create.mockRejectedValue(error);

      // ACT & ASSERT
      await expect(controller.create(createUserDto)).rejects.toThrow(error);
      expect(usersService.create).toHaveBeenCalledTimes(1);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('update', () => {
    it('should successfully update an existing user', async () => {
      // ARRANGE
      const userId = '123456789012345678';
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        globalName: 'Updated User',
        email: 'updated@example.com',
      };
      const expectedUser = {
        id: userId,
        username: updateUserDto.username!,
        discriminator: null,
        globalName: updateUserDto.globalName || null,
        avatar: null,
        email: updateUserDto.email || null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      usersService.update.mockResolvedValue(expectedUser);

      // ACT
      const result = await controller.update(userId, updateUserDto);

      // ASSERT
      expect(result).toEqual(expectedUser);
      expect(usersService.update).toHaveBeenCalledTimes(1);
      expect(usersService.update).toHaveBeenCalledWith(userId, updateUserDto);
    });

    it('should successfully update user with partial data', async () => {
      // ARRANGE
      const userId = '123456789012345678';
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };
      const expectedUser = {
        id: userId,
        username: 'existinguser',
        discriminator: null,
        globalName: null,
        avatar: null,
        email: updateUserDto.email || null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      usersService.update.mockResolvedValue(expectedUser);

      // ACT
      const result = await controller.update(userId, updateUserDto);

      // ASSERT
      expect(result).toEqual(expectedUser);
      expect(usersService.update).toHaveBeenCalledTimes(1);
      expect(usersService.update).toHaveBeenCalledWith(userId, updateUserDto);
    });

    it('should throw UserNotFoundException when updating non-existent user', async () => {
      // ARRANGE
      const userId = 'nonexistent-id';
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
      };
      usersService.update.mockRejectedValue(new UserNotFoundException(userId));

      // ACT & ASSERT
      await expect(controller.update(userId, updateUserDto)).rejects.toThrow(
        UserNotFoundException,
      );
      expect(usersService.update).toHaveBeenCalledTimes(1);
      expect(usersService.update).toHaveBeenCalledWith(userId, updateUserDto);
    });

    it('should handle empty update DTO', async () => {
      // ARRANGE
      const userId = '123456789012345678';
      const updateUserDto: UpdateUserDto = {};
      const expectedUser = {
        id: userId,
        username: 'existinguser',
        discriminator: null,
        globalName: null,
        avatar: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      usersService.update.mockResolvedValue(expectedUser);

      // ACT
      const result = await controller.update(userId, updateUserDto);

      // ASSERT
      expect(result).toEqual(expectedUser);
      expect(usersService.update).toHaveBeenCalledTimes(1);
      expect(usersService.update).toHaveBeenCalledWith(userId, updateUserDto);
    });
  });

  describe('delete', () => {
    it('should successfully delete an existing user', async () => {
      // ARRANGE
      const userId = '123456789012345678';
      const expectedUser = {
        id: userId,
        username: 'deleteduser',
        discriminator: null,
        globalName: null,
        avatar: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      usersService.delete.mockResolvedValue(expectedUser);

      // ACT
      const result = await controller.delete(userId);

      // ASSERT
      expect(result).toEqual(expectedUser);
      expect(usersService.delete).toHaveBeenCalledTimes(1);
      expect(usersService.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw UserNotFoundException when deleting non-existent user', async () => {
      // ARRANGE
      const userId = 'nonexistent-id';
      usersService.delete.mockRejectedValue(new UserNotFoundException(userId));

      // ACT & ASSERT
      await expect(controller.delete(userId)).rejects.toThrow(
        UserNotFoundException,
      );
      expect(usersService.delete).toHaveBeenCalledTimes(1);
      expect(usersService.delete).toHaveBeenCalledWith(userId);
    });

    it('should propagate service errors when deletion fails', async () => {
      // ARRANGE
      const userId = '123456789012345678';
      const error = new Error('Database constraint violation');
      usersService.delete.mockRejectedValue(error);

      // ACT & ASSERT
      await expect(controller.delete(userId)).rejects.toThrow(error);
      expect(usersService.delete).toHaveBeenCalledTimes(1);
      expect(usersService.delete).toHaveBeenCalledWith(userId);
    });
  });
});
