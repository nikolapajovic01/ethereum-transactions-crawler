import React, { useState } from 'react'
import { useDarkMode } from '../contexts/DarkModeContext'
import ApiService from '../services/api'
import Loading from './Loading.jsx'

const BalanceChecker = () => {
  const [walletAddress, setWalletAddress] = useState('')
  const [date, setDate] = useState('')
  const [showDateInput, setShowDateInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [balanceResult, setBalanceResult] = useState(null)
  const [error, setError] = useState('')
  const { darkMode } = useDarkMode()

  const validateAddress = (address) => {
    if (!address) {
      setError('Please enter a wallet address')
      return false
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid wallet address format')
      return false
    }
    setError('')
    return true
  }

  const getCurrentBalance = async () => {
    if (!validateAddress(walletAddress)) return

    setLoading(true)
    setBalanceResult(null)

    try {
      const response = await ApiService.getCurrentBalance(walletAddress)
      if (response.success) {
        setBalanceResult({
          ...response.data,
          title: 'Current Balance'
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to get current balance')
    } finally {
      setLoading(false)
    }
  }

  

  const toggleDateInput = () => {
    setShowDateInput(!showDateInput)
    setDate('')
    setBalanceResult(null)
    setError('')
  }

  const handleDateChange = (e) => {
    const newDate = e.target.value
    setDate(newDate)
    setError('')
    if (newDate) {
      // Use the new date value directly instead of state
      getBalanceAtDateWithDate(newDate)
    }
  }

  const getBalanceAtDateWithDate = async (dateValue) => {
    if (!validateAddress(walletAddress)) return
    if (!dateValue) {
      setError('Please select a date')
      return
    }

    // Check if date is in the future
    const selectedDate = new Date(dateValue)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    if (selectedDate > today) {
      setError('Cannot get balance for future dates. Please select a date from today or earlier.')
      return
    }

    setLoading(true)
    setBalanceResult(null)
    setError('')

    try {
      const response = await ApiService.getBalanceAtDate(walletAddress, dateValue)
      if (response.success) {
        setBalanceResult({
          ...response.data,
          title: `Balance on ${dateValue}`
        })
      } else {
        setError(response.error || 'Failed to get balance')
      }
    } catch (err) {
      setError(err.message || 'Failed to get balance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <Loading text="Getting balance..." />}
      
      <div className={`rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          <i className="fas fa-wallet mr-2"></i>
          Balance Checker
        </h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="balanceWalletAddress" className={`block text-sm font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Wallet Address
            </label>
            <input
              type="text"
              id="balanceWalletAddress"
              value={walletAddress}
              onChange={(e) => {
                setWalletAddress(e.target.value)
                setError('')
              }}
              placeholder="0xaa7a9ca87d3694b5755f213b5d04094b8d0f0a6f"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={getCurrentBalance}
              disabled={loading}
              className="bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50"
            >
              <i className="fas fa-coins mr-2"></i>
              Get Current Balance
            </button>
            
            <button
              type="button"
              onClick={toggleDateInput}
              disabled={loading}
              className="bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50"
            >
              <i className="fas fa-calendar mr-2"></i>
              Get Balance at Date
            </button>
          </div>
          
          {showDateInput && (
            <div>
              <label htmlFor="balanceDate" className="block text-sm font-medium text-gray-700 mb-2">
                Date (YYYY-MM-DD)
              </label>
              <input
                type="date"
                id="balanceDate"
                value={date}
                onChange={handleDateChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          )}
          
          {error && (
            <div className={`border rounded-md p-3 transition-colors duration-300 ${darkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200'}`}>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          {balanceResult && (
            <div className={`p-4 rounded-lg transition-colors duration-300 ${darkMode ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
              <h3 className={`text-lg font-semibold mb-3 transition-colors duration-300 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                {balanceResult.title}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className={`text-lg transition-colors duration-300 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                    <span className="font-medium">Balance:</span> {parseFloat(balanceResult.balance).toFixed(6)} ETH
                  </p>
                </div>
                <div>
                  <p className={`text-lg transition-colors duration-300 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                    <span className="font-medium">Block Number:</span> {balanceResult.blockNumber}
                  </p>
                </div>
                {balanceResult.date && (
                  <div>
                    <p className={`text-lg transition-colors duration-300 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                      <span className="font-medium">Date:</span> {balanceResult.date}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default BalanceChecker
