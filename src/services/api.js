const API_BASE_URL = '/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Blockchain info
  async getBlockchainInfo() {
    return this.request('/blockchain/info');
  }




  // Get live transactions (direct from blockchain - faster)
  async getLiveTransactions(walletAddress, startBlock, endBlock, page = 1, pageSize = 30) {
    const params = new URLSearchParams({
      startBlock: startBlock.toString(),
      page: page.toString(),
      pageSize: pageSize.toString()
    });
    
    if (endBlock !== null && endBlock !== undefined) {
      params.append('endBlock', endBlock.toString());
    }
    
    return this.request(`/transactions/live/${walletAddress}?${params}`);
  }

  // Get current balance
  async getCurrentBalance(walletAddress) {
    return this.request(`/balance/${walletAddress}`);
  }

  // Get balance at date
  async getBalanceAtDate(walletAddress, date) {
    return this.request(`/balance/${walletAddress}/${date}`);
  }

  // Get token metadata
  async getTokenMetadata(contractAddress) {
    return this.request(`/token-meta/${contractAddress}`);
  }

  // Get transaction statistics for entire block range
  async getTransactionStats(walletAddress, startBlock, endBlock) {
    const params = new URLSearchParams({
      startBlock: startBlock.toString()
    });
    
    if (endBlock !== null && endBlock !== undefined) {
      params.append('endBlock', endBlock.toString());
    }
    
    return this.request(`/transactions/stats/${walletAddress}?${params}`);
  }

  // Get total transaction count
  async getTransactionCount(walletAddress, startBlock, endBlock) {
    const params = new URLSearchParams({
      startBlock: startBlock.toString()
    });
    
    if (endBlock !== null && endBlock !== undefined) {
      params.append('endBlock', endBlock.toString());
    }
    
    return this.request(`/transactions/count/${walletAddress}?${params}`);
  }

}

export default new ApiService();
