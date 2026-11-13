import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StorePage from './pages/StorePage';
import StatusTracker from './pages/StatusTracker';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StorePage />} />
        <Route path="/status" element={<StatusTracker />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;