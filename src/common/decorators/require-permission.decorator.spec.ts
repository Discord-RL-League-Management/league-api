import {
  RequirePermission,
  PERMISSIONS_KEY,
} from './require-permission.decorator';
import 'reflect-metadata';

describe('RequirePermission Decorator', () => {
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
    const metadata = Reflect.getMetadata(
      PERMISSIONS_KEY,
      TestController.prototype,
      'guildRoute',
    ) as string[] | undefined;
    expect(metadata).toEqual(['read:guild', 'write:guild']);
  });

  it('should set PERMISSIONS_KEY metadata with single permission', () => {
    const metadata = Reflect.getMetadata(
      PERMISSIONS_KEY,
      TestController.prototype,
      'userRoute',
    ) as string[] | undefined;
    expect(metadata).toEqual(['read:user']);
  });

  it('should set PERMISSIONS_KEY metadata with empty array when no permissions provided', () => {
    const metadata = Reflect.getMetadata(
      PERMISSIONS_KEY,
      TestController.prototype,
      'noPermissionsRoute',
    ) as string[] | undefined;
    expect(metadata).toEqual([]);
  });

  it('should not set metadata on routes without decorator', () => {
    const metadata = Reflect.getMetadata(
      PERMISSIONS_KEY,
      TestController.prototype,
      'privateRoute',
    ) as string[] | undefined;
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
