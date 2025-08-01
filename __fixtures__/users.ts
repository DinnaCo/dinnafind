/**
 * User fixture data for tests
 * Provides consistent user objects across all tests
 */

export const mockUserWithPhoto = {
  displayName: 'John Doe',
  email: 'john@example.com',
  photoUrl: 'https://example.com/avatar.jpg',
  uid: 'user-123',
};

export const mockUserWithoutPhoto = {
  displayName: 'Jane Smith',
  email: 'jane@example.com',
  uid: 'user-456',
};

export const mockUserSingleName = {
  displayName: 'John',
  email: 'john@example.com',
  uid: 'user-789',
};

export const mockUserEmailOnly = {
  email: 'john@example.com',
  uid: 'user-101',
};

export const mockUserEmpty = {
  uid: 'user-102',
};

export const mockUserForSnapshot = {
  displayName: 'Snapshot User',
  email: 'snapshot@example.com',
  uid: 'user-snapshot',
};
