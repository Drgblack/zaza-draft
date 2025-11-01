import { vi } from 'vitest';

export const mockDoc = {
  exists: vi.fn(),
  data: vi.fn(),
  update: vi.fn(),
};

export const mockFirestore = {
  doc: () => mockDoc,
  collection: () => ({
    doc: () => mockDoc,
  }),
};

export const mockAuth = {
  currentUser: null,
};

export const mockDbAdmin = {
  doc: () => ({
    update: vi.fn(),
  }),
  collection: () => ({
    where: () => ({
      limit: () => ({
        get: vi.fn(),
      }),
    }),
  }),
};