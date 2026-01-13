import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaCoins } from 'react-icons/fa';
import { ThemeToggle } from '../common/ThemeToggle';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuth(); // Assuming AuthContext provides user object now

    const navigation = [
        { name: 'Home', href: '/' },
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Markets', href: '/markets' },
        { name: 'Trending', href: '/trending' },
        { name: 'Watchlist', href: '/watchlist' },
        { name: 'Alerts', href: '/alerts' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="glass-card sticky top-0 z-50 bg-white/80 dark:bg-black/50 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 text-2xl font-bold bg-gradient-primary text-transparent bg-clip-text">
                        <FaCoins className="text-3xl text-primary" />
                        <span>CoinVista</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`text-sm font-medium transition-colors duration-200 ${isActive(item.href)
                                    ? 'text-primary'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-primary'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Right Side Actions */}
                    <div className="hidden md:flex items-center space-x-4">
                        <ThemeToggle />

                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hi, {user.name}</span>
                                <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
                            </div>
                        ) : (
                            <div className="flex space-x-2">
                                <Link to="/login">
                                    <Button variant="ghost" size="sm">Login</Button>
                                </Link>
                                <Link to="/signup">
                                    <Button size="sm">Get Started</Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <ThemeToggle />
                        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 dark:text-gray-300">
                            {isOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white dark:bg-dark-100 border-t border-gray-200 dark:border-gray-800">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-200"
                                onClick={() => setIsOpen(false)}
                            >
                                {item.name}
                            </Link>
                        ))}
                        <div className="divider"></div>
                        {!user && (
                            <div className="flex flex-col space-y-2 px-3 mt-2">
                                <Link to="/login" onClick={() => setIsOpen(false)}>
                                    <Button variant="secondary" className="w-full">Login</Button>
                                </Link>
                                <Link to="/signup" onClick={() => setIsOpen(false)}>
                                    <Button className="w-full">Sign Up</Button>
                                </Link>
                            </div>
                        )}
                        {user && (
                            <div className="flex flex-col space-y-2 px-3 mt-2">
                                <Button variant="outline" onClick={() => { logout(); setIsOpen(false); }}>Logout</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
