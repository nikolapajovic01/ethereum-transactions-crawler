import BlockchainService from '../services/blockchainService.js'

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    getAddress: jest.fn((addr) => addr),
    Contract: jest.fn(() => ({
      decimals: jest.fn().mockResolvedValue(6),
      symbol: jest.fn().mockResolvedValue('USDT'),
      name: jest.fn().mockResolvedValue('Tether USD')
    })),
    JsonRpcProvider: jest.fn(),
    AbiCoder: {
      defaultAbiCoder: jest.fn(() => ({
        decode: jest.fn()
      }))
    },
    decodeBytes32String: jest.fn(),
    getBytes: jest.fn()
  }
}))

describe('BlockchainService', () => {
  let blockchainService

  beforeEach(() => {
    blockchainService = BlockchainService
  })

  describe('getTokenMeta', () => {
    it('should return token metadata for valid contract', async () => {
      const contractAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      
      const result = await blockchainService.getTokenMeta(contractAddress)
      
      expect(result).toEqual({
        decimals: 6,
        symbol: 'USDT',
        name: 'Tether USD'
      })
    })

    it('should cache token metadata', async () => {
      const contractAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      
      // First call
      await blockchainService.getTokenMeta(contractAddress)
      
      // Second call should use cache
      const result = await blockchainService.getTokenMeta(contractAddress)
      
      expect(result).toEqual({
        decimals: 6,
        symbol: 'USDT',
        name: 'Tether USD'
      })
    })

    it('should return fallback for invalid contract', async () => {
      // Mock contract to throw error
      const mockContract = {
        decimals: jest.fn().mockRejectedValue(new Error('Contract call failed')),
        symbol: jest.fn().mockRejectedValue(new Error('Contract call failed')),
        name: jest.fn().mockRejectedValue(new Error('Contract call failed'))
      }
      
      const { ethers } = await import('ethers')
      ethers.Contract.mockReturnValue(mockContract)
      
      const contractAddress = '0xInvalidContract'
      const result = await blockchainService.getTokenMeta(contractAddress)
      
      expect(result.symbol).toContain('Unknown')
      expect(result.decimals).toBe(18)
    })
  })

  describe('sanitizeTokenText', () => {
    it('should remove non-printable characters', () => {
      const input = 'USDT\x00\x01\x02'
      const result = blockchainService.sanitizeTokenText(input)
      expect(result).toBe('USDT')
    })

    it('should handle empty string', () => {
      const result = blockchainService.sanitizeTokenText('')
      expect(result).toBe(null)
    })

    it('should handle null input', () => {
      const result = blockchainService.sanitizeTokenText(null)
      expect(result).toBe(null)
    })
  })
})
