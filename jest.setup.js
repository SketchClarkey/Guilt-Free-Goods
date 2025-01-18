require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

jest.mock('next-auth', () => ({
  ...jest.requireActual('next-auth'),
  getServerSession: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashedpassword'),
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 