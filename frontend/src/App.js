import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Markets from './pages/Markets';
import PaperTrading from './pages/PaperTrading';
import Settings from './pages/Settings';
import Trending from './pages/Trending';
import Watchlist from './pages/Watchlist';
import CoinDetail from './pages/CoinDetail';

import ProtectedRoute from './components/ProtectedRoute';

function AppShell() {
    const location = useLocation();
    const isAuthRoute = ['/login', '/signup', '/register'].includes(location.pathname);

    return (
        <div className="min-h-screen bg-base-200 text-base-content transition-colors duration-300">
            {!isAuthRoute && <Navbar />}
            <div className={isAuthRoute ? '' : 'container mx-auto px-4 py-8'}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/signup" element={<AuthPage />} />
                    <Route path="/register" element={<Navigate to="/signup" replace />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/alerts"
                        element={
                            <ProtectedRoute>
                                <Alerts />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/markets"
                        element={
                            <ProtectedRoute>
                                <Markets />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/simulator"
                        element={
                            <ProtectedRoute>
                                <PaperTrading />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/trending"
                        element={
                            <ProtectedRoute>
                                <Trending />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/watchlist"
                        element={
                            <ProtectedRoute>
                                <Watchlist />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/coin/:id"
                        element={
                            <ProtectedRoute>
                                <CoinDetail />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <AppShell />
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
