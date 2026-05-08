import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
    base: '/dongaProject/',
    plugins: [plugin(), cloudflare()],
    server: {
        port: 51482,
        proxy: {
            '/api': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
        },
    }
})