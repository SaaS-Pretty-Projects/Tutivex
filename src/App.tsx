import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import FeaturedVideoSection from './components/FeaturedVideoSection';
import PhilosophySection from './components/PhilosophySection';
import ServicesSection from './components/ServicesSection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import ProfileSettings from './components/ProfileSettings';
import CourseDetail from './components/CourseDetail';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

function LandingPage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <FeaturedVideoSection />
      <PhilosophySection />
      <ServicesSection />
      <CTASection />
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black font-sans selection:bg-white/30 selection:text-white">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<ProfileSettings />} />
              <Route path="/courses/:courseId" element={<CourseDetail />} />
            </Route>
          </Route>
        </Routes>
      </div>
    </Router>
  );
}
