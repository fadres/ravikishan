import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';

// Route-level code splitting: KaTeX + Prism + admin tooling load on demand.
const Home = lazy(() => import('./pages/Home.jsx'));
const ClassPage = lazy(() => import('./pages/ClassPage.jsx'));
const SubjectPage = lazy(() => import('./pages/SubjectPage.jsx'));
const ChapterPage = lazy(() => import('./pages/ChapterPage.jsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const RequestsPanel = lazy(() => import('./pages/admin/RequestsPanel.jsx'));
const UsersPanel = lazy(() => import('./pages/admin/UsersPanel.jsx'));
const ContentPanel = lazy(() => import('./pages/admin/ContentPanel.jsx'));
const AuditPanel = lazy(() => import('./pages/admin/AuditPanel.jsx'));

function PageLoader() {
  return (
    <div className="py-24 text-center">
      <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}

function Shell() {
  const { wallpaper } = useTheme();
  return (
    <div className={`ocean-bg min-h-screen text-slate-100 flex flex-col${wallpaper !== 'none' ? ` wp-${wallpaper}` : ''}`}>
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/class/:classSlug" element={<ClassPage />} />
            <Route path="/class/:classSlug/subject/:subjectSlug" element={<SubjectPage />} />
            <Route
              path="/class/:classSlug/subject/:subjectSlug/chapter/:chapterSlug"
              element={<ChapterPage />}
            />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<RequestsPanel />} />
              <Route path="requests" element={<RequestsPanel />} />
              <Route path="users" element={<UsersPanel />} />
              <Route path="content" element={<ContentPanel />} />
              <Route path="audit" element={<AuditPanel />} />
            </Route>
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
