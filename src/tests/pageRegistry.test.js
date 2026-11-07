import { describe, expect, it } from 'vitest';
import { defaultPage, getLegacyPagePath, getPageForPath, pageRegistry } from '../app/pageRegistry.js';

describe('page registry', () => {
  it('keeps every React route mapped to a component, title, and legacy aliases', () => {
    for (const page of pageRegistry) {
      expect(page.component).toBeTruthy();
      expect(page.title).toBeTruthy();
      expect(typeof page.bodyClassName).toBe('string');
      expect(Array.isArray(page.aliases)).toBe(true);
    }
  });

  it('keeps administrative and platform pages out of search indexes', () => {
    for (const page of pageRegistry) {
      if (page.path.startsWith('/admin') || page.path.startsWith('/platform') && page.path !== '/portfolio') {
        expect(page.noIndex).toBe(true);
      }
    }
  });

  it('maps legacy HTML URLs to clean React paths', () => {
    expect(getLegacyPagePath('/platform-login.html')).toBe('/platform/login');
    expect(getLegacyPagePath('/src/about.html')).toBe('/about');
    expect(getLegacyPagePath('/platform/platform-signup.html')).toBe('/platform/signup');
    expect(getLegacyPagePath('/platform/')).toBe('/platform');
    expect(getLegacyPagePath('/')).toBeNull();
    expect(getPageForPath('/platform/dashboard')?.component).toBe('platformDashboard');
  });

  it('uses the FolioSpace landing page as its default route', () => {
    expect(defaultPage.path).toBe('/');
    expect(defaultPage.component).toBe('platformLanding');
    expect(getPageForPath('/portfolio-home')?.component).toBe('homepage');
    expect(getPageForPath('/platform/subscribe')?.component).toBe('platformSubscribe');
    expect(getPageForPath('/platform/space-setup')?.component).toBe('platformSpaceSetup');
  });

  it('resolves account sections as bookmarkable routes without redirecting them', () => {
    for (const section of ['overview', 'profile', 'security', 'subscription', 'benefits', 'chat', 'settings', 'support', 'support-chat', 'gallery']) {
      const path = `/platform/account/${section}`;
      expect(getPageForPath(path)?.component).toBe('platformAccount');
      expect(getLegacyPagePath(path)).toBeNull();
    }

    expect(getLegacyPagePath('/platform/account/profile/')).toBe('/platform/account/profile');
    expect(getPageForPath('/platform/account/not-a-section')).toBeNull();
  });
});
