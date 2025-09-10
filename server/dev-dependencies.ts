// Development-only dependencies isolated from production bundle
// This file should only be imported in development environments

/**
 * Dynamic imports for development dependencies to prevent them from being
 * bundled in production builds. This fixes Vite pre-transform errors in production.
 */

// Only export development utilities when in development mode
export const isDevelopment = process.env.NODE_ENV !== 'production';

// Vite development server setup
export async function loadViteDevServer() {
  if (!isDevelopment) {
    throw new Error('Vite dev server is only available in development mode');
  }
  
  try {
    // Dynamic import ensures Vite is not bundled in production
    const { setupVite } = await import('./vite.js');
    return setupVite;
  } catch (error) {
    console.warn('Vite development dependencies not available:', error);
    return null;
  }
}

// Static file server for production fallback
export async function loadStaticServer() {
  if (!isDevelopment) {
    try {
      // Only load static server utilities in production
      const { serveStatic } = await import('./vite.js');
      return serveStatic;
    } catch (error) {
      console.warn('Static server fallback not available:', error);
      return null;
    }
  }
  return null;
}

// Development mode detection with fallbacks
export function isProductionMode(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.REPL_DEPLOYMENT === 'true' ||
    !isDevelopment
  );
}

// Cache control for development vs production
export function getCacheHeaders() {
  if (isProductionMode()) {
    return {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': `"${Date.now()}"`,
    };
  } else {
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }
}