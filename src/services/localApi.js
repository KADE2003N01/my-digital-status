const STORAGE_KEY = 'foliospace-frontend-data-v2';
export const isLocalApiMode = import.meta.env.DEV
  && import.meta.env.VITE_USE_LOCAL_API === 'true';
const LOCAL_ADMIN = {
  id: 1,
  displayName: 'David KWIZERA',
  email: 'demo@example.com',
  role: 'platform_owner',
  roles: ['platform_owner']
};
const LOCAL_MEMBER = {
  id: 1,
  displayName: 'FolioSpace Member',
  email: 'member@example.com'
};
const now = () => new Date().toISOString();

function createInitialData() {
  return {
    admin: LOCAL_ADMIN,
    platformUser: LOCAL_MEMBER,
    portfolios: [],
    documents: [
      { id: 'demo-cv', documentId: 'cv', type: 'cv', name: 'David_KWIZERA_CV.pdf', fileName: 'David_KWIZERA_CV.pdf', title: 'Curriculum Vitae', description: 'A sample CV for the frontend preview.', updatedAt: now() },
      { id: 'demo-certificate', documentId: 'certificate-1', type: 'certificate', name: 'Product_Design_Certificate.pdf', fileName: 'Product_Design_Certificate.pdf', title: 'Product Design Certificate', description: 'A sample certificate for the frontend preview.', updatedAt: now() }
    ],
    downloads: [
      { id: 'demo-download-1', name: 'Jordan Lee', email: 'jordan@example.com', phone: '+1 555 010 0101', documentType: 'cv', document: 'Curriculum vitae', reason: 'Product design opportunity', requestedAt: now(), downloadStatus: 'requested' },
      { id: 'demo-download-2', name: 'Sam Rivera', email: 'sam@example.com', phone: '+1 555 010 0102', documentType: 'certificate', document: 'Product Design Certificate', reason: 'Credential review', requestedAt: now(), downloadedAt: now(), downloadStatus: 'downloaded' }
    ],
    admins: [
      LOCAL_ADMIN,
      { id: 2, displayName: 'Taylor Chen', email: 'taylor@example.com', role: 'content_manager', roles: ['content_manager'], status: 'active', adminStatus: 'active' }
    ],
    supportRequests: [],
    audit: [],
    messages: [],
    homepage: {
      site: { title: 'David KWIZERA | Portfolio', description: "Explore David KWIZERA's portfolio, background, skills, projects and professional documents." },
      brand: {
        name: 'KADE', imageUrl: '', loginLabel: 'Login',
        navigation: [
          { label: 'Home', href: '/' }, { label: 'About', href: '/about' },
          { label: 'Background', href: '/background' }, { label: 'Skills', href: '/skills' },
          { label: 'Hobbies', href: '/hobbies' }, { label: 'Documents', href: '/documents' },
          { label: 'Contact', href: '/contact' }
        ]
      },
      hero: {
        visible: true, kicker: 'DAVID KWIZERA', title: 'I build things for the web',
        subtitle: 'Computer Science student - Frontend Developer',
        intro: "I'm David, a Computer Science student at the University of Rwanda. I spend most of my time building small web projects, breaking them, and figuring out how to make them better.",
        videoUrl: '', backgroundImageUrl: '',
        buttons: [
          { label: 'Explore my documents', href: '/documents', style: 'primary' },
          { label: 'My background', href: '/background', style: 'outline' }
        ],
        contactText: 'Have a project or opportunity?', contactHref: '/contact', contactLabel: "Let's connect"
      },
      introduction: {
        visible: true, eyebrow: 'A LITTLE ABOUT ME', titleFirst: 'Curious by nature.', titleSecond: 'Developer by choice.',
        body: "I'm David KWIZERA, a Computer Science student at the University of Rwanda. I enjoy turning ideas into clear, useful digital experiences and growing my skills through hands-on projects.",
        linkLabel: 'Get to know me', linkHref: '/about'
      },
      highlights: {
        visible: true, eyebrow: 'WELCOME', title: 'Thanks for stopping by',
        message: "This is where I keep my story, the things I'm learning, and the work I'm proud of so far. Have a look around.",
        linkLabel: 'Get to know me', linkHref: '/skills'
      },
      documents: {
        visible: true, eyebrow: 'DOCUMENTS & RESOURCES', title: 'Need my CV or certificates?',
        description: 'Browse and download the latest documents from the portfolio document center.',
        buttonLabel: 'Visit document center', buttonHref: '/documents'
      },
      footer: {
        visible: true, brandName: 'David', tagline: 'Building elegant solutions through code',
        description: 'Computer Science student | Frontend Developer | Problem Solver',
        quickLinksTitle: 'Quick Links', servicesTitle: 'Services', socialTitle: 'Connect With Me',
        quickLinks: [
          { label: 'Home', href: '/' }, { label: 'About Me', href: '/about' },
          { label: 'Background', href: '/background' }, { label: 'Skills', href: '/skills' }
        ],
        services: [
          { label: 'Web Development', href: '/skills' }, { label: 'UI/UX Design', href: '/skills' },
          { label: 'Consulting', href: '/background' }, { label: 'Contact', href: '/contact' }
        ],
        socialLinks: [
          { label: 'GitHub', href: 'https://github.com/KADE2003N01/kade-status', icon: 'fab fa-github' },
          { label: 'LinkedIn', href: 'https://www.linkedin.com/feed/', icon: 'fab fa-linkedin' },
          { label: 'WhatsApp', href: 'https://wa.me/+250788950833', icon: 'fab fa-whatsapp' },
          { label: 'Facebook', href: 'https://facebook.com/', icon: 'fab fa-facebook' }
        ],
        email: 'kadecomputerscience@gmail.com', phone: '+250 788 950 833',
        copyright: `© ${new Date().getFullYear()} David KWIZERA. All rights reserved.`,
        builtBy: 'Built by KadeTech', contactLabel: 'Contact', contactHref: 'tel:+250788950833',
        adminName: 'David KWIZERA'
      },
      adminName: 'David KWIZERA',
      adminNameCustom: false,
      localizedText: { fr: {}, sw: {} }
    },
    homepageUpdatedAt: now()
  };
}

