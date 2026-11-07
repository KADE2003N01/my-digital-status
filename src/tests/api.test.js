import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolveApiAssetUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('moves stale localhost image URLs to the public API when the site is deployed', async () => {
    vi.stubGlobal('window', { location: { hostname: 'portfolio.example.com' } });
    const { resolveApiAssetUrl } = await import('../services/api.js');
    const path = '/api/homepage/profile-image/profile-example.jpg';

    expect(resolveApiAssetUrl(`http://localhost:5000${path}`))
      .toBe(`https://kade-status-backend.onrender.com${path}`);
  });

  it('keeps localhost image URLs for local development', async () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
    const { resolveApiAssetUrl } = await import('../services/api.js');

    expect(resolveApiAssetUrl('http://localhost:5000/api/homepage/profile-image/profile-example.jpg'))
      .toBe('http://localhost:5000/api/homepage/profile-image/profile-example.jpg');
  });
});

describe('production API routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('tries the public backend before the static site API rewrite', async () => {
    vi.stubGlobal('window', { location: { hostname: 'portfolio.example.com' } });
    const { API_BASE_URLS, apiFetch } = await import('../services/api.js');
    const fetch = vi.fn().mockResolvedValue(new Response('{"status":"OK"}', {
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetch);

    expect(API_BASE_URLS.slice(0, 2)).toEqual([
      'https://kade-status-backend.onrender.com/api',
      '/api'
    ]);
    await apiFetch('/platform-auth/me');

    expect(fetch).toHaveBeenCalledWith(
      'https://kade-status-backend.onrender.com/api/platform-auth/me',
      {}
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('prefers the backend when a static-site API rewrite is configured', async () => {
    vi.stubGlobal('window', { location: { hostname: 'portfolio.example.com' } });
    vi.stubEnv('VITE_PORTFOLIO_API_BASE_URL', '/api');
    const { API_BASE_URLS } = await import('../services/api.js');

    expect(API_BASE_URLS.slice(0, 2)).toEqual([
      'https://kade-status-backend.onrender.com/api',
      '/api'
    ]);
  });

  it('reports production network or CORS failures instead of a static HTML proxy miss', async () => {
    vi.stubGlobal('window', { location: { hostname: 'portfolio.example.com' } });
    const { apiFetch } = await import('../services/api.js');
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('<html></html>', {
        headers: { 'content-type': 'text/html' }
      })));

    await expect(apiFetch('/platform-auth/login')).rejects.toThrow(
      'Confirm the production API URL and allow this frontend origin in the backend FRONTEND_URL setting.'
    );
  });
});
