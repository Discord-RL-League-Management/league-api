/* eslint-disable @typescript-eslint/unbound-method */
import { Public, IS_PUBLIC_KEY } from './public.decorator';
import { Reflector } from '@nestjs/core';
import 'reflect-metadata';

describe('Public Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  class TestController {
    @Public()
    publicRoute() {
      return 'public';
    }

    privateRoute() {
      return 'private';
    }
  }

  it('should set IS_PUBLIC_KEY metadata to true', () => {
    const metadata = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      TestController.prototype.publicRoute,
      TestController,
    ]);
    expect(metadata).toBe(true);
  });

  it('should not set metadata on routes without decorator', () => {
    const metadata = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      TestController.prototype.privateRoute,
      TestController,
    ]);
    expect(metadata).toBeUndefined();
  });

  it('should export IS_PUBLIC_KEY constant', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('should be a function', () => {
    expect(typeof Public).toBe('function');
  });

  it('should return SetMetadata result', () => {
    const result = Public();
    expect(result).toBeDefined();
  });
});
