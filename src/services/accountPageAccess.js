export const ACCOUNT_PAGE_OPTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'subscription', label: 'Subscriptions' },
  { id: 'benefits', label: 'Privileges' },
  { id: 'chat', label: 'General chat' },
  { id: 'settings', label: 'Settings' },
  { id: 'support', label: 'Support' },
  { id: 'support-chat', label: 'Request chat room' },
  { id: 'gallery', label: 'Gallery' }
];

export const DEFAULT_ACCOUNT_PAGE_ACCESS = {
  free: ['overview', 'profile', 'security', 'subscription', 'benefits', 'settings', 'support'],
  standard: ['overview', 'profile', 'security', 'subscription', 'benefits', 'settings', 'support', 'gallery'],
  professional: ['overview', 'profile', 'security', 'subscription', 'benefits', 'chat', 'settings', 'support', 'support-chat', 'gallery']
};
