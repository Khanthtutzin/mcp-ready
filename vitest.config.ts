import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Fixture servers are real processes and real sockets; give them room.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Each suite spawns servers and binds ports. Running files serially keeps
    // port allocation and child-process cleanup predictable across platforms.
    fileParallelism: false,
  },
});
