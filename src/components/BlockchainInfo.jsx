import React, { useState, useEffect } from 'react'
import { useDarkMode } from '../contexts/DarkModeContext'
import ApiService from '../services/api'

const BlockchainInfo = () => {
  const [blockchainInfo, setBlockchainInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { darkMode } = useDarkMode()

  useEffect(() => {
    loadBlockchainInfo()
  }, [])

  const loadBlockchainInfo = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getBlockchainInfo()
      if (response.success) {
        setBlockchainInfo(response.data)
      }
    } catch (err) {
      setError('Failed to load blockchain information')
      console.error('Error loading blockchain info:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          <i className="fas fa-info-circle mr-2"></i>
          Blockchain Information
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          <i className="fas fa-info-circle mr-2"></i>
          Blockchain Information
        </h2>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadBlockchainInfo}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        <i className="fas fa-info-circle mr-2"></i>
        Blockchain Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg transition-colors duration-300 ${darkMode ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
          <div className={`text-sm font-medium transition-colors duration-300 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Current Block</div>
          <div className={`text-2xl font-bold transition-colors duration-300 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
            {blockchainInfo?.currentBlock?.toLocaleString() || 'Unknown'}
          </div>
        </div>
        <div className={`p-4 rounded-lg transition-colors duration-300 ${darkMode ? 'bg-green-900/50' : 'bg-green-50'}`}>
          <div className={`text-sm font-medium transition-colors duration-300 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>Network</div>
          <div className={`text-2xl font-bold transition-colors duration-300 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
            {blockchainInfo?.network || 'Ethereum Mainnet'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlockchainInfo
