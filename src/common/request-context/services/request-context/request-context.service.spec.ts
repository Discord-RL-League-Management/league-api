/**
 * RequestContextService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { RequestContextService } from './request-context.service';
import type { Request } from 'express';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RequestContextService],
    }).compile();

    service = moduleRef.get<RequestContextService>(RequestContextService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getIpAddress', () => {
    it('should_return_forwarded_ip_when_x_forwarded_for_header_present', () => {
      const mockRequest = {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const result = service.getIpAddress(mockRequest);

      expect(result).toBe('192.168.1.1');
    });

    it('should_return_request_ip_when_no_forwarded_header', () => {
      const mockRequest = {
        headers: {},
        ip: '192.168.1.100',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const result = service.getIpAddress(mockRequest);

      expect(result).toBe('192.168.1.100');
    });

    it('should_return_socket_address_when_no_ip_available', () => {
      const mockRequest = {
        headers: {},
        ip: undefined,
        socket: { remoteAddress: '10.0.0.50' },
      } as unknown as Request;

      const result = service.getIpAddress(mockRequest);

      expect(result).toBe('10.0.0.50');
    });

    it('should_return_unknown_when_no_ip_source_available', () => {
      const mockRequest = {
        headers: {},
        ip: undefined,
        socket: { remoteAddress: undefined },
      } as unknown as Request;

      const result = service.getIpAddress(mockRequest);

      expect(result).toBe('unknown');
    });
  });

  describe('getUserAgent', () => {
    it('should_return_user_agent_when_header_present', () => {
      const mockRequest = {
        headers: { 'user-agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
      } as unknown as Request;

      const result = service.getUserAgent(mockRequest);

      expect(result).toBe('Mozilla/5.0 Chrome/120.0.0.0');
    });

    it('should_return_unknown_when_no_user_agent_header', () => {
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      const result = service.getUserAgent(mockRequest);

      expect(result).toBe('unknown');
    });
  });

  describe('getRequestId', () => {
    it('should_return_existing_request_id_when_present', () => {
      const mockRequest = {
        requestId: 'existing-request-id-123',
      } as unknown as Request & { requestId?: string };

      const result = service.getRequestId(mockRequest);

      expect(result).toBe('existing-request-id-123');
    });

    it('should_generate_uuid_when_no_request_id_present', () => {
      const mockRequest = {} as unknown as Request & { requestId?: string };

      const result = service.getRequestId(mockRequest);

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should_set_request_id_on_request_object_when_generated', () => {
      const mockRequest = {} as unknown as Request & { requestId?: string };

      const result = service.getRequestId(mockRequest);

      expect(mockRequest.requestId).toBe(result);
    });
  });
});
