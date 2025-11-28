import {
  RequirePermission,
  PERMISSIONS_KEY,
} from './require-permission.decorator';
import { Reflector } from '@nestjs/core';
import 'reflect-metadata';

describe('RequirePermission Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  class TestController {
    @RequirePermission('read:guild', 'write:guild')
    guildRoute() {
      return 'guild';
    }

    @RequirePermission('read:user')
    userRoute() {
      return 'user';
    }

    @RequirePermission()
    noPermissionsRoute() {
      return 'no permissions';
    }

    privateRoute() {
      return 'private';
    }
  }

  it('should set PERMISSIONS_KEY metadata with multiple permissions', () => {
    const metadata = reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      TestController.prototype.guildRoute,
      TestController,
    ]);
    expect(metadata).toEqual(['read:guild', 'write:guild']);
  });

  it('should set PERMISSIONS_KEY metadata with single permission', () => {
    const metadata = reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      TestController.prototype.userRoute,
      TestController,
    ]);
    expect(metadata).toEqual(['read:user']);
  });

  it('should set PERMISSIONS_KEY metadata with empty array when no permissions provided', () => {
    const metadata = reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      TestController.prototype.noPermissionsRoute,
      TestController,
    ]);
    expect(metadata).toEqual([]);
  });

  it('should not set metadata on routes without decorator', () => {
    const metadata = reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      TestController.prototype.privateRoute,
      TestController,
    ]);
    expect(metadata).toBeUndefined();
  });

  it('should export PERMISSIONS_KEY constant', () => {
    expect(PERMISSIONS_KEY).toBe('permissions');
  });

  it('should be a function', () => {
    expect(typeof RequirePermission).toBe('function');
  });

  it('should accept variable number of permission arguments', () => {
    const result1 = RequirePermission('read:guild');
    expect(result1).toBeDefined();

    const result2 = RequirePermission(
      'read:guild',
      'write:guild',
      'delete:guild',
    );
    expect(result2).toBeDefined();

    const result3 = RequirePermission();
    expect(result3).toBeDefined();
  });
});
