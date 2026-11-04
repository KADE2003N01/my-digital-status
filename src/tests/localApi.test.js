import { beforeEach, describe, expect, it } from 'vitest';
import { localApiFetch, resetLocalApiData } from '../services/localApi.js';

async function responseJson(path, options) {
  const response = await localApiFetch(path, options);
  return { response, body: await response.json() };
}

describe('frontend local API', () => {
  beforeEach(() => resetLocalApiData());

  it('creates, saves, and publishes portfolio data locally', async () => {
    const created = await responseJson('/portfolios', {
      method: 'POST',
      body: JSON.stringify({ slug: 'review-sample', title: 'Review Sample', templateId: 'professional' })
    });
    const id = created.body.portfolio.id;

    await localApiFetch(`/portfolios/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ slug: 'review-sample', title: 'Updated Review Sample' })
    });
    await localApiFetch(`/portfolios/${id}/publish`, { method: 'PUT', body: '{}' });

    const published = await responseJson('/public/review-sample');
    expect(created.response.status).toBe(201);
    expect(published.body.portfolio.status).toBe('published');
    expect(published.body.portfolio.templateId).toBe('professional');
    expect(published.body.portfolio.sections[0].data.title).toBe('Updated Review Sample');
  });

  it('uses local account data and returns placeholder documents without network access', async () => {
    const account = await responseJson('/platform-auth/me');
    const documents = await responseJson('/documents');
    const file = await localApiFetch('/documents/file', { allowBinary: true });

    expect(account.body.user.displayName).toBe('FolioSpace Member');
    expect(documents.body.documents).toHaveLength(2);
    expect(file.headers.get('content-type')).toBe('application/pdf');
  });
});
