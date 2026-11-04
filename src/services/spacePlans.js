export const USD_RWF_ESTIMATE = 1450;
export const SPACE_ONBOARDING_KEY = 'foliospace-onboarding-v1';

export const spacePlans = [
  {
    id: 'free',
    name: 'Free',
    priceRwf: 0,
    description: 'Start with the essentials and publish your first professional space.',
    features: [
      'One portfolio space',
      'Classic template',
      'About and skills sections',
      'Public FolioSpace address'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    priceRwf: 10000,
    description: 'A more expressive portfolio for your work and experience.',
    features: [
      'Everything in Free',
      'Studio template',
      'Expanded profile sections',
      'Recruiter access controls'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    priceRwf: 15000,
    description: 'A polished space for a complete professional story.',
    features: [
      'Everything in Standard',
      'Executive template',
      'Advanced portfolio sections',
      'Enhanced profile presentation'
    ]
  }
];

export function getSpacePlan(planId) {
  return spacePlans.find((plan) => plan.id === planId) || spacePlans[0];
}

export function formatSpacePrice(plan, currency = 'RWF') {
  if (currency === 'USD') {
    const dollars = plan.priceRwf / USD_RWF_ESTIMATE;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(dollars);
  }
  return `${new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(plan.priceRwf)} RWF`;
}

export function readSpaceOnboarding() {
  try {
    const saved = window.localStorage.getItem(SPACE_ONBOARDING_KEY);
    if (!saved) return null;
    const onboarding = JSON.parse(saved);
    return onboarding && typeof onboarding === 'object' ? onboarding : null;
  } catch (error) {
    console.warn('Could not read the saved space setup progress.', error);
    return null;
  }
}

export function shouldBypassSubscriptionGate() {
  if (typeof window === 'undefined') return false;
  const urlValue = new URLSearchParams(window.location.search).get('skipPayment');
  const localFlag = window.localStorage.getItem('foliospace-skip-payment') === 'true';
  return Boolean(import.meta.env.DEV && (urlValue === '1' || urlValue === 'true' || localFlag));
}

export function setSkipSubscriptionGate(value) {
  try {
    if (value) {
      window.localStorage.setItem('foliospace-skip-payment', 'true');
    } else {
      window.localStorage.removeItem('foliospace-skip-payment');
    }
  } catch (error) {
    console.warn('Could not update the subscription bypass flag.', error);
  }
}

export function saveSpaceOnboarding(updates) {
  const current = readSpaceOnboarding() || {};
  const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(SPACE_ONBOARDING_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Could not save your space setup progress in this browser.', error);
    throw new Error('Your progress could not be saved in this browser. Check storage settings and try again.');
  }
  return next;
}
