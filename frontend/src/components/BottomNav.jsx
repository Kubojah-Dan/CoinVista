import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  BarChart3,
  TrendingUp,
  Bell,
  Settings,
  Plus,
} from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/markets', icon: TrendingUp, label: 'Markets' },
    { path: '/alerts', icon: Bell, label: 'Alerts' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path) => active === path;

  return (
    <>
      {/* Bottom Navigation - only visible on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden px-2 pb-2 safe-area-bottom">
        {/* Add Holding button (floating) */}
        <div className="relative">
          <div className="flex justify-between items-end h-20 px-2 bg-base-100/95 dark:bg-dark-200/95 backdrop-blur-xl border border-base-200 dark:border-dark-100 shadow-xl" style={{ borderRadius: '28px' }}>
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center p-2 rounded-2xl transition-all duration-200 ${isActive(item.path) ? 'bg-primary/10 text-primary scale-110' : 'text-base-content hover:bg-base-200/50'}`}
                  onClick={() => {
                    setActive(item.path);
                  }}
                >
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
            
            {/* Center add button space */}
            <div className="w-16 h-10"></div>
            
            {navItems.slice(2).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center p-2 rounded-2xl transition-all duration-200 ${isActive(item.path) ? 'bg-primary/10 text-primary scale-110' : 'text-base-content hover:bg-base-200/50'}`}
                  onClick={() => {
                    setActive(item.path);
                  }}
                >
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
          {/* Floating Add button */}
          <button
            className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-xl shadow-primary/30 hover:scale-105 transition-transform border-4 border-base-100 dark:border-dark-200"
            onClick={() => {
              // This can trigger add holding modal via context or event
              window.dispatchEvent(new CustomEvent('openAddHolding'));
            }}
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      </nav>
      {/* Add bottom padding for pages so content isn't hidden behind the nav */}
      <div className="h-32 md:hidden"></div>
    </>
  );
};

export default BottomNav;