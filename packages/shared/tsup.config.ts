import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  // В watch-режиме не чистим dist: иначе на старте `pnpm dev` временно пропадают
  // .d.ts, и backend (nest tsc watch) падает с TS7016, пока tsup не пересоберёт типы.
  clean: !options.watch,
  sourcemap: true,
  splitting: false,
  treeshake: true,
}));