function readData() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const defaults = createInitialData();
      const stored = JSON.parse(saved);
      return {
        ...defaults,
        ...stored,
        homepage: stored.homepage && typeof stored.homepage === 'object' ? stored.homepage : defaults.homepage,
        homepageUpdatedAt: stored.homepageUpdatedAt || defaults.homepageUpdatedAt
      };
    }
  } catch (error) {
    console.warn('Demo changes will only last for this page session because local storage is unavailable.', error);
  }
  return createInitialData();
}

let data = readData();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Could not save demo changes in this browser.', error);
  }
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

function noContent() {
  return new Response(null, { status: 204 });
}

function parseBody(options) {
  if (typeof options.body !== 'string') return {};
  try { return JSON.parse(options.body); } catch { return {}; }
}

function getPortfolio(id) {
  return data.portfolios.find((item) => String(item.id) === String(id));
}

function getAdminUser() {
  return { ...data.admin };
}

function getPortfolioUser() {
  return { ...data.platformUser };
}

function responseForPortfolio(portfolio, includePrivate = false) {
  if (!portfolio) return null;
  return {
    ...portfolio,
    sections: portfolio.sections
      .filter((section) => includePrivate || !section.isPrivate)
      .map((section) => ({ ...section, data: { ...section.data } }))
  };
}

function handlePlatformAuth(path, method, body) {
  if (path === '/platform-auth/me') return jsonResponse({ user: getPortfolioUser() });
  if (path === '/platform-auth/signup') {
    data.platformUser = { ...LOCAL_MEMBER, displayName: body.displayName || LOCAL_MEMBER.displayName, email: body.email || LOCAL_MEMBER.email };
    persist();
    return jsonResponse({ message: 'Demo account created locally. No email was sent.' });
  }
  if (path === '/platform-auth/login') {
    data.platformUser = { ...LOCAL_MEMBER, email: body.email || LOCAL_MEMBER.email };
    persist();
    return jsonResponse({ user: getPortfolioUser(), message: 'Signed in to the local demo.' });
  }
  if (path === '/platform-auth/logout') return jsonResponse({ message: 'Signed out of the local demo.' });
  if (path === '/platform-auth/verify-email') return jsonResponse({ message: 'Email verified in the local demo.' });
  if (path === '/platform-auth/forgot-password') return jsonResponse({ message: 'Demo reset link ready. No email was sent.' });
  if (path === '/platform-auth/reset-password') return jsonResponse({ message: 'Demo password updated locally.' });
  if (path === '/platform-auth/account' && method === 'PUT') {
    data.platformUser = { ...data.platformUser, ...body };
    persist();
    return jsonResponse({ user: getPortfolioUser() });
  }
  return jsonResponse({ error: 'This action is not available in the frontend demo.' }, 404);
}

