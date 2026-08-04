import { Routes, Route } from 'react-router-dom';
import TopAppBar from './components/TopAppBar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Explore from './pages/Explore';
import ImageGen from './pages/ImageGen';
import VideoGen from './pages/VideoGen';
import AudioGen from './pages/AudioGen';
import EditAI from './pages/EditAI';
import Transitions from './pages/Transitions';
import Storyboard from './pages/Storyboard';
import Pricing from './pages/Pricing';
import Profile from './pages/Profile';

export default function App() {
  return (
    <div className="min-h-full bg-surface text-on-surface">
      <TopAppBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/image" element={<ImageGen />} />
        <Route path="/video" element={<VideoGen />} />
        <Route path="/audio" element={<AudioGen />} />
        <Route path="/edit" element={<EditAI />} />
        <Route path="/transitions" element={<Transitions />} />
        <Route path="/storyboard" element={<Storyboard />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
