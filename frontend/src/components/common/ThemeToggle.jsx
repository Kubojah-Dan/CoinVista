import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors"
            aria-label="Toggle Theme"
        >
            {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-gray-100" />
            ) : (
                <Sun className="w-5 h-5 text-gray-600" />
            )}
        </button>
    );
};
