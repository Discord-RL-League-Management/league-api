import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NewRelicLoggerService } from './newrelic-logger.service';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = axios as unknown as {
  create: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('NewRelicLoggerService', () => {
  let service: NewRelicLoggerService;
  let mockConfigService: ConfigService;
  let mockAxiosInstance: {
    post: ReturnType<typeof vi.fn>;
  };

  const waitForAsyncLog = async () => {
    await vi.waitFor(
      () => {
        expect(mockAxiosInstance.post).toHaveBeenCalled();
      },
      { timeout: 50 },
    );
  };

  beforeEach(async () => {
    mockAxiosInstance = {
      post: vi.fn().mockResolvedValue({ status: 200 }),
    };

    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'newrelic.apiKey') return 'test-api-key';
        if (key === 'newrelic.enabled') return true;
        return undefined;
      }),
    } as unknown as ConfigService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        NewRelicLoggerService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = moduleRef.get<NewRelicLoggerService>(NewRelicLoggerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should_sanitize_jwt_token_in_message_before_sending_to_new_relic', async () => {
      const message =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

      service.log(message, 'TestContext');

      await waitForAsyncLog();

      const logEntry = mockAxiosInstance.post.mock.calls[0][1][0];
      expect(logEntry.message).toContain('[JWT_TOKEN]');
      expect(logEntry.message).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      );
    });

    it('should_sanitize_api_key_in_message_before_sending_to_new_relic', async () => {
      const message =
        'API key: Bearer bot_FAKE_TEST_TOKEN_1234567890.ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      service.log(message, 'TestContext');

      await waitForAsyncLog();

      const logEntry = mockAxiosInstance.post.mock.calls[0][1][0];
      expect(logEntry.message).toContain('[API_KEY]');
      expect(logEntry.message).not.toContain('bot_FAKE_TEST_TOKEN_1234567890');
    });

    it('should_sanitize_sensitive_data_in_trace_before_sending_to_new_relic', async () => {
      const message = 'Test message';
      const trace =
        'Error details: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig, api_key=FAKE_BOT_API_KEY_123';

      service.error(message, trace, 'TestContext');

      await waitForAsyncLog();

      const logEntry = mockAxiosInstance.post.mock.calls[0][1][0];
      expect(logEntry.trace).toBeDefined();
      expect(logEntry.trace).toContain('[JWT_TOKEN]');
      expect(logEntry.trace).toContain('[API_KEY]');
      expect(logEntry.trace).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      );
      expect(logEntry.trace).not.toContain('FAKE_BOT_API_KEY_123');
    });
  });

  describe('error', () => {
    it('should_sanitize_jwt_token_in_error_message_before_sending_to_new_relic', async () => {
      const message =
        'Error with token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig';

      service.error(message, undefined, 'TestContext');

      await waitForAsyncLog();

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      const logEntry = mockAxiosInstance.post.mock.calls[0][1][0];
      expect(logEntry.message).toContain('[JWT_TOKEN]');
      expect(logEntry.message).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      );
    });

    it('should_sanitize_trace_in_metadata_before_sending_to_new_relic', async () => {
      const message = 'Error occurred';
      const trace =
        'Error: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig';

      service.error(message, trace, 'TestContext');

      await waitForAsyncLog();

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      const logEntry = mockAxiosInstance.post.mock.calls[0][1][0];
      expect(logEntry.trace).toContain('[JWT_TOKEN]');
      expect(logEntry.trace).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      );
    });
  });

  describe('warn', () => {
    it('should_sanitize_sensitive_data_in_warning_message_before_sending_to_new_relic', async () => {
      const message =
        'Warning: API key Bearer bot_1234567890.ABCDEFGHIJKLMNOPQRSTUVWXYZ detected';

      service.warn(message, 'TestContext');

      await waitForAsyncLog();

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      const logEntry = mockAxiosInstance.post.mock.calls[0][1][0];
      expect(logEntry.message).toContain('[API_KEY]');
      expect(logEntry.message).not.toContain('bot_1234567890');
    });
  });

  describe('sendToNewRelic - sanitization', () => {
    it('should_sanitize_sensitive_data_in_trace_when_trace_contains_nested_structures', async () => {
      const message = 'Test message';
      const trace =
        'Error: Authorization Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig with api_key=FAKE_BOT_API_KEY_123';

      service.error(message, trace, 'TestContext');

      await waitForAsyncLog();

      const logEntry = mockAxiosInstance.post.mock.calls[0][1][0];
      expect(logEntry.trace).toBeDefined();
      expect(logEntry.trace).toContain('[JWT_TOKEN]');
      expect(logEntry.trace).toContain('[API_KEY]');
      expect(logEntry.trace).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      );
      expect(logEntry.trace).not.toContain('FAKE_BOT_API_KEY_123');
    });

    it('should_not_expose_jwt_tokens_in_log_entries', async () => {
      const message =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

      service.log(message, 'TestContext');

      await waitForAsyncLog();

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      const logEntry = mockAxiosInstance.post.mock.calls[0][1][0];
      const logEntryString = JSON.stringify(logEntry);
      expect(logEntryString).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      );
      expect(logEntryString).not.toContain('eyJzdWIiOiIxMjM0NTY3ODkwIn0');
    });

    it('should_not_expose_api_keys_in_log_entries', async () => {
      const message = 'Test message';
      const metadata = {
        apiKey:
          'Bearer bot_FAKE_TEST_TOKEN_1234567890.ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      };

      service.log(message, 'TestContext');

      await waitForAsyncLog();

      const logEntry = mockAxiosInstance.post.mock.calls[0][1][0];
      const logEntryString = JSON.stringify(logEntry);
      expect(logEntryString).not.toContain('bot_FAKE_TEST_TOKEN_1234567890');
    });
  });
});
