interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry<any>>();

// Garbage collect expired entries every 30 seconds to keep memory lean (<5MB)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.expiresAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 30000);
}

export const memoryCache = {
  get<T>(key: string): T | null {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return entry.data;
  },

  set<T>(key: string, data: T, ttlSeconds: number = 5): void {
    memoryStore.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  del(key: string): void {
    memoryStore.delete(key);
  },
};
