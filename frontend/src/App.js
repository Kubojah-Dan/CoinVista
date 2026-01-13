import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Markets from './pages/Markets';
import Trending from './pages/Trending';
import Watchlist from './pages/Watchlist';

import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <div className="min-h-screen bg-base-200 text-base-content transition-colors duration-300">
                        <Navbar />
                        <div className="container mx-auto px-4 py-8">
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<Signup />} />
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
                            </Routes>
                        </div>
                        <Toaster position="top-right" />
                    </div>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
