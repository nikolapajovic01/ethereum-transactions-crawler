import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'

const CrawlHistory = () => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const { darkMode } = useDarkMode()

  useEffect(() => {
    loadRecentSearches()
  }, [])

  const loadRecentSearches = () => {
    setLoading(true)
    try {
      // Get recent searches from localStorage
      const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]')
      setHistory(recentSearches.slice(0, 10)) // Show last 10 searches
    } catch (err) {
      console.error('Error loading recent searches:', err)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  // Listen for new searches and update history
  useEffect(() => {
    const handleStorageChange = () => {
      loadRecentSearches()
    }
    
    window.addEventListener('searchCompleted', handleStorageChange)
    
    return () => {
      window.removeEventListener('searchCompleted', handleStorageChange)
    }
  }, [])


  if (loading) {
    return (
      <div className={`rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          <i className="fas fa-history mr-2"></i>
          Crawl History
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }


  return (
    <div className={`rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <h2 data-testid="recent-searches-title" className={`text-2xl font-bold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        <i className="fas fa-history mr-2"></i>
        Recent Searches
      </h2>
      
      {history.length === 0 ? (
        <p className={`transition-colors duration-300 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No recent entries found. Start searching to see your history here.</p>
      ) : (
        <div className="space-y-4">
          {history.map((search, index) => (
            <div key={index} className={`p-4 rounded-lg transition-colors duration-300 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`font-medium font-mono text-sm transition-colors duration-300 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {search.walletAddress}
                  </p>
                  <p className={`text-sm transition-colors duration-300 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Blocks: {search.startBlock} - {search.endBlock || 'Latest'} | 
                    Transactions: {search.transactionCount !== undefined ? search.transactionCount : 0} | 
                    Status: <span className="text-green-600">Completed</span>
                  </p>
                </div>
                <div className="text-right">
                  <Link
                    to={`/transactions/${search.walletAddress}?startBlock=${search.startBlock}&endBlock=${search.endBlock}`}
                    className="text-blue-600 hover:text-blue-800 text-sm block mb-1"
                  >
                    View Results
                  </Link>
                  <p className={`text-xs transition-colors duration-300 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {new Date(search.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CrawlHistory
