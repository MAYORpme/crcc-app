import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, HashRouter, Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider, useDocumentTitle } from './components/ui';
import { PlayerProvider } from './lib/player';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreens, Blocked, CompleteProfile, Splash } from './pages/AuthScreens';
import Home from './pages/Home';
import Give from './pages/Give';
import Sermons, { Live, SermonDetail } from './pages/Sermons';
import Oxygen, { LessonPage } from './pages/Oxygen';
import Events, { EventDetail } from './pages/Events';
import About from './pages/About';
import { More, Notifications, Profile, Statement } from './pages/Member';
import { AlbumPage, DepartmentPage, Departments, Fellowships, Gallery, Prayer, Testimonies } from './pages/Community';
import { Bible, Devotional, DevotionalArchive, PlanPage, Plans } from './pages/Grow';
import { Checkin, Counselling, Pledges } from './pages/Care';
import Shop from './pages/Shop';

const Admin = lazy(() => import('./admin/Admin'));

// Hash routing is used for static previews; Firebase Hosting uses clean URLs.
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter;

function NotFound() {
  useDocumentTitle('Not found');
  return (
    <div className="container page center stack gap-16">
      <h1 className="page-title">Page not found</h1>
      <p className="muted">The page you’re looking for has moved or doesn’t exist.</p>
      <div>
        <Link to="/" className="btn btn-primary">Go home</Link>
      </div>
    </div>
  );
}

/** Nothing is visible until the member signs in. */
function Gate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.loading) return <Splash />;
  if (!auth.user) return <AuthScreens />;
  if (auth.needsProfile) return <CompleteProfile />;
  if (auth.member?.blocked) return <Blocked />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <Gate>
            <PlayerProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="give" element={<Give />} />
                  <Route path="sermons" element={<Sermons />} />
                  <Route path="sermons/:id" element={<SermonDetail />} />
                  <Route path="live" element={<Live />} />
                  <Route path="oxygen" element={<Oxygen />} />
                  <Route path="oxygen/:id" element={<LessonPage />} />
                  <Route path="events" element={<Events />} />
                  <Route path="events/:id" element={<EventDetail />} />
                  <Route path="about" element={<About />} />
                  <Route path="more" element={<More />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="profile/statement" element={<Statement />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="devotional" element={<Devotional />} />
                  <Route path="devotional/archive" element={<DevotionalArchive />} />
                  <Route path="devotional/:date" element={<Devotional />} />
                  <Route path="bible" element={<Bible />} />
                  <Route path="bible/plans" element={<Plans />} />
                  <Route path="bible/plans/:id" element={<PlanPage />} />
                  <Route path="prayer" element={<Prayer />} />
                  <Route path="testimonies" element={<Testimonies />} />
                  <Route path="departments" element={<Departments />} />
                  <Route path="departments/:id" element={<DepartmentPage />} />
                  <Route path="fellowships" element={<Fellowships />} />
                  <Route path="gallery" element={<Gallery />} />
                  <Route path="gallery/:id" element={<AlbumPage />} />
                  <Route path="pledges" element={<Pledges />} />
                  <Route path="counselling" element={<Counselling />} />
                  <Route path="checkin" element={<Checkin />} />
                  <Route path="checkin/:code" element={<Checkin />} />
                  <Route path="shop" element={<Shop />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route
                  path="admin/*"
                  element={
                    <Suspense fallback={<Splash />}>
                      <Admin />
                    </Suspense>
                  }
                />
              </Routes>
            </PlayerProvider>
          </Gate>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}
