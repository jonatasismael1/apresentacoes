import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import ViewPresentation from './pages/ViewPresentation';
import Teleprompter from './pages/Teleprompter';
import TeleprompterQuick from './pages/TeleprompterQuick';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editar/:id" element={<Editor />} />
            <Route path="/novo" element={<Editor />} />
            <Route path="/visualizar/:id" element={<ViewPresentation />} />
            <Route path="/teleprompter" element={<Teleprompter />} />
            <Route path="/teleprompter/:id" element={<Teleprompter />} />
            <Route path="/teleprompter-rapido" element={<TeleprompterQuick />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
