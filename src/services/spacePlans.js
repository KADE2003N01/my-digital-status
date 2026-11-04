export const USD_RWF_ESTIMATE = 1450;
export const SPACE_ONBOARDING_KEY = 'foliospace-onboarding-v1';
// Keep checkout out of the onboarding path until a billing provider is ready.
// Set this to true to restore the subscription step across environments.
export const SUBSCRIPTION_FLOW_ENABLED = false;

// Section ids here match the backend `portfolio_sections.type` values so the
// frontend gates and the server gates can never drift apart.
const CORE_SECTIONS = ['hero', 'about', 'skills', 'contact'];
const STANDARD_SECTIONS = [...CORE_SECTIONS, 'experience', 'education', 'projects'];
const PROFESSIONAL_SECTIONS = [...STANDARD_SECTIONS, 'certificates', 'video_pitch'];

const FEATURE_LABELS = {
  maxSpaces: 'Portfolio spaces',
  watermark: 'FolioSpace watermark',
  customColors: 'Custom colors & accent',
  visitorStats: 'Visitor statistics',
  privateSections: 'Private sections',
  subdomain: 'FolioSpace subdomain',
  customDomain: 'Custom domain',
  seoControls: 'SEO controls',
  pdfExport: 'PDF export',
  qrCode: 'QR code',
  priorityPlacement: 'Priority directory placement',
  branding: 'Full brand control'
};

export const planFeatures = FEATURE_LABELS;

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
    ],
    limits: {
      maxSpaces: 1,
      sections: CORE_SECTIONS,
      templates: ['classic'],
      watermark: true,
      customColors: false,
      visitorStats: false,
      privateSections: false,
      subdomain: false,
      customDomain: false,
      seoControls: false,
      pdfExport: false,
      qrCode: false,
      priorityPlacement: false,
      branding: false
    }
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
    ],
    limits: {
      maxSpaces: 3,
      sections: STANDARD_SECTIONS,
      templates: ['classic', 'studio'],
      watermark: false,
      customColors: true,
      visitorStats: true,
      privateSections: true,
      subdomain: true,
      customDomain: false,
      seoControls: false,
      pdfExport: false,
      qrCode: false,
      priorityPlacement: false,
      branding: false
    }
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
    ],
    limits: {
      maxSpaces: Infinity,
      sections: PROFESSIONAL_SECTIONS,
      templates: ['classic', 'studio', 'executive'],
      watermark: false,
      customColors: true,
      visitorStats: true,
      privateSections: true,
      subdomain: true,
      customDomain: true,
      seoControls: true,
      pdfExport: true,
      qrCode: true,
      priorityPlacement: true,
      branding: true
    }
  }
];

export function getSpacePlan(planId) {
  return spacePlans.find((plan) => plan.id === planId) || spacePlans[0];
}

// Does this plan allow the feature?
export function planAllows(planId, feature) {
  const plan = getSpacePlan(planId);
  return Boolean(plan.limits?.[feature]);
}

// Which plans offer this feature? (used to render "Upgrade to unlock" chips)
export function minimumPlanFor(feature) {
  return spacePlans.find((plan) => Boolean(plan.limits?.[feature]))?.id ?? null;
}

// Is a section type available on this plan? (used by editor + server gates)
export function planAllowsSection(planId, sectionType) {
  return getSpacePlan(planId).limits.sections.includes(sectionType);
}

// Is a template available on this plan? (used by the template picker)
export function planAllowsTemplate(planId, templateId) {
  return getSpacePlan(planId).limits.templates.includes(templateId);
}

// How many more spaces can this plan create? (used for the space-creation gate)
export function remainingSpaces(planId, ownedCount) {
  const max = getSpacePlan(planId).limits.maxSpaces;
  return Math.max(0, max - ownedCount);
}

// Human-readable list of everything a plan unlocks — used by the Privileges tab
// and the upgrade modal so the UI never claims a feature the plan does not have.
export function planPrivileges(planId) {
  const plan = getSpacePlan(planId);
  const { limits } = plan;
  const privileges = [
    `${limits.maxSpaces === Infinity ? 'Unlimited' : `Up to ${limits.maxSpaces}`} portfolio space${limits.maxSpaces === 1 ? '' : 's'}`,
    `${plan.id === 'free' ? 'Classic' : plan.id === 'standard' ? 'Classic + Studio' : 'Classic + Studio + Executive'} templates`,
    ...limits.sections.map((section) => `${section.charAt(0).toUpperCase()}${section.slice(1)} section`)
  ];
  for (const [feature, label] of Object.entries(FEATURE_LABELS)) {
    if (feature === 'maxSpaces') continue;
    if (feature === 'watermark') {
      privileges.push(limits.watermark ? 'FolioSpace watermark on your public page' : 'No FolioSpace watermark');
      continue;
    }
    if (limits[feature]) privileges.push(label);
  }
  return privileges;
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
  if (!SUBSCRIPTION_FLOW_ENABLED || typeof window === 'undefined') return true;
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