function handlePortfolios(path, method, body) {
  if (path === '/portfolios' && method === 'GET') return jsonResponse({ portfolios: data.portfolios.map((item) => responseForPortfolio(item, true)) });
  if (path === '/portfolios' && method === 'POST') {
    if (data.portfolios.some((item) => item.slug === body.slug)) return jsonResponse({ error: 'That portfolio address is already in use.' }, 409);
    const portfolio = {
      id: Date.now(),
      slug: body.slug,
      templateId: body.templateId || 'free',
      status: 'draft',
      sections: [
        { type: 'hero', sortOrder: 0, data: { title: body.title || '' } },
        { type: 'about', sortOrder: 1, isPrivate: false, data: { description: '' } },
        { type: 'skills', sortOrder: 2, isPrivate: false, data: { items: [] } }
      ]
    };
    data.portfolios.push(portfolio);
    persist();
    return jsonResponse({ portfolio: responseForPortfolio(portfolio, true) }, 201);
  }

  const match = path.match(/^\/portfolios\/(\d+)(?:\/(sections|publish|unpublish))?$/);
  if (!match) return jsonResponse({ error: 'Portfolio not found.' }, 404);
  const portfolio = getPortfolio(match[1]);
  if (!portfolio) return jsonResponse({ error: 'Portfolio not found.' }, 404);
  const action = match[2];
  if (!action && method === 'GET') return jsonResponse({ portfolio: responseForPortfolio(portfolio, true) });
  if (!action && method === 'PUT') {
    if (body.slug && data.portfolios.some((item) => item.id !== portfolio.id && item.slug === body.slug)) {
      return jsonResponse({ error: 'That portfolio address is already in use.' }, 409);
    }
    portfolio.slug = body.slug || portfolio.slug;
    const hero = portfolio.sections.find((section) => section.type === 'hero');
    if (hero && body.title) hero.data.title = body.title;
    persist();
    return jsonResponse({ portfolio: responseForPortfolio(portfolio, true) });
  }
  if (action === 'sections' && method === 'PUT') {
    portfolio.sections = Array.isArray(body.sections) ? body.sections : portfolio.sections;
    persist();
    return jsonResponse({ portfolio: responseForPortfolio(portfolio, true) });
  }
  if ((action === 'publish' || action === 'unpublish') && method === 'PUT') {
    portfolio.status = action === 'publish' ? 'published' : 'draft';
    persist();
    return jsonResponse({ portfolio: responseForPortfolio(portfolio, true) });
  }
  return jsonResponse({ error: 'This action is not available in the frontend demo.' }, 405);
}

function handlePublicPortfolio(path, method, body) {
  const match = path.match(/^\/public\/([^/]+)(?:\/(full|recruiter\/request-otp|recruiter\/verify-otp|recruiter\/contact))?$/);
  if (!match) return jsonResponse({ error: 'Portfolio not found.' }, 404);
  const slug = decodeURIComponent(match[1]);
  const portfolio = data.portfolios.find((item) => item.slug === slug && item.status === 'published');
  if (!portfolio) return jsonResponse({ error: 'Portfolio not found.' }, 404);
  const action = match[2];
  if (!action && method === 'GET') return jsonResponse({ portfolio: responseForPortfolio(portfolio) });
  if (action === 'full' && method === 'GET') return jsonResponse({ portfolio: responseForPortfolio(portfolio, true) });
  if (action === 'recruiter/request-otp' && method === 'POST') {
    return jsonResponse({ message: `Demo verification code sent to ${body.email || 'your email'}. Use any six digits to continue.` });
  }
  if (action === 'recruiter/verify-otp' && method === 'POST') {
    return jsonResponse({ message: 'Email verified in the local demo.' });
  }
  if (action === 'recruiter/contact' && method === 'POST') {
    return jsonResponse({ message: 'Your recruiter request was saved in the local demo.' }, 201);
  }
  return jsonResponse({ error: 'This action is not available in the frontend demo.' }, 405);
}

