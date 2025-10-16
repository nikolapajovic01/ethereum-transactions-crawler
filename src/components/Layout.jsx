import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'

const Layout = ({ children }) => {
  const location = useLocation()
  const { darkMode, toggleDarkMode } = useDarkMode()

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-4">
              <img 
                src="/origintrail.svg" 
                alt="OriginTrail Logo" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Ethereum Transactions Explorer
                </h1>
                <p className="text-sm text-blue-100">
                  Powered by OriginTrail - Crawl and visualize Ethereum transaction data
                </p>
              </div>
            </Link>
            
            <nav className="flex items-center space-x-4">
              <Link
                to="/"
                className={`px-4 py-2 rounded-md transition-colors ${
                  location.pathname === '/'
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-blue-100 hover:text-white hover:bg-blue-600'
                }`}
              >
                <i className="fas fa-home mr-2"></i>
                Home
              </Link>
              
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-md transition-all duration-300 ${
                  darkMode 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`container mx-auto px-4 py-8 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {children}
      </main>

      {/* Footer */}
      <footer className={`border-t mt-12 transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="container mx-auto px-4 py-6">
          <div className={`text-center transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <p>&copy; 2024 OriginTrail. Ethereum Transactions Explorer built with React & Node.js</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
