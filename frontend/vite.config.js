import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app must run on port 5173 because the PHP backend only
// allows requests from http://localhost:5173 (see backend/config/config.php).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
