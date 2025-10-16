import express from 'express';
import blockchainService from '../services/blockchainService.js';

const router = express.Router();

// Get current blockchain info
router.get('/blockchain/info', async (req, res) => {
    try {
        const currentBlock = await blockchainService.getCurrentBlockNumber();
        res.json({
            success: true,
            data: {
                currentBlock: currentBlock,
                network: 'mainnet'
            }
        });
    } catch (error) {
        console.error('Error getting blockchain info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get blockchain information'
        });
    }
});

// Get transactions for a wallet (direct from blockchain - faster)
router.get('/transactions/live/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { startBlock, endBlock, page = 1, pageSize = 30 } = req.query;

        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const etherscanApiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
        
        // Validate API key configuration
        if (etherscanApiKey === 'YourApiKeyToken') {
            return res.status(500).json({
                success: false,
                error: 'Etherscan API key not configured. Please set ETHERSCAN_API_KEY in your .env file.'
            });
        }

        const pageNum = parseInt(page);
        const size = parseInt(pageSize);
        const startBlockNum = parseInt(startBlock);
        const endBlockNum = endBlock ? parseInt(endBlock) : await blockchainService.getCurrentBlockNumber();
        
        // Build Etherscan API URL with pagination
        const endBlockParam = endBlock ? `&endblock=${endBlockNum}` : '';
        const etherscanUrl = `https://api.etherscan.io/v2/api?module=account&action=txlist&address=${walletAddress}&startblock=${startBlockNum}${endBlockParam}&sort=desc&chainid=1&page=${pageNum}&offset=${size}&apikey=${etherscanApiKey}`;
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(etherscanUrl, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: `Etherscan API error: ${response.status} ${response.statusText}`
            });
        }
        
        const data = await response.json();
        
        if (data.status === '0') {
            // Handle "No transactions found" vs actual API errors
            if (data.message === 'No transactions found') {
                return res.json({
                    success: true,
                    data: {
                        transactions: [],
                        stats: {
                            total_transactions: 0,
                            incoming_count: 0,
                            outgoing_count: 0,
                            total_volume: 0
                        }
                    }
                });
            } else {
                // Return API error
                return res.status(400).json({
                    success: false,
                    error: `Etherscan API error: ${data.message}`
                });
            }
        }

        // Transform Etherscan data to our format with ERC-20 token detection
        const ERC20_SELECTOR_TRANSFER = '0xa9059cbb';      // transfer(address,uint256)
        const ERC20_SELECTOR_TRANSFER_FROM = '0x23b872dd'; // transferFrom(address,address,uint256)

        const transactions = [];
        for (const tx of data.result) {
            const valueEth = (parseFloat(tx.value) / Math.pow(10, 18)).toFixed(6);

            let tokenAmount = null;
            let tokenSymbol = null;
            let tokenDecimals = null;
            let tokenContract = null;
            let transactionType = 'ETH Transfer';

            const input = tx.input || '';
            
            // Check for proxy/execute calls first (Gnosis Safe, etc.)
            if (input.startsWith('0xb61d27f6') && input.length >= 138) {
                const tokenContractHex = input.slice(34, 74);
                const extractedTokenContract = '0x' + tokenContractHex;
                
                // Check if embedded data contains token transfer
                const dataStart = input.slice(138);
                if (dataStart.startsWith('0xa9059cbb') || dataStart.startsWith('0x23b872dd')) {
                    tokenContract = extractedTokenContract;
                    transactionType = 'Token Transfer (Proxy)';
                    
                    // Extract amount from embedded transfer data
                    let embeddedAmountHex;
                    if (dataStart.startsWith('0xa9059cbb')) {
                        embeddedAmountHex = dataStart.slice(74, 138);
                    } else {
                        embeddedAmountHex = dataStart.slice(138, 202);
                    }
                    
                    const rawAmount = BigInt('0x' + embeddedAmountHex);
                    tokenAmount = rawAmount.toString();
                }
            } else {
                // Check for direct ERC-20 transfers
                const isTransfer = input.startsWith(ERC20_SELECTOR_TRANSFER) && input.length >= 138;
                const isTransferFrom = input.startsWith(ERC20_SELECTOR_TRANSFER_FROM) && input.length >= 202;

                if ((isTransfer || isTransferFrom) && tx.to) {
                    tokenContract = tx.to;
                    transactionType = 'Token Transfer';
                    
                    // Extract amount from input data
                    let amountHex;
                    if (isTransfer) {
                        amountHex = input.slice(74, 138);
                    } else {
                        amountHex = input.slice(138, 202);
                    }
                    
                    const rawAmount = BigInt('0x' + amountHex);
                    tokenAmount = rawAmount.toString();
                }
            }

            transactions.push({
                transaction_hash: tx.hash,
                from_address: tx.from,
                to_address: tx.to,
                value: valueEth,
                token_amount: tokenAmount,
                token_symbol: tokenSymbol,
                token_decimals: tokenDecimals,
                token_contract: tokenContract,
                token_type: tokenAmount !== null ? 'ERC-20' : null,
                transaction_type: transactionType,
                gas_price: tx.gasPrice,
                gas_limit: tx.gas,
                gas_used: tx.gasUsed,
                block_number: parseInt(tx.blockNumber),
                block_hash: tx.blockHash,
                timestamp: parseInt(tx.timeStamp),
                date: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                transaction_index: parseInt(tx.transactionIndex),
                status: tx.isError === '0' ? 1 : 0,
                type: tx.from.toLowerCase() === walletAddress.toLowerCase() ? 'outgoing' : 'incoming'
            });
        }

        // Check pagination limits and API constraints
        const isLimitReached = transactions.length === 10000;
        const isLastPage = transactions.length < size;
        
        // Calculate stats for current page
        const stats = {
            total_transactions: null,
            incoming_count: transactions.filter(tx => tx.to_address?.toLowerCase() === walletAddress.toLowerCase()).length,
            outgoing_count: transactions.filter(tx => tx.from_address?.toLowerCase() === walletAddress.toLowerCase()).length
        };

        res.json({
            success: true,
            data: {
                transactions: transactions,
                stats: stats,
                pagination: {
                    currentPage: pageNum,
                    pageSize: size,
                    totalTransactions: null,
                    totalPages: null,
                    hasNextPage: !isLastPage && !isLimitReached,
                    hasPrevPage: pageNum > 1
                },
                warning: isLimitReached ? {
                    message: "Results limited to 10,000 transactions. There might be more transactions available.",
                    suggestion: "Try reducing the block range for more complete results."
                } : null
            }
        });

    } catch (error) {
        console.error('Error getting live transactions:', error);
        
        let errorMessage = 'Failed to get live transactions';
        if (error.name === 'AbortError') {
            errorMessage = 'Request timeout - Etherscan API took too long to respond';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = 'Network error - Unable to connect to Etherscan API';
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});


