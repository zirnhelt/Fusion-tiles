import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // './' uses relative paths — works for both GitHub Pages and itch.io
  base: './',
});