function handleAdminApi(path, method, body) {
  if (path === '/health') return jsonResponse({ status: 'ok', mode: 'frontend-demo' });
  if (path === '/auth/me') return jsonResponse({ success: true, user: getAdminUser() });
  if (path === '/auth/login') return jsonResponse({ success: true, user: getAdminUser(), sessionToken: 'frontend-demo-session' });
  if (path === '/auth/logout') return jsonResponse({ success: true, message: 'Signed out of the local demo.' });
  if (path.startsWith('/auth/password-reset/')) return jsonResponse({ success: true, message: 'Password action completed in the local demo.' });
  if (path === '/auth/admin-users' || path.startsWith('/auth/admin-users?')) return jsonResponse({ admins: data.admins });
  if (/^\/auth\/admin-users\/[^/]+/.test(path)) return jsonResponse({ message: 'Admin action completed in the local demo.' });

  if (path === '/homepage') {
    if (method === 'GET') return jsonResponse({ content: data.homepage, updatedAt: data.homepageUpdatedAt });
    if (method === 'PUT') { data.homepage = body.content || body; data.homepageUpdatedAt = now(); persist(); return jsonResponse({ content: data.homepage, updatedAt: data.homepageUpdatedAt }); }
    return jsonResponse({ message: 'Homepage action completed in the local demo.' });
  }
  if (path === '/homepage/admin-profile-image') return noContent();
  if (path === '/homepage/profile-image' || path === '/homepage/reset') return jsonResponse({ message: 'Homepage action completed in the local demo.' });

  if (path === '/documents' && method === 'GET') return jsonResponse({ documents: data.documents, cv: data.documents.find((item) => item.type === 'cv') || null, certificates: data.documents.filter((item) => item.type === 'certificate') });
  if (path.startsWith('/documents/')) return jsonResponse({ message: 'Document action completed in the local demo.' });
  if (path === '/downloads' && method === 'GET') return jsonResponse({ downloads: data.downloads });
  if (path.startsWith('/downloads/') && method === 'DELETE') {
    data.downloads = data.downloads.filter((item) => item.id !== decodeURIComponent(path.split('/').pop()));
    persist();
    return jsonResponse({ success: true });
  }
  if (path.startsWith('/downloads/')) return jsonResponse({ message: 'Download action completed in the local demo.' });
  if (path === '/contact/' || path === '/contact') return jsonResponse({ message: 'Your message was saved in the local demo.' }, 201);
  if (path.startsWith('/support-requests')) {
    if (path === '/support-requests' && method === 'POST') {
      data.supportRequests.push({ id: Date.now(), ...body, status: 'open', createdAt: now() });
      persist();
      return jsonResponse({ message: 'Your demo support request was saved locally.' }, 201);
    }
    return jsonResponse({ requests: data.supportRequests, supportRequests: data.supportRequests });
  }

  if (path.startsWith('/platform-owner/')) return handlePlatformOwner(path, method, body);
  if (path.startsWith('/messages')) return handleMessages(path, method, body);
  if (path.startsWith('/public/')) return handlePublicPortfolio(path, method, body);
  return jsonResponse({ message: 'Action completed in the local frontend demo.' });
}

function handleMessages(path, method, body) {
  if (path.startsWith('/messages/unread-count')) return jsonResponse({ count: 0 });
  if (path === '/messages/super-admins') return jsonResponse({ admins: data.admins.filter((item) => item.roles?.includes('platform_owner')) });
  if (method === 'GET') return jsonResponse({ threads: [], messages: [] });
  if (method === 'POST' && path === '/messages') {
    const message = { id: Date.now(), threadId: 'demo-thread', senderId: data.admin.id, senderName: data.admin.displayName, senderRole: 'platform_owner', body: body.body || '', createdAt: now(), isRead: true };
    data.messages.push(message);
    persist();
    return jsonResponse({ message, messages: data.messages }, 201);
  }
  return jsonResponse({ message: 'Message action completed in the local demo.', messages: data.messages });
}

function handlePlatformOwner(path, method, body) {
  const route = path.slice('/platform-owner'.length);
  if (route.startsWith('/admins/deleted')) return jsonResponse({ admins: [] });
  if (route.startsWith('/admins')) {
    if (method === 'GET') return jsonResponse({ admins: data.admins, total: data.admins.length, page: 1, totalPages: 1, counts: { total: data.admins.length, active: data.admins.length, pending: 0, inactive: 0 } });
    if (method === 'POST') {
      const admin = { id: Date.now(), ...body, status: 'pending', adminStatus: 'pending', roles: body.roles || [] };
      data.admins.push(admin);
      persist();
      return jsonResponse({ admin, admins: data.admins }, 201);
    }
    return jsonResponse({ admins: data.admins, message: 'Admin action completed in the local demo.' });
  }
  if (route.startsWith('/audit')) return jsonResponse({ events: data.audit, audit: data.audit, count: data.audit.length });
  if (route.startsWith('/inbox-counts')) return jsonResponse({ requests: data.supportRequests.length, resolvedRequests: 0, deletedRequests: 0, messages: 0, messagesIncoming: 0, messagesOutgoing: 0 });
  if (route.startsWith('/support-requests')) return jsonResponse({ requests: data.supportRequests, supportRequests: data.supportRequests, count: data.supportRequests.length });
  return jsonResponse({ message: 'Owner action completed in the local demo.' });
}

export async function localApiFetch(path, options = {}) {
  const url = new URL(path, window.location.origin);
  const route = `${url.pathname}${url.search}`;
  const method = (options.method || 'GET').toUpperCase();
  const body = parseBody(options);
  if (options.allowBinary) {
    return new Response(new Uint8Array(), {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="demo-document.pdf"' }
    });
  }
  if (route.startsWith('/platform-auth/')) return handlePlatformAuth(url.pathname, method, body);
  if (url.pathname === '/portfolios' || url.pathname.startsWith('/portfolios/')) return handlePortfolios(url.pathname, method, body);
  if (url.pathname.startsWith('/public/')) return handlePublicPortfolio(url.pathname, method, body);
  return handleAdminApi(url.pathname, method, body);
}

export function resetLocalApiData() {
  data = createInitialData();
  persist();
}
