import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from '@/ui/layouts/AppLayout';
import { RouteFallback } from '@/ui/components/RouteFallback';

/* Marketing carries a display webfont and the motion library. The app must not pay for either. */
const MarketingPage = lazy(() => import('@/ui/pages/marketing/MarketingPage'));

const LibraryPage = lazy(() => import('@/ui/pages/library/LibraryPage'));
const ParsePage = lazy(() => import('@/ui/pages/parse/ParsePage'));
const DocumentPage = lazy(() => import('@/ui/pages/document/DocumentPage'));
const QuizPage = lazy(() => import('@/ui/pages/quiz/QuizPage'));
const FlashcardsPage = lazy(() => import('@/ui/pages/flashcards/FlashcardsPage'));
const ReviewPage = lazy(() => import('@/ui/pages/review/ReviewPage'));
const ChatPage = lazy(() => import('@/ui/pages/chat/ChatPage'));
const ExamPage = lazy(() => import('@/ui/pages/exam/ExamPage'));
const DashboardPage = lazy(() => import('@/ui/pages/dashboard/DashboardPage'));
const SettingsPage = lazy(() => import('@/ui/pages/settings/SettingsPage'));

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<MarketingPage />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/library" replace />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="parse" element={<ParsePage />} />
          <Route path="doc/:id" element={<DocumentPage />} />
          <Route path="quiz/:id" element={<QuizPage />} />
          <Route path="cards/:id" element={<FlashcardsPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="chat/:id" element={<ChatPage />} />
          <Route path="exam/:id" element={<ExamPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
