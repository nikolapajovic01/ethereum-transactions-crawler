import request from 'supertest'
import app from './__mocks__/server.js'

// Mock environment variables
process.env.ETHERSCAN_API_KEY = 'test-api-key'
process.env.INFURA_PROJECT_ID = 'test-infura-id'

// Mock fetch for Etherscan API
global.fetch = jest.fn()

describe('API Endpoints', () => {
  beforeEach(() => {
    fetch.mockClear()
  })

  describe('GET /api/transactions/live/:walletAddress', () => {
    it('should return transactions for valid wallet address', async () => {
      const mockResponse = {
        status: '1',
        result: [
          {
            hash: '0x123',
            from: '0xfrom',
            to: '0xto',
            value: '1000000000000000000',
            blockNumber: '12345678',
            timeStamp: '1234567890',
            gasUsed: '21000',
            gasPrice: '20000000000',
            input: '0x',
            txreceipt_status: '1'
          }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const response = await request(app)
        .get('/api/transactions/live/0x28C6c06298d514Db089934071355E5743bf21d60')
        .query({ startBlock: '12345678', page: '1', pageSize: '30' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.transactions).toHaveLength(1)
      expect(response.body.data.transactions[0].transaction_hash).toBe('0x123')
    })

    it('should return 400 for invalid wallet address', async () => {
      const response = await request(app)
        .get('/api/transactions/live/invalid-address')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Invalid wallet address')
    })

    it('should handle Etherscan API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '0',
          message: 'NOTOK',
          result: 'Invalid API Key'
        })
      })

      const response = await request(app)
        .get('/api/transactions/live/0x28C6c06298d514Db089934071355E5743bf21d60')
        .query({ startBlock: '12345678' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Etherscan API error')
    })
  })

  describe('GET /api/transactions/stats/:walletAddress', () => {
    it('should return transaction statistics', async () => {
      const mockResponse = {
        status: '1',
        result: [
          {
            hash: '0x123',
            from: '0xfrom',
            to: '0x28C6c06298d514Db089934071355E5743bf21d60',
            value: '1000000000000000000',
            blockNumber: '12345678',
            timeStamp: '1234567890',
            gasUsed: '21000',
            gasPrice: '20000000000',
            input: '0x',
            txreceipt_status: '1'
          }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const response = await request(app)
        .get('/api/transactions/stats/0x28C6c06298d514Db089934071355E5743bf21d60')
        .query({ startBlock: '12345678' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.total_transactions).toBe(1)
      expect(response.body.data.incoming_count).toBe(1)
      expect(response.body.data.outgoing_count).toBe(0)
    })
  })

  describe('GET /api/token-meta/:contractAddress', () => {
    it('should return token metadata', async () => {
      const response = await request(app)
        .get('/api/token-meta/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('symbol')
      expect(response.body.data).toHaveProperty('decimals')
    })
  })
})
