import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request context store using AsyncLocalStorage
 * Allows storing request-scoped data that can be accessed anywhere in the request lifecycle
 */
export interface RequestContext {
  requestId?: string;
  traceId?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStore.getStore();
}

/**
 * Get the trace ID from the current request context
 */
export function getTraceId(): string | undefined {
  const context = getRequestContext();
  return context?.traceId || context?.requestId;
}



