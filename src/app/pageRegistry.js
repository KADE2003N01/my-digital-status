export const pageRegistry = [
  { path: '/', aliases: ['/index.html'], component: 'platformLanding', title: 'FolioSpace | Your Work. Your Space. Your Future.', bodyClassName: '' },
  { path: '/portfolio-home', aliases: ['/portfolio-home.html'], component: 'homepage', title: 'David KWIZERA | Portfolio', bodyClassName: '' },
  { path: '/about', aliases: ['/about.html', '/src/about.html'], component: 'about', title: 'About | David KWIZERA Portfolio', bodyClassName: '' },
  { path: '/background', aliases: ['/background.html', '/src/background.html'], component: 'background', title: 'Background | David KWIZERA Portfolio', bodyClassName: '' },
  { path: '/skills', aliases: ['/skills.html', '/src/skills.html'], component: 'skills', title: 'Skills | David KWIZERA Portfolio', bodyClassName: '' },
  { path: '/hobbies', aliases: ['/hobbies.html', '/src/hobbies.html'], component: 'hobbies', title: 'Hobbies | David KWIZERA Portfolio', bodyClassName: '' },
  { path: '/documents', aliases: ['/document.html', '/src/document.html'], component: 'documents', title: 'Documents | David KWIZERA Portfolio', bodyClassName: '' },
  { path: '/contact', aliases: ['/contact.html', '/src/contact.html'], component: 'contact', title: 'Contact | David KWIZERA Portfolio', bodyClassName: '' },
  { path: '/admin/login', aliases: ['/admin-login.html', '/src/admin-login.html'], component: 'adminLogin', title: 'Admin Login | Kade Portfolio', bodyClassName: 'auth-page', noIndex: true },
  { path: '/admin/support', aliases: ['/admin-support.html', '/src/admin-support.html'], component: 'adminSupport', title: 'Administrator Support | Kade Portfolio', bodyClassName: 'auth-page', noIndex: true },
  { path: '/admin', aliases: ['/admin.html', '/src/admin.html'], component: 'adminOverview', title: 'Portfolio Admin | Kade', bodyClassName: 'admin-page auth-pending', noIndex: true },
  { path: '/admin/downloads', aliases: ['/admin-downloads.html', '/src/admin-downloads.html'], component: 'adminDownloads', title: 'Downloads | Portfolio Admin', bodyClassName: 'admin-page auth-pending', noIndex: true },
  { path: '/admin/homepage', aliases: ['/admin-homepage.html', '/src/admin-homepage.html'], component: 'adminHomepage', title: 'Landing Page | Portfolio Admin', bodyClassName: 'admin-page auth-pending', noIndex: true },
  { path: '/admin/documents', aliases: ['/admin-documents.html', '/src/admin-documents.html'], component: 'adminDocuments', title: 'Documents | Portfolio Admin', bodyClassName: 'admin-page auth-pending', noIndex: true },
  { path: '/admin/profile', aliases: ['/admin-profile.html', '/src/admin-profile.html'], component: 'adminProfile', title: 'My Profile | Portfolio Admin', bodyClassName: 'admin-page auth-pending', noIndex: true },
  { path: '/admin/accounts', aliases: ['/admin-accounts.html', '/src/admin-accounts.html'], component: 'adminAccounts', title: 'Admin Directory | Portfolio Admin', bodyClassName: 'admin-page auth-pending', noIndex: true },
  { path: '/admin/messages', aliases: ['/admin-messages.html', '/src/admin-messages.html'], component: 'adminMessages', title: 'Messages | Portfolio Admin', bodyClassName: 'admin-page auth-pending', noIndex: true },
  { path: '/admin/chatroom-preview', aliases: ['/chatroom-preview.html', '/src/chatroom-preview.html'], component: 'chatroomPreview', title: 'Chatroom Preview | Portfolio Admin', bodyClassName: 'chatroom-preview-page-body', noIndex: true },
  { path: '/platform/owner', aliases: ['/platform-owner.html', '/src/platform-owner.html'], component: 'platformOwner', title: 'Super Admin Portal | Portfolio Admin', bodyClassName: 'admin-page auth-pending', noIndex: true },
  { path: '/admin/setup-account', aliases: ['/admin-setup-account.html', '/src/admin-setup-account.html'], component: 'adminPasswordReset', title: 'Set Up Admin Account | Kade Portfolio', bodyClassName: 'auth-page', noIndex: true },
  { path: '/admin/reset-password', aliases: ['/admin-reset-password.html', '/src/admin-reset-password.html'], component: 'adminPasswordReset', title: 'Reset Admin Password | Portfolio Admin', bodyClassName: 'auth-page', noIndex: true },
  { path: '/platform', aliases: ['/platform-landing.html', '/src/platform-landing.html'], component: 'platformLanding', title: 'FolioSpace | Your Work. Your Space. Your Future.', bodyClassName: '', noIndex: true },
  { path: '/platform/login', aliases: ['/platform-login.html', '/src/platform-login.html'], component: 'platformAuth', title: 'Sign In | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/signup', aliases: ['/platform-signup.html', '/src/platform-signup.html'], component: 'platformAuth', title: 'Create Account | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/templates', aliases: ['/platform-templates.html', '/src/platform-templates.html'], component: 'platformTemplates', title: 'Choose a FolioSpace Template | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/help', aliases: [], component: 'platformHelp', title: 'FAQs & Documentation | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/system-issues', aliases: [], component: 'platformSystemIssues', title: 'System Based Issues | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/verify-email', aliases: ['/platform-verify-email.html', '/src/platform-verify-email.html'], component: 'platformAuth', title: 'Verify Email | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/forgot-password', aliases: ['/platform-forgot-password.html', '/src/platform-forgot-password.html'], component: 'platformAuth', title: 'Reset Password | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/reset-password', aliases: ['/platform-reset-password.html', '/src/platform-reset-password.html'], component: 'platformAuth', title: 'Choose New Password | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/account', aliases: ['/platform-account.html', '/src/platform-account.html'], component: 'platformAccount', title: 'Your Account | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/dashboard', aliases: ['/platform-dashboard.html', '/src/platform-dashboard.html'], component: 'platformDashboard', title: 'Portfolio Dashboard | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/portfolio', aliases: ['/platform-portfolio.html', '/src/platform-portfolio.html'], component: 'platformPortfolioEditor', title: 'Portfolio Editor | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/subscribe', aliases: [], component: 'platformSubscribe', title: 'Review Subscription | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/platform/space-setup', aliases: [], component: 'platformSpaceSetup', title: 'Claim Your Space | FolioSpace', bodyClassName: '', noIndex: true },
  { path: '/portfolio', aliases: ['/portfolio.html', '/src/portfolio.html'], component: 'publicPortfolio', title: 'Professional Portfolio | FolioSpace', bodyClassName: 'portfolio-public-page' }
];

const paths = new Map();
for (const page of pageRegistry) {
  paths.set(page.path, page);
  for (const alias of page.aliases) paths.set(alias, page);
}

export function getPageForPath(pathname) {
  const normalizedPath = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;
  const exactPage = paths.get(normalizedPath);
  if (exactPage || !normalizedPath.endsWith('.html')) return exactPage || null;
  const filename = normalizedPath.slice(normalizedPath.lastIndexOf('/') + 1);
  return paths.get(`/${filename}`) || null;
}

export function getLegacyPagePath(pathname) {
  const page = getPageForPath(pathname);
  return page && pathname !== page.path ? page.path : null;
}

export const defaultPage = pageRegistry[0];
