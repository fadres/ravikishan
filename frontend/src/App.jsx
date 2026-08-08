import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { sectionFromClassSlug, sectionPath } from './lib/sectionLinks.js';

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
const Class11Extras = lazy(() => import('./pages/admin/Class11Extras.jsx'));
const UploadPage = lazy(() => import('./pages/admin/UploadPage.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'));
const QuizzesPage = lazy(() => import('./pages/quizzes/QuizzesPage.jsx'));
const QuizTakePage = lazy(() => import('./pages/quizzes/QuizTakePage.jsx'));
const QuizReviewPage = lazy(() => import('./pages/quizzes/QuizReviewPage.jsx'));
const QuizLeaderboardPage = lazy(() => import('./pages/quizzes/QuizLeaderboardPage.jsx'));
const FlashcardsPage = lazy(() => import('./pages/flashcards/FlashcardsPage.jsx'));
const DeckDetailPage = lazy(() => import('./pages/flashcards/DeckDetailPage.jsx'));
const ReviewSessionPage = lazy(() => import('./pages/flashcards/ReviewSessionPage.jsx'));
const PlannerPage = lazy(() => import('./pages/PlannerPage.jsx'));
const PomodoroPage = lazy(() => import('./pages/PomodoroPage.jsx'));
const ExamCountdownPage = lazy(() => import('./pages/ExamCountdownPage.jsx'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.jsx'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage.jsx'));
const AiToolsPage = lazy(() => import('./pages/AiToolsPage.jsx'));

function PageLoader() {
  return (
    <div className="py-24 text-center">
      <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
    </div>
  );
}

// Every navigation starts at the header (top), never mid-page at the footer.
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

// Legacy /class/<classSlug>/... URLs redirect into the section namespace.
// Class slugs without a registered section go home — the track does not
// exist yet.
function LegacySectionRedirect() {
  const { classSlug, subjectSlug, chapterSlug } = useParams();
  const section = sectionFromClassSlug(classSlug);
  if (!section) return <Navigate to="/" replace />;
  return <Navigate to={sectionPath(section.id, subjectSlug, chapterSlug)} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-aqua-500 focus:text-white focus:rounded-lg">
        Skip to content
      </a>
      <Shell />
    </ThemeProvider>
  );
}

function Shell() {
  const { wallpaper } = useTheme();
  const { pathname } = useLocation();
  const showFooter = pathname === '/dashboard';
  return (
    <div className={`ocean-bg min-h-screen text-slate-100 flex flex-col${wallpaper !== 'none' ? ` wp-${wallpaper}` : ''}`}>
      <ScrollToTop />
      <Header />
      <main id="main-content" className="flex-1 pb-safe px-4 sm:px-6">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:sectionId" element={<ClassPage />} />
            <Route path="/:sectionId/subject/:subjectSlug" element={<SubjectPage />} />
            <Route
              path="/:sectionId/subject/:subjectSlug/chapter/:chapterSlug"
              element={<ChapterPage />}
            />
            <Route path="/class/:classSlug" element={<LegacySectionRedirect />} />
            <Route path="/class/:classSlug/subject/:subjectSlug" element={<LegacySectionRedirect />} />
            <Route
              path="/class/:classSlug/subject/:subjectSlug/chapter/:chapterSlug"
              element={<LegacySectionRedirect />}
            />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/quizzes" element={<QuizzesPage />} />
            <Route path="/quizzes/:quizId" element={<QuizTakePage />} />
            <Route path="/quizzes/attempts/:attemptId" element={<QuizReviewPage />} />
            <Route path="/quizzes/leaderboard" element={<QuizLeaderboardPage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/flashcards/:deckId" element={<DeckDetailPage />} />
            <Route path="/flashcards/:deckId/review" element={<ReviewSessionPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/pomodoro" element={<PomodoroPage />} />
            <Route path="/exam-countdown" element={<ExamCountdownPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/ai-tools" element={<AiToolsPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="requests" element={<RequestsPanel />} />
              <Route path="users" element={<UsersPanel />} />
              <Route path="content" element={<ContentPanel />} />
              <Route path="audit" element={<AuditPanel />} />
              <Route path="class-11-extras" element={<Class11Extras />} />
              <Route path="upload" element={<UploadPage />} />
            </Route>
            <Route path="/dashboard" element={<StudentDashboard />} />
          </Routes>
        </Suspense>
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