// Get wallet balance at a specific date
router.get('/balance/:walletAddress/:date', async (req, res) => {
    try {
        const { walletAddress, date } = req.params;

        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        const balanceInfo = await blockchainService.getBalanceAtDate(walletAddress, date);

        res.json({
            success: true,
            data: balanceInfo
        });

    } catch (error) {
        console.error('Error getting balance at date:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get balance at date'
        });
    }
});

// Get current wallet balance
router.get('/balance/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;

        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const balance = await blockchainService.getBalance(walletAddress);
        const currentBlock = await blockchainService.getCurrentBlockNumber();

        res.json({
            success: true,
            data: {
                address: walletAddress,
                balance: balance,
                blockNumber: currentBlock,
                unit: 'ETH'
            }
        });

    } catch (error) {
        console.error('Error getting current balance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get current balance'
        });
    }
});


// Get transaction statistics for a wallet address and block range
router.get('/transactions/stats/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { startBlock, endBlock } = req.query;

        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const etherscanApiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
        
        if (etherscanApiKey === 'YourApiKeyToken') {
            return res.status(500).json({
                success: false,
                error: 'Etherscan API key not configured'
            });
        }

        const startBlockNum = parseInt(startBlock);
        const endBlockNum = endBlock ? parseInt(endBlock) : await blockchainService.getCurrentBlockNumber();
        
        // Get all transactions for stats calculation (up to 10k limit)
        const endBlockParam = endBlock ? `&endblock=${endBlockNum}` : '';
        const etherscanUrl = `https://api.etherscan.io/v2/api?module=account&action=txlist&address=${walletAddress}&startblock=${startBlockNum}${endBlockParam}&sort=desc&chainid=1&apikey=${etherscanApiKey}`;
        
        const response = await fetch(etherscanUrl);
        const data = await response.json();
        
        if (data.status === '0') {
            if (data.message === 'No transactions found') {
                return res.json({
                    success: true,
                    data: {
                        total_transactions: 0,
                        incoming_count: 0,
                        outgoing_count: 0,
                        total_volume: 0,
                        is_limit_reached: false
                    }
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: `Etherscan API error: ${data.message}`
                });
            }
        }

        const transactions = data.result;
        const isLimitReached = transactions.length === 10000;
        
        // Calculate stats
        const incomingCount = transactions.filter(tx => tx.to?.toLowerCase() === walletAddress.toLowerCase()).length;
        const outgoingCount = transactions.filter(tx => tx.from?.toLowerCase() === walletAddress.toLowerCase()).length;

        res.json({
            success: true,
            data: {
                total_transactions: transactions.length,
                incoming_count: incomingCount,
                outgoing_count: outgoingCount,
                is_limit_reached: isLimitReached,
                limit_warning: isLimitReached ? {
                    message: "Results limited to 10,000 transactions due to API constraints",
                    note: "There may be more transactions available. Try reducing the block range for complete results."
                } : null
            }
        });

    } catch (error) {
        console.error('Error getting transaction stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get transaction statistics'
        });
    }
});

