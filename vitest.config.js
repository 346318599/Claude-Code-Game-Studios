// vitest.config.js — W2 T2.4 起启用 happy-dom 默认环境
//
// 历史：T2.1-T2.3 都是纯逻辑层，用 node 环境跑。
// T2.4 开始测 HUD/ActionPanel（DOM overlay），需要 happy-dom 提供
// window/document。统一改全局 happy-dom 也无副作用（纯逻辑测试
// 不用 window）。
//
// 备选方案：每个测试文件加 `// @vitest-environment happy-dom` 头部注释。
// 选全局是因为以后所有 DOM 测试都自然要它。

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    // happy-dom env creation is ~5s per file; default `forks` pool
    // spawns 12 workers (one per test file) which dominates total time.
    // vmThreads reuses envs across files in the same worker — drops
    // total from ~26s to ~5s for our suite.
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        // Single worker shares env across files (small suite, no cross-file mutation concerns).
        singleThread: true,
      },
    },
  },
});