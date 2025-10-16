import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import TransactionsPage from '../pages/TransactionsPage'
import ApiService from '../services/api'

// Mock API service
jest.mock('../services/api')
const mockApiService = ApiService

// Mock useParams and useLocation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ walletAddress: '0x28C6c06298d514Db089934071355E5743bf21d60' }),
  useLocation: () => ({ search: '?startBlock=23583000&endBlock=23583080' })
}))

// Mock useDarkMode hook
jest.mock('../contexts/DarkModeContext', () => ({
  useDarkMode: () => ({ darkMode: false })
}))

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('TransactionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading state initially', () => {
    mockApiService.getLiveTransactions.mockResolvedValue({
      success: true,
      data: { transactions: [], stats: null, pagination: null }
    })
    mockApiService.getTransactionStats.mockResolvedValue({
      success: true,
      data: { total_transactions: 0, incoming_count: 0, outgoing_count: 0 }
    })

    renderWithRouter(<TransactionsPage />)
    
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument()
  })

  it('should render transactions when loaded', async () => {
    const mockTransactions = [
      {
        transaction_hash: '0x123',
        from_address: '0xfrom',
        to_address: '0x28C6c06298d514Db089934071355E5743bf21d60',
        value: '1.000000',
        block_number: 12345678,
        timestamp: 1234567890,
        token_amount: null,
        token_symbol: null,
        token_contract: null,
        transaction_type: 'ETH Transfer'
      }
    ]

    const mockStats = {
      total_transactions: 1,
      incoming_count: 1,
      outgoing_count: 0,
      is_limit_reached: false
    }

    mockApiService.getLiveTransactions.mockResolvedValue({
      success: true,
      data: { 
        transactions: mockTransactions, 
        stats: mockStats, 
        pagination: { currentPage: 1, pageSize: 30 }
      }
    })
    mockApiService.getTransactionStats.mockResolvedValue({
      success: true,
      data: mockStats
    })

    renderWithRouter(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByText('0x123')).toBeInTheDocument()
      expect(screen.getByText('1.000000 ETH')).toBeInTheDocument()
    })

    // Check stats
    expect(screen.getByText('1')).toBeInTheDocument() // total transactions
    expect(screen.getByText('Incoming')).toBeInTheDocument()
    expect(screen.getByText('Outgoing')).toBeInTheDocument()
  })

  it('should render error state when API fails', async () => {
    mockApiService.getLiveTransactions.mockRejectedValue(new Error('API Error'))
    mockApiService.getTransactionStats.mockResolvedValue({
      success: true,
      data: { total_transactions: 0, incoming_count: 0, outgoing_count: 0 }
    })

    renderWithRouter(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Transactions')).toBeInTheDocument()
      expect(screen.getByText('API Error')).toBeInTheDocument()
    })
  })

  it('should display token information when available', async () => {
    const mockTransactions = [
      {
        transaction_hash: '0x123',
        from_address: '0xfrom',
        to_address: '0x28C6c06298d514Db089934071355E5743bf21d60',
        value: '0.000000',
        block_number: 12345678,
        timestamp: 1234567890,
        token_amount: '1000000',
        token_symbol: 'USDT',
        token_contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        transaction_type: 'Token Transfer'
      }
    ]

    mockApiService.getLiveTransactions.mockResolvedValue({
      success: true,
      data: { 
        transactions: mockTransactions, 
        stats: { total_transactions: 1, incoming_count: 1, outgoing_count: 0 },
        pagination: { currentPage: 1, pageSize: 30 }
      }
    })
    mockApiService.getTransactionStats.mockResolvedValue({
      success: true,
      data: { total_transactions: 1, incoming_count: 1, outgoing_count: 0 }
    })
    mockApiService.getTokenMetadata.mockResolvedValue({
      success: true,
      data: { symbol: 'USDT', decimals: 6 }
    })

    renderWithRouter(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByText('USDT')).toBeInTheDocument()
      expect(screen.getByText('1.000000')).toBeInTheDocument() // 1000000 / 10^6
    })
  })
})

