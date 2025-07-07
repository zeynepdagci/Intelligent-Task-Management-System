// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './dashboard/Dashboard';
import TeamInformation from './pages/TeamInformation'; // You’ll create this file
// You can import Analytics page or other routes here later

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/team" element={<TeamInformation />} />
      </Routes>
    </BrowserRouter>
  );
}
