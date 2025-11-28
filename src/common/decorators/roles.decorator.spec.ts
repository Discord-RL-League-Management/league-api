import { Roles, ROLES_KEY } from './roles.decorator';
import 'reflect-metadata';

describe('Roles Decorator', () => {
  class TestController {
    @Roles('admin', 'moderator')
    adminRoute() {
      return 'admin';
    }

    @Roles('user')
    userRoute() {
      return 'user';
    }

    @Roles()
    noRolesRoute() {
      return 'no roles';
    }

    privateRoute() {
      return 'private';
    }
  }

  it('should set ROLES_KEY metadata with multiple roles', () => {
    const metadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype,
      'adminRoute',
    ) as string[] | undefined;
    expect(metadata).toEqual(['admin', 'moderator']);
  });

  it('should set ROLES_KEY metadata with single role', () => {
    const metadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype,
      'userRoute',
    ) as string[] | undefined;
    expect(metadata).toEqual(['user']);
  });

  it('should set ROLES_KEY metadata with empty array when no roles provided', () => {
    const metadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype,
      'noRolesRoute',
    ) as string[] | undefined;
    expect(metadata).toEqual([]);
  });

  it('should not set metadata on routes without decorator', () => {
    const metadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype,
      'privateRoute',
    ) as string[] | undefined;
    expect(metadata).toBeUndefined();
  });

  it('should export ROLES_KEY constant', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('should be a function', () => {
    expect(typeof Roles).toBe('function');
  });

  it('should accept variable number of role arguments', () => {
    const result1 = Roles('admin');
    expect(result1).toBeDefined();

    const result2 = Roles('admin', 'moderator', 'user');
    expect(result2).toBeDefined();

    const result3 = Roles();
    expect(result3).toBeDefined();
  });
});
