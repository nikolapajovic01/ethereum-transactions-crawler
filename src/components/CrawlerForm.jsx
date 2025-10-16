import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'
import ApiService from '../services/api'
import Loading from './Loading.jsx'

const CrawlerForm = () => {
  const [formData, setFormData] = useState({
    walletAddress: '',
    startBlock: '',
    endBlock: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { darkMode } = useDarkMode()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
  }

  const validateForm = () => {
    if (!formData.walletAddress || !formData.startBlock) {
      setError('Wallet address and start block are required')
      return false
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress)) {
      setError('Invalid wallet address format')
      return false
    }

    const startBlock = parseInt(formData.startBlock)
    if (isNaN(startBlock) || startBlock < 0) {
      setError('Start block must be a valid positive number')
      return false
    }

    if (formData.endBlock) {
      const endBlock = parseInt(formData.endBlock)
      if (isNaN(endBlock) || endBlock < startBlock) {
        setError('End block must be greater than or equal to start block')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError('')

    try {
      // Use live endpoint with Etherscan API for instant results
      const [transactionsResponse, statsResponse] = await Promise.allSettled([
        ApiService.getLiveTransactions(
          formData.walletAddress,
          parseInt(formData.startBlock),
          formData.endBlock ? parseInt(formData.endBlock) : null
        ),
        ApiService.getTransactionStats(
          formData.walletAddress,
          parseInt(formData.startBlock),
          formData.endBlock ? parseInt(formData.endBlock) : null
        )
      ])

      if (transactionsResponse.status === 'fulfilled' && transactionsResponse.value.success) {
        const response = transactionsResponse.value;
        const stats = statsResponse.status === 'fulfilled' && statsResponse.value.success 
          ? statsResponse.value.data 
          : null;

        // Save to recent searches
        const recentSearch = {
          walletAddress: formData.walletAddress,
          startBlock: formData.startBlock,
          endBlock: formData.endBlock,
          transactionCount: stats?.total_transactions || response.data?.transactions?.length || 0,
          timestamp: new Date().toISOString()
        }
        
        const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]')
        recentSearches.unshift(recentSearch) // Add to beginning
        recentSearches.splice(10) // Keep only last 10
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches))
        
        // Dispatch event to update CrawlHistory component
        window.dispatchEvent(new Event('searchCompleted'))
        
        // Redirect to transactions page with URL params for live search
        navigate(`/transactions/${formData.walletAddress}?startBlock=${formData.startBlock}&endBlock=${formData.endBlock}`)
      }
    } catch (err) {
      setError(err.message || 'Failed to start crawling')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <Loading text="Starting transaction crawling..." />}
      
      <div className={`rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          <i className="fas fa-search mr-2"></i>
          Start Transaction Crawling
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="walletAddress" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Wallet Address
            </label>
            <input
              type="text"
              id="walletAddress"
              name="walletAddress"
              value={formData.walletAddress}
              onChange={handleChange}
              placeholder="0xaa7a9ca87d3694b5755f213b5d04094b8d0f0a6f"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startBlock" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Start Block
              </label>
              <input
                type="number"
                id="startBlock"
                name="startBlock"
                value={formData.startBlock}
                onChange={handleChange}
                placeholder="9000000"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            
            <div>
              <label htmlFor="endBlock" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                End Block (Optional)
              </label>
              <input
                type="number"
                id="endBlock"
                name="endBlock"
                value={formData.endBlock}
                onChange={handleChange}
                placeholder="Leave empty for current block"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
          
          {error && (
            <div className={`border rounded-md p-3 transition-colors duration-300 ${darkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200'}`}>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-play mr-2"></i>
            Start Crawling
          </button>
        </form>
      </div>
    </>
  )
}

export default CrawlerForm
