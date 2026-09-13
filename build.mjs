// Set thread and process limits for shared hosting / CloudLinux cPanel environments
process.env.GOMAXPROCS = process.env.GOMAXPROCS || '1';
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '1';

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import * as esbuild from 'esbuild';
import fs from 'fs';

async function main() {
  console.log('--- Updating Build Version & Timestamp ---');
  const now = new Date();
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const day = now.getDate();
  const month = thaiMonths[now.getMonth()];
  const year = now.getFullYear() + 543;
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timestampStr = `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;

  if (process.env.UPDATE_VERSION === 'true') {
    const versionContent = `// Auto-generated during build\nexport const APP_VERSION = "v1.1.2";\nexport const BUILD_TIME = "${timestampStr}";\n`;
    fs.writeFileSync('./src/version.ts', versionContent, 'utf-8');
    console.log(`✅ Version updated: ${timestampStr}`);
  } else {
    console.log(`ℹ️ Using current version from src/version.ts`);
  }

  console.log('--- Starting Programmatic Vite Client Build ---');
  try {
    await build({
      configFile: false,
      base: './',
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: true, // Cleans the output directory before build
        rollupOptions: {
          maxParallelFileOps: 2,
        },
      },
    });
    console.log('✅ Vite Client Build Completed successfully.');
  } catch (error) {
    console.error('❌ Vite Client Build Failed:', error);
    process.exit(1);
  }

  console.log('--- Starting Server Compilation (CommonJS with esbuild) ---');
  try {
    // Compile server.ts to CommonJS using programmatic esbuild (low memory, 0 spawned processes to prevent EAGAIN)
    await esbuild.build({
      entryPoints: ['server.ts'],
      bundle: false,
      platform: 'node',
      format: 'cjs',
      target: 'node18',
      outfile: 'dist/server.js',
    });
    console.log('✅ Server Compilation Completed successfully.');
  } catch (error) {
    console.error('❌ Server Compilation Failed:', error);
    process.exit(1);
  }
}

main();
