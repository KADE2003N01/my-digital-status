import React from 'react';
import { createRoot } from 'react-dom/client';
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
  PlatformPortfolioEditorPage,
  PublicPortfolioPage
} from '../pages/platform-auth/DigitalStatusPages.jsx';
import { API_BASE_URL, API_BASE_URLS } from '../services/api.js';
import GlobalStyles from '../styles/GlobalStyles.jsx';
import { LanguageProvider } from '../context/LanguageContext.jsx';

const publicPages = {
  'index.html': [Homepage, ''],
  'about.html': [AboutPage, ''],
  'background.html': [BackgroundPage, ''],
  'skills.html': [SkillsPage, ''],
  'hobbies.html': [HobbiesPage, ''],
  'document.html': [DocumentsPage, ''],
  'contact.html': [ContactPage, '']
};
const adminPages = {
  'admin-login.html': [AdminLoginPage, 'auth-page'],
  'admin.html': [AdminOverviewPage, 'admin-page auth-pending'],
  'admin-downloads.html': [AdminDownloadsPage, 'admin-page auth-pending'],
  'admin-homepage.html': [AdminHomepagePage, 'admin-page auth-pending'],
  'admin-documents.html': [AdminDocumentsPage, 'admin-page auth-pending'],
  'admin-profile.html': [AdminProfilePage, 'admin-page auth-pending'],
  'admin-accounts.html': [AdminAccountsPage, 'admin-page auth-pending'],
  'admin-messages.html': [AdminMessagesPage, 'admin-page auth-pending'],
  'chatroom-preview.html': [ChatRoomPreview, 'chatroom-preview-page-body'],
  'platform-owner.html': [PlatformOwnerPage, 'admin-page auth-pending'],
  'admin-setup-account.html': [AdminPasswordResetPage, 'auth-page'],
  'admin-reset-password.html': [AdminPasswordResetPage, 'auth-page'],
  'admin-support.html': [AdminSupportPage, 'auth-page']
};
const platformPages = {
  'platform-login.html': [PlatformAuthPage, 'platform-auth-page'],
  'platform-signup.html': [PlatformAuthPage, 'platform-auth-page'],
  'platform-verify-email.html': [PlatformAuthPage, 'platform-auth-page'],
  'platform-forgot-password.html': [PlatformAuthPage, 'platform-auth-page'],
  'platform-reset-password.html': [PlatformAuthPage, 'platform-auth-page'],
  'platform-account.html': [PlatformAccountPage, 'platform-auth-page'],
  'platform-dashboard.html': [PlatformDashboardPage, 'platform-auth-page'],
  'platform-portfolio.html': [PlatformPortfolioEditorPage, 'platform-auth-page'],
  'portfolio.html': [PublicPortfolioPage, 'portfolio-public-page']
};
const fileName = window.location.pathname.split('/').pop() || 'index.html';
const isSharedPortfolioUrl = /^\/u\/[a-z0-9-]+\/?$/i.test(window.location.pathname);
const [Page, bodyClassName] = isSharedPortfolioUrl
  ? [PublicPortfolioPage, 'portfolio-public-page']
  : publicPages[fileName] || adminPages[fileName] || platformPages[fileName] || publicPages['index.html'];
window.PORTFOLIO_API_BASE_URL = API_BASE_URL;
window.PORTFOLIO_API_BASE_URLS = API_BASE_URLS;
document.body.className = bodyClassName;
document.title = document.querySelector('title')?.textContent || 'David KWIZERA | Portfolio';

createRoot(document.getElementById('root')).render(
  <>
    <GlobalStyles />
    <LanguageProvider><Page /></LanguageProvider>
  </>
);
