import "@testing-library/jest-dom"

import { vi } from "vitest"

const createSearchParams = (initial: Record<string, string | string[]> = {}) => {
  const params = new URLSearchParams()
  Object.entries(initial).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
    } else {
      params.append(key, value)
    }
  })

  const proxy = {
    get: (key: string) => params.get(key),
    getAll: (key: string) => params.getAll(key),
    has: (key: string) => params.has(key),
    entries: () => params.entries(),
    keys: () => params.keys(),
    values: () => params.values(),
    toString: () => params.toString(),
    [Symbol.iterator]: () => params.entries(),
  }

  return proxy
}

const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  pathname: "/",
}

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => createSearchParams(),
}))
