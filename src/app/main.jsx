import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import {
  AboutPage,
  BackgroundPage,
  ContactPage,
  DocumentsPage,
  HobbiesPage,
  Homepage,
  SkillsPage
} from '../pages/public/PublicPages.jsx';
import {
  AdminDocumentsPage,
  AdminAccountsPage,
  AdminDownloadsPage,
  AdminHomepagePage,
  AdminLoginPage,
  AdminMessagesPage,
  AdminOverviewPage,
  AdminProfilePage,
  AdminPasswordResetPage
} from '../pages/admin/AdminPages.jsx';
import PlatformOwnerPage from '../pages/platform-owner/PlatformOwnerPage.jsx';
import AdminSupportPage from '../pages/admin/auth/AdminSupportPage.jsx';
import ChatRoomPreview from '../pages/admin/ChatRoomPreview.jsx';
import { PlatformAccountPage, PlatformAuthPage } from '../pages/platform-auth/PlatformAuthPages.jsx';
import {
  PlatformDashboardPage,
  PlatformHelpPage,
  PlatformSystemIssuesPage,
  PlatformPortfolioEditorPage,
  PublicPortfolioPage
} from '../pages/platform-auth/DigitalStatusPages.jsx';
import { PlatformSpaceSetupPage, PlatformSubscribePage } from '../pages/platform-auth/SpaceOnboardingPages.jsx';
import PlatformLandingPage, { PlatformTemplatesPage } from '../pages/platform-auth/PlatformLandingPage.jsx';
import '../pages/platform-auth/PlatformTheme.css';
import { API_BASE_URL, API_BASE_URLS } from '../services/api.js';
import GlobalStyles from '../styles/GlobalStyles.jsx';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { getLegacyPagePath, getPageForPath, pageRegistry } from './pageRegistry.js';

const pageComponents = {
  about: AboutPage,
  background: BackgroundPage,
  skills: SkillsPage,
  hobbies: HobbiesPage,
  documents: DocumentsPage,
  contact: ContactPage,
  adminLogin: AdminLoginPage,
  adminSupport: AdminSupportPage,
  adminOverview: AdminOverviewPage,
  adminDownloads: AdminDownloadsPage,
  adminHomepage: AdminHomepagePage,
  adminDocuments: AdminDocumentsPage,
  adminProfile: AdminProfilePage,
  adminAccounts: AdminAccountsPage,
  adminMessages: AdminMessagesPage,
  chatroomPreview: ChatRoomPreview,
  platformOwner: PlatformOwnerPage,
  adminPasswordReset: AdminPasswordResetPage,
  platformLanding: PlatformLandingPage,
  platformTemplates: PlatformTemplatesPage,
  platformAuth: PlatformAuthPage,
  platformAccount: PlatformAccountPage,
  platformDashboard: PlatformDashboardPage,
  platformHelp: PlatformHelpPage,
  platformSystemIssues: PlatformSystemIssuesPage,
  platformPortfolioEditor: PlatformPortfolioEditorPage,
  platformSubscribe: PlatformSubscribePage,
  platformSpaceSetup: PlatformSpaceSetupPage,
  publicPortfolio: PublicPortfolioPage,
  homepage: Homepage
};

function AppNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      const anchor = target?.closest('a[href]');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;

      let destination;
      try {
        destination = new URL(anchor.href);
      } catch {
        return;
      }
      if (destination.origin !== window.location.origin || !['http:', 'https:'].includes(destination.protocol)) return;
      if (destination.pathname.startsWith('/api/') || destination.pathname === location.pathname && destination.search === location.search && destination.hash) return;
      const isApplicationRoute = getPageForPath(destination.pathname)
        || /^\/u\/[a-z0-9-]+\/?$/i.test(destination.pathname)
        || !pathHasExtension(destination.pathname);
      if (!isApplicationRoute) return;

      event.preventDefault();
      const cleanPath = getLegacyPagePath(destination.pathname) || destination.pathname;
      navigate(`${cleanPath}${destination.search}${destination.hash}`);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [location.pathname, location.search, navigate]);

  const sharedPortfolio = /^\/u\/[a-z0-9-]+\/?$/i.test(location.pathname);
  const legacyPath = getLegacyPagePath(location.pathname);
  const page = sharedPortfolio
    ? { component: 'publicPortfolio', title: 'Professional Portfolio | FolioSpace', bodyClassName: 'portfolio-public-page' }
    : getPageForPath(location.pathname);

  useEffect(() => {
    if (legacyPath) {
      navigate(`${legacyPath}${location.search}${location.hash}`, { replace: true });
      return;
    }

    const activePage = page || pageRegistry[0];
    document.title = activePage.title;
    document.body.className = activePage.bodyClassName;
    let robots = document.querySelector('meta[name="robots"]');
    if (activePage.noIndex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = 'noindex, nofollow';
    } else {
      robots?.remove();
    }
  }, [legacyPath, location.hash, location.search, navigate, page]);

  useEffect(() => {
    if (!location.hash) return undefined;
    let id = location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* Keep the literal fragment if it is malformed. */ }
    const frame = window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname]);

  if (legacyPath) return null;
  const Page = pageComponents[page?.component || 'homepage'];
  return <LanguageProvider key={location.pathname}>
    <>
      <Page key={location.pathname} />
    </>
  </LanguageProvider>;
}

function pathHasExtension(pathname) {
  return /\/[^/]+\.[a-z0-9]+$/i.test(pathname);
}

function App() {
  return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <GlobalStyles />
    <Routes>
      <Route path="*" element={<AppNavigation />} />
    </Routes>
  </BrowserRouter>;
}

window.PORTFOLIO_API_BASE_URL = API_BASE_URL;
window.PORTFOLIO_API_BASE_URLS = API_BASE_URLS;

createRoot(document.getElementById('root')).render(<App />);
