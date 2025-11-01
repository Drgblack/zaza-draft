import { vi } from 'vitest';

export const mockStripe = {
  webhooks: {
    constructEvent: vi.fn(),
  },
};
export const mockDbAdminGet = vi.fn();

const mockDbAdminLimit = { get: mockDbAdminGet };
const mockDbAdminWhere = { limit: vi.fn(() => mockDbAdminLimit) };
const mockDbAdminCollection = { where: vi.fn(() => mockDbAdminWhere) };

export const mockDbAdmin = {
  collection: vi.fn(() => mockDbAdminCollection),
};