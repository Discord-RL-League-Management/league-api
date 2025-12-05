/* eslint-disable @typescript-eslint/unbound-method */
import { Roles, ROLES_KEY } from './roles.decorator';
import { Reflector } from '@nestjs/core';
import 'reflect-metadata';

describe('Roles Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

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
    const metadata = reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      TestController.prototype.adminRoute,
      TestController,
    ]);
    expect(metadata).toEqual(['admin', 'moderator']);
  });

  it('should set ROLES_KEY metadata with single role', () => {
    const metadata = reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      TestController.prototype.userRoute,
      TestController,
    ]);
    expect(metadata).toEqual(['user']);
  });

  it('should set ROLES_KEY metadata with empty array when no roles provided', () => {
    const metadata = reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      TestController.prototype.noRolesRoute,
      TestController,
    ]);
    expect(metadata).toEqual([]);
  });

  it('should not set metadata on routes without decorator', () => {
    const metadata = reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      TestController.prototype.privateRoute,
      TestController,
    ]);
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
