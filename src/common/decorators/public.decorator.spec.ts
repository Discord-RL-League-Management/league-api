import { Public, IS_PUBLIC_KEY } from './public.decorator';
import 'reflect-metadata';

describe('Public Decorator', () => {
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
    const metadata = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype,
      'publicRoute',
    ) as boolean | undefined;
    expect(metadata).toBe(true);
  });

  it('should not set metadata on routes without decorator', () => {
    const metadata = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype,
      'privateRoute',
    ) as boolean | undefined;
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
