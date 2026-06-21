import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // Required for wagmi/viem — they use Node builtins (Buffer, process, etc.)
        nodePolyfills({
            include: ['buffer', 'process', 'util', 'stream', 'events'],
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
    ],
    esbuild: {
        loader: 'tsx',
        include: /src\/.*\.[jt]sx?$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    define: {
        // viem / wagmi compatibility shim
        global: 'globalThis',
    },
    server: {
        port: 3000,
        open: false,
        proxy: {
            // During dev, proxy /api calls to Spring Boot so no CORS issues
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'build',
        sourcemap: false,
        rollupOptions: {
            output: {
                // Split vendor chunks for better caching
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    web3: ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
                    query: ['@tanstack/react-query'],
                },
            },
        },
    },
});
