import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, defer } from 'rxjs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  requestContextStore,
  RequestContext,
} from '../context/request-context.store';

/**
 * RequestContextInterceptor - Maintains AsyncLocalStorage context throughout request lifecycle
 *
 * This interceptor wraps the entire request execution, ensuring AsyncLocalStorage context
 * is maintained across all async operations in route handlers, services, and other interceptors.
 *
 * Unlike middleware which only maintains context during the callback, interceptors wrap
 * the entire Observable chain, preserving context through async operations.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();

    // Get or create request ID
    const requestId = request.requestId || uuidv4();
    request.requestId = requestId;

    // Create request context
    const requestContext: RequestContext = {
      requestId,
      traceId: requestId, // Use requestId as traceId for New Relic
    };

    // Use defer to ensure AsyncLocalStorage context is set up when the Observable is subscribed to,
    // not when it's created. This ensures the context is maintained throughout the entire Observable chain,
    // including all async operations in route handlers, services, and other interceptors.
    return defer(() => {
      return requestContextStore.run(requestContext, () => {
        return next.handle();
      });
    });
  }
}
