import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './dashboard/Dashboard';
import TeamInformation from './pages/TeamInformation';


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
