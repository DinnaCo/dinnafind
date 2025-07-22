// Mock logger for tests
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  geofence: jest.fn(),
};

export const logger = mockLogger;

// For default export compatibility
export default mockLogger;
