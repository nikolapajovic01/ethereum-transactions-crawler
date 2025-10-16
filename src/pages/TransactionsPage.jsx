import React, { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'
import ApiService from '../services/api'
import Loading from '../components/Loading.jsx'

const TransactionsPage = () => {
  const { walletAddress } = useParams()
  const location = useLocation()
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState(null)
  const [warning, setWarning] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [tokenMetadata, setTokenMetadata] = useState({}) // Cache for token metadata
  const [totalCount, setTotalCount] = useState(null) // Total transaction count
  const { darkMode } = useDarkMode()

  useEffect(() => {
    if (walletAddress) {
      loadTransactions(1) // Reset to page 1
    }
  }, [walletAddress, location.search])

  // Load token metadata when transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      const uniqueContracts = [...new Set(
        transactions
          .filter(tx => tx.token_contract)
          .map(tx => tx.token_contract)
      )];
      
      // Load token metadata with delay to avoid rate limiting
      uniqueContracts.forEach(async (contract, index) => {
        if (!tokenMetadata[contract]) {
          // Add delay between requests to avoid rate limiting
          setTimeout(() => {
            loadTokenMetadata(contract);
          }, index * 150); // 150ms delay between each request
        }
      });
    }
  }, [transactions])

  const loadTransactions = async (page = 1) => {
    try {
      console.log(`🔄 Loading transactions for ${walletAddress}, page ${page}...`)
      setLoading(true)
      setError(null)
      setCurrentPage(page)
      
      // Check if we have URL parameters for specific block range
      const urlParams = new URLSearchParams(location.search)
      const startBlock = urlParams.get('startBlock')
      const endBlock = urlParams.get('endBlock')
      
      // Always use live endpoint - if no specific range, get all transactions from block 0
      const finalStartBlock = startBlock || '0'
      const finalEndBlock = endBlock || null
      
      console.log(`🚀 Loading live transactions for blocks ${finalStartBlock}-${finalEndBlock || 'latest'}, page ${page}`)
      
      // Load transactions and stats immediately
      const [transactionsResponse, statsResponse] = await Promise.allSettled([
        ApiService.getLiveTransactions(walletAddress, finalStartBlock, finalEndBlock, page),
        ApiService.getTransactionStats(walletAddress, finalStartBlock, finalEndBlock)
      ]);
      
      console.log(`🚀 Frontend received responses:`, { transactionsResponse, statsResponse })
      
      // Handle transactions response
      if (transactionsResponse.status === 'fulfilled' && transactionsResponse.value.success) {
        setTransactions(transactionsResponse.value.data.transactions)
        setWarning(transactionsResponse.value.data.warning)
        setPagination(transactionsResponse.value.data.pagination)
      } else {
        throw new Error('Failed to load transactions')
      }
      
      // Handle stats response
      if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
        setStats(statsResponse.value.data)
      }
      
      // Load count separately with delay to avoid rate limits
      setTimeout(async () => {
        try {
          const countResponse = await ApiService.getTransactionCount(walletAddress, finalStartBlock, finalEndBlock);
          if (countResponse.success) {
            setTotalCount(countResponse.data.total_count)
            // Update pagination with total count
            setPagination(prev => ({
              ...prev,
              totalTransactions: countResponse.data.total_count,
              totalPages: countResponse.data.total_count > 0 ? 
                Math.ceil(countResponse.data.total_count / (prev?.pageSize || 30)) : null
            }))
          }
        } catch (error) {
          console.warn('Failed to load count:', error)
        }
      }, 300) // Reduced delay
      
    } catch (err) {
      setError(err.message || 'Failed to load transactions')
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load token metadata asynchronously
  const loadTokenMetadata = async (contractAddress) => {
    if (tokenMetadata[contractAddress]) return tokenMetadata[contractAddress];
    
    try {
      const response = await ApiService.getTokenMetadata(contractAddress);
      if (response.success) {
        const meta = response.data;
        setTokenMetadata(prev => ({ ...prev, [contractAddress]: meta }));
        return meta;
      }
    } catch (error) {
      console.warn(`Failed to load token metadata for ${contractAddress}:`, error);
    }
    return null;
  };

  // Process token transactions to display proper amounts
  const processTokenTransaction = (tx) => {
    if (tx.token_contract && tx.token_amount && tokenMetadata[tx.token_contract]) {
      const meta = tokenMetadata[tx.token_contract];
      const amount = BigInt(tx.token_amount);
      const divisor = Math.pow(10, Number(meta.decimals || 18));
      const formattedAmount = (Number(amount) / divisor).toFixed(6);
      
      return {
        ...tx,
        token_amount: formattedAmount,
        token_symbol: meta.symbol,
        token_decimals: meta.decimals
      };
    }
    return tx;
  };


  const formatValue = (value, decimals = 18) => {
    return parseFloat(value) / Math.pow(10, decimals)
  }

  const formatTimestamp = (timestamp) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString()
  }

  const getTransactionType = (from, to) => {
    if (from.toLowerCase() === walletAddress.toLowerCase()) {
      return 'outgoing'
    } else if (to.toLowerCase() === walletAddress.toLowerCase()) {
      return 'incoming'
    }
    return 'unknown'
  }

  if (loading && transactions.length === 0) {
    return <Loading text="Loading transactions..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-lg shadow-lg p-6 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-3xl font-bold transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <i className="fas fa-list mr-3"></i>
              Transactions
            </h1>
            <p className={`mt-2 font-mono text-sm transition-colors duration-300 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {walletAddress}
            </p>
          </div>
          <Link
            to="/"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Home
          </Link>
        </div>

        {/* Warning */}
        {warning && (
          <div className={`rounded-lg p-4 mb-6 border-l-4 transition-colors duration-300 ${darkMode ? 'bg-yellow-900/20 border-yellow-500' : 'bg-yellow-50 border-yellow-400'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-yellow-500"></i>
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium transition-colors duration-300 ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                  Results Limited
                </h3>
                <div className={`mt-2 text-sm transition-colors duration-300 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  <p>{warning.message}</p>
                  <p className="mt-1 font-medium">{warning.suggestion}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className={`p-4 rounded-lg transition-colors duration-300 ${darkMode ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
                <div className={`text-sm font-medium transition-colors duration-300 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Total Transactions
                  {stats.is_limit_reached && (
                    <span className="text-yellow-500 text-xs block">(max 10k)</span>
                  )}
                </div>
                <div className={`text-2xl font-bold transition-colors duration-300 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>{stats.total_transactions}</div>
              </div>
              <div className={`p-4 rounded-lg transition-colors duration-300 ${darkMode ? 'bg-green-900/50' : 'bg-green-50'}`}>
                <div className={`text-sm font-medium transition-colors duration-300 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>Incoming</div>
                <div className={`text-2xl font-bold transition-colors duration-300 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{stats.incoming_count}</div>
              </div>
              <div className={`p-4 rounded-lg transition-colors duration-300 ${darkMode ? 'bg-red-900/50' : 'bg-red-50'}`}>
                <div className={`text-sm font-medium transition-colors duration-300 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Outgoing</div>
                <div className={`text-2xl font-bold transition-colors duration-300 ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{stats.outgoing_count}</div>
              </div>
            </div>
            
            {stats.limit_warning && (
              <div className={`mb-4 p-4 rounded-lg border-l-4 border-yellow-500 ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                      {stats.limit_warning.message}
                    </p>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>
                      {stats.limit_warning.note}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6" data-testid="error" role="alert">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-red-600 mr-3"></i>
            <div>
              <h3 className="text-red-800 font-semibold">Error Loading Transactions</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
          <button
            onClick={loadTransactions}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Transactions Table */}
      {!error && (
        <div className={`rounded-lg shadow-lg overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`px-6 py-4 border-b transition-colors duration-300 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-xl font-bold transition-colors duration-300 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Transaction History
              {transactions.length > 0 && (
                <span className={`text-sm font-normal ml-2 transition-colors duration-300 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ({transactions.length} total)
                </span>
              )}
            </h2>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <i className={`text-4xl mb-4 transition-colors duration-300 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}></i>
              <p className={`transition-colors duration-300 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No transactions found for this wallet address.</p>
              <p className={`text-sm mt-2 transition-colors duration-300 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Try starting a crawl from the home page to collect transaction data.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table data-testid="transaction-table" className={`min-w-full divide-y transition-colors duration-300 ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <thead className={`transition-colors duration-300 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Hash
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Type
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        From
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        To
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Value
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Token
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Amount
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Block
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors duration-300 ${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                    {transactions.map((tx, index) => {
                      const processedTx = processTokenTransaction(tx);
                      const type = getTransactionType(tx.from_address, tx.to_address)
                      return (
                        <tr key={index} className={`transition-colors duration-300 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a
                              href={`https://etherscan.io/tx/${tx.transaction_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                            >
                              {tx.transaction_hash.slice(0, 10)}...
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              type === 'incoming' 
                                ? 'bg-green-100 text-green-800' 
                                : type === 'outgoing' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {type}
                            </span>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-mono text-sm transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {tx.from_address.slice(0, 10)}...{tx.from_address.slice(-8)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-mono text-sm transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {tx.to_address.slice(0, 10)}...{tx.to_address.slice(-8)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {parseFloat(tx.value).toFixed(6)} ETH
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {processedTx.token_contract ? (
                              processedTx.token_symbol ? 
                                processedTx.token_symbol : 
                                <span className="text-gray-500">Loading...</span>
                            ) : '-'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {processedTx.token_contract ? (
                              processedTx.token_symbol ? 
                                processedTx.token_amount : 
                                <span className="text-gray-500">Loading...</span>
                            ) : '-'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {tx.block_number}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {formatTimestamp(tx.timestamp)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination && (pagination.hasNextPage || pagination.hasPrevPage) && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className={`text-sm transition-colors duration-300 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Showing {transactions.length} transactions
                      <span> • Page {pagination.currentPage}</span>
                      {pagination?.totalPages && (
                        <span> of {pagination.totalPages} pages</span>
                      )}
                      {totalCount !== null && (
                        <span> • {totalCount} total</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadTransactions(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrevPage || loading}
                        className={`px-3 py-2 rounded-md font-medium transition-colors duration-300 ${
                          !pagination.hasPrevPage || loading
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        <i className="fas fa-chevron-left mr-1"></i>
                        Previous
                      </button>
                      <button
                        onClick={() => loadTransactions(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage || loading}
                        className={`px-3 py-2 rounded-md font-medium transition-colors duration-300 ${
                          !pagination.hasNextPage || loading
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Next
                        <i className="fas fa-chevron-right ml-1"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TransactionsPage
