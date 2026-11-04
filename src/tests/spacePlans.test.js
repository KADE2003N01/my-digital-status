import { beforeEach, describe, expect, it } from 'vitest';
import {
  formatSpacePrice,
  getSpacePlan,
  readSpaceOnboarding,
  saveSpaceOnboarding,
  spacePlans
} from '../services/spacePlans.js';

describe('FolioSpace plans and saved onboarding', () => {
  beforeEach(() => window.localStorage.clear());

  it('uses the selected six-month RWF prices and provides an estimated USD display', () => {
    expect(spacePlans.map(({ priceRwf }) => priceRwf)).toEqual([0, 10000, 15000]);
    expect(formatSpacePrice(getSpacePlan('free'), 'RWF')).toBe('0 RWF');
    expect(formatSpacePrice(getSpacePlan('standard'), 'USD')).toBe('$6.90');
    expect(formatSpacePrice(getSpacePlan('professional'), 'USD')).toBe('$10.34');
  });

  it('persists the selected plan and resumes at its saved stage', () => {
    saveSpaceOnboarding({ templateId: 'professional', email: 'member@example.com', stage: 'payment' });
    saveSpaceOnboarding({ currency: 'USD' });

    expect(readSpaceOnboarding()).toMatchObject({
      templateId: 'professional',
      email: 'member@example.com',
      stage: 'payment',
      currency: 'USD'
    });
  });
});
