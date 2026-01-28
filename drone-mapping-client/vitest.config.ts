/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vitest Configuration
 * 
 * This configuration sets up the testing environment for the drone-mapping-client.
 * - Uses jsdom for DOM simulation
 * - Configures path aliases to match vite.config.ts
 * - Sets up coverage reporting with v8 provider
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for simulating browser environment
    environment: 'jsdom',
    
    // Global test utilities (describe, it, expect)
    globals: true,
    
    // Setup files run before each test file
    setupFiles: ['./src/test/setup.ts'],
    
    // Include test files matching these patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    
    // Exclude node_modules and build outputs
    exclude: ['node_modules', 'dist'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
