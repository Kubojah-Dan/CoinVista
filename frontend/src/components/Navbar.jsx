import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaCoins, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();

    // Mock auth state for now
    const isAuthenticated = false;

    const navigation = [
        { name: 'Home', href: '/' },
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Markets', href: '/markets' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="bg-base-100 shadow-lg sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 text-2xl font-bold text-primary">
                        <FaCoins className="text-3xl" />
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
                                        : 'text-base-content hover:text-primary'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Right Side Actions */}
                    <div className="hidden md:flex items-center space-x-4">
                        {/* Theme Toggle */}
                        <label className="swap swap-rotate btn btn-ghost btn-circle">
                            <input type="checkbox" onChange={toggleTheme} checked={theme === 'dark'} />
                            {/* Sun icon */}
                            <svg className="swap-on fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,5.64,7.05Zm12,10.6a1,1,0,0,0,0,1.41l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,17.66,17.66ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,6.64a1,1,0,0,0-1.41,0,1,1,0,0,0,0,1.41l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" /></svg>
                            {/* Moon icon */}
                            <svg className="swap-off fill-current w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" /></svg>
                        </label>

                        {isAuthenticated ? (
                            <button className="btn btn-ghost btn-circle avatar">
                                <FaUser className="text-xl" />
                            </button>
                        ) : (
                            <div className="flex space-x-2">
                                <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                                <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsOpen(!isOpen)} className="btn btn-ghost btn-circle">
                            {isOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-base-100 border-t border-base-200">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className="block px-3 py-2 rounded-md text-base font-medium text-base-content hover:bg-base-200"
                                onClick={() => setIsOpen(false)}
                            >
                                {item.name}
                            </Link>
                        ))}
                        <div className="divider"></div>
                        <div className="flex items-center justify-between px-3 py-2">
                            <span>Theme</span>
                            <input type="checkbox" className="toggle toggle-primary" checked={theme === 'dark'} onChange={toggleTheme} />
                        </div>
                        {!isAuthenticated && (
                            <div className="flex flex-col space-y-2 px-3 mt-2">
                                <Link to="/login" className="btn btn-ghost btn-sm w-full">Login</Link>
                                <Link to="/signup" className="btn btn-primary btn-sm w-full">Sign Up</Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
