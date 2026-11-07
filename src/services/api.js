import { isLocalApiMode, localApiFetch } from './localApi.js';

// Accept the previous env name during migration, but prefer the documented
// VITE_PORTFOLIO_API_BASE_URL setting used by production builds.
const configuredApiUrl = import.meta.env.VITE_PORTFOLIO_API_BASE_URL
  || import.meta.env.VITE_API_BASE_URL;
const localApiPort = Number(import.meta.env.VITE_PORTFOLIO_API_PORT) || 5000;
const liveApiUrl = 'https://kade-status-backend.onrender.com/api';
const { hostname } = window.location;
const localApiHost = hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
const localApiUrl = `http://${localApiHost}:${localApiPort}/api`;
const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
const defaultApiUrls = isLocalHost
  ? ['/api', localApiUrl]
  : [liveApiUrl, '/api'];
const configuredApiUrls = !isLocalHost && configuredApiUrl && !/^https?:\/\//i.test(configuredApiUrl)
  ? [liveApiUrl, configuredApiUrl]
  : [configuredApiUrl];

export const API_BASE_URLS = [...new Set([
  ...configuredApiUrls,
  ...defaultApiUrls
].filter((url) => typeof url === 'string' && url.trim())
  .map((url) => url.trim().replace(/\/+$/, '')))];

export const API_BASE_URL = API_BASE_URLS[0];

/** Resolve API hosted assets independently of the page host. <img> requests do
 * not pass through apiFetch's API fallback, so relative /api URLs can otherwise
 * point at a static frontend host that does not proxy them. */
export function resolveApiAssetUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const candidate = value.trim();
  const localHost = (hostname) => ['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase());
  const isLocalPage = localHost(window.location.hostname);
  const publicApiBase = API_BASE_URLS.find((baseUrl) => {
    if (!/^https?:\/\//i.test(baseUrl)) return false;
    try { return !localHost(new URL(baseUrl).hostname); } catch { return false; }
  });
  const directApiBase = publicApiBase || API_BASE_URLS.find((baseUrl) => /^https?:\/\//i.test(baseUrl));

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (!isLocalPage && localHost(url.hostname) && url.pathname.startsWith('/api/') && publicApiBase) {
        return `${publicApiBase}${url.pathname.slice(4)}${url.search}${url.hash}`;
      }
      if (!isLocalPage && localHost(url.hostname) && url.pathname.startsWith('/api/')) {
        // Let the static host's /api rewrite serve this asset when no direct
        // backend URL was supplied at build time.
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return candidate;
    } catch { return ''; }
  }
  if (!candidate.startsWith('/api/')) return candidate;
  return directApiBase ? `${directApiBase}${candidate.slice(4)}` : candidate;
}

export async function apiFetch(path, options) {
  if (isLocalApiMode) return localApiFetch(path, options);

  let lastError;
  const { allowBinary = false, ...fetchOptions } = options || {};

  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, fetchOptions);
      const contentType = response.headers.get('content-type') || '';

      if (allowBinary) {
        if (response.ok && !contentType.toLowerCase().includes('text/html')) return response;
        if (!contentType.toLowerCase().includes('application/json')) {
          lastError = new Error(`The API route at ${baseUrl} did not return the requested file.`);
          continue;
        }
        return response;
      }

      // Document preview endpoints return PDFs; the other app endpoints return JSON.
      if (contentType.toLowerCase().includes('application/pdf')) return response;

      // Static hosts may return the frontend shell for /api when no proxy is
      // configured; treat that as a miss while keeping JSON auth errors authoritative.
      if (!contentType.toLowerCase().includes('application/json')) {
        if (!(lastError instanceof TypeError)) {
          lastError = new Error(`The API route at ${baseUrl} returned a non-JSON response.`);
        }
        continue;
      }
      return response;
    } catch (error) {
      if (!(error instanceof TypeError) || options?.signal?.aborted) throw error;
      lastError = error;
    }
  }

  if (isLocalHost && !configuredApiUrl && lastError instanceof TypeError) {
    throw new Error(`Cannot connect to the local backend at ${localApiUrl}. Start it from kade-status-backend with npm start.`);
  }

  if (!isLocalHost && lastError instanceof TypeError) {
    throw new Error('Unable to reach the FolioSpace API. Confirm the production API URL and allow this frontend origin in the backend FRONTEND_URL setting.', { cause: lastError });
  }

  throw lastError || new Error('The API did not return a JSON response.');
}
