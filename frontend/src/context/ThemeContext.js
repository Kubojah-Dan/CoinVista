// Theme Context - Manages dark/light mode theme switching
import { createContext, useContext, useState, useEffect } from "react"

const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem("theme")
        if (stored) {
            return stored === "dark"
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches
    })

    useEffect(() => {
        const root = window.document.documentElement
        if (isDark) {
            root.classList.add("dark")
            root.setAttribute('data-theme', 'dark')
            localStorage.setItem("theme", "dark")
        } else {
            root.classList.remove("dark")
            root.setAttribute('data-theme', 'light')
            localStorage.setItem("theme", "light")
        }
    }, [isDark])

    const toggleTheme = () => {
        setIsDark((prev) => !prev)
    }

    const value = {
        isDark,
        toggleTheme,
        theme: isDark ? "dark" : "light",
    }

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider")
    }
    return context
}
