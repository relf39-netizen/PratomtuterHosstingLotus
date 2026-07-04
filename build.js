import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

async function main() {
  console.log('--- Starting Programmatic Vite Client Build ---');
  try {
    await build({
      configFile: false,
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: true, // Cleans the output directory before build
      }
    });
    console.log('✅ Vite Client Build Completed successfully.');
  } catch (error) {
    console.error('❌ Vite Client Build Failed:', error);
    process.exit(1);
  }

  console.log('--- Starting Server Compilation ---');
  try {
    // Compile server.ts using tsc with explicitly defined options to bypass esbuild's permission issues on IIS/Plesk
    execSync('npx tsc server.ts --target ES2022 --module ESNext --moduleResolution node --outDir dist --noEmit false --esModuleInterop true --skipLibCheck true', { stdio: 'inherit' });
    console.log('✅ Server Compilation Completed successfully.');
  } catch (error) {
    console.error('❌ Server Compilation Failed:', error);
    process.exit(1);
  }
}

main();