// Get total transaction count for a wallet address and block range
router.get('/transactions/count/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { startBlock, endBlock } = req.query;

        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const etherscanApiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
        
        if (etherscanApiKey === 'YourApiKeyToken') {
            return res.status(500).json({
                success: false,
                error: 'Etherscan API key not configured'
            });
        }

        const startBlockNum = parseInt(startBlock);
        const endBlockNum = endBlock ? parseInt(endBlock) : await blockchainService.getCurrentBlockNumber();
        
        // Get total count
        const endBlockParam = endBlock ? `&endblock=${endBlockNum}` : '';
        const etherscanUrl = `https://api.etherscan.io/v2/api?module=account&action=txlist&address=${walletAddress}&startblock=${startBlockNum}${endBlockParam}&sort=desc&chainid=1&apikey=${etherscanApiKey}`;
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const response = await fetch(etherscanUrl);
        const data = await response.json();
        
        if (data.status === '0') {
            if (data.message === 'No transactions found') {
                return res.json({
                    success: true,
                    data: {
                        total_count: 0,
                        is_limit_reached: false
                    }
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: `Etherscan API error: ${data.message}`
                });
            }
        }

        const totalCount = data.result.length;
        const isLimitReached = totalCount === 10000;

        res.json({
            success: true,
            data: {
                total_count: totalCount,
                is_limit_reached: isLimitReached
            }
        });

    } catch (error) {
        console.error('Error getting transaction count:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get transaction count'
        });
    }
});

// Get token metadata for a specific contract
router.get('/token-meta/:contractAddress', async (req, res) => {
    try {
        const { contractAddress } = req.params;
        
        if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid contract address format'
            });
        }

        const meta = await blockchainService.getTokenMeta(contractAddress);
        
        res.json({
            success: true,
            data: meta
        });

    } catch (error) {
        console.error('Error getting token metadata:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get token metadata'
        });
    }
});

export default router;
