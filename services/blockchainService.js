import { ethers } from 'ethers';
import config from '../config.js';

class BlockchainService {
    constructor() {
        this.provider = null;
        this.tokenMetaCache = new Map();
        this.initProvider();
    }

    initProvider() {
        try {
            if (config.ethereum.infuraProjectId) {
                this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
                console.log('Connected to Ethereum via Infura');
            } else {
                throw new Error('Infura Project ID not configured');
            }
        } catch (error) {
            console.error('Failed to initialize Ethereum provider:', error.message);
            throw error;
        }
    }

    // Minimal ERC-20 ABI for metadata
    static ERC20_METADATA_ABI = [
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)'
    ];

    sanitizeTokenText(text) {
        if (!text) return null;
        // Keep printable ASCII only, trim nulls and whitespace
        const cleaned = String(text)
            .replace(/\u0000+/g, '')
            .replace(/[^\x20-\x7E]/g, '')
            .trim();
        return cleaned || null;
    }

    async fetchJsonWithTimeout(url, timeoutMs = 8000) {
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const resp = await fetch(url, { signal: controller.signal });
            if (!resp.ok) return null;
            return await resp.json();
        } catch {
            return null;
        } finally {
            clearTimeout(timerId);
        }
    }

    async getEtherscanSourceInfo(address, apiKey) {
        if (!apiKey || apiKey === 'YourApiKeyToken') return null;
        const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
        const data = await this.fetchJsonWithTimeout(url, 8000);
        if (!data || data.status !== '1' || !Array.isArray(data.result) || data.result.length === 0) return null;
        return data.result[0];
    }

    async getTokenMeta(contractAddress) {
        try {
            const checksumAddress = ethers.getAddress(contractAddress);
            if (this.tokenMetaCache.has(checksumAddress)) {
                return this.tokenMetaCache.get(checksumAddress);
            }

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

            const contract = new ethers.Contract(
                checksumAddress,
                BlockchainService.ERC20_METADATA_ABI,
                this.provider
            );

            // Handle potential contract call failures gracefully
            const [decimals, symbol, name] = await Promise.all([
                contract.decimals().catch(() => 18),
                contract.symbol().catch(async () => {
                    // Try bytes32 symbol fallback via low-level call decode
                    try {
                        const sig = '0x95d89b41'; // symbol()
                        const raw = await this.provider.call({ to: checksumAddress, data: sig });
                        // Decode as bytes32 then to string if possible
                        try {
                            const abi = ethers.AbiCoder.defaultAbiCoder();
                            const [bytes32Val] = abi.decode(['bytes32'], raw);
                            const text = ethers.decodeBytes32String(bytes32Val);
                            return text || 'Unknown';
                        } catch {
                            const bytes = ethers.getBytes(raw).slice(0, 32);
                            const text = new TextDecoder().decode(new Uint8Array(bytes)).replace(/\u0000+$/g, '');
                            return text || 'Unknown';
                        }
                    } catch {
                        return 'Unknown';
                    }
                }),
                contract.name().catch(() => null)
            ]);

            let cleanedSymbol = this.sanitizeTokenText(symbol) || null;
            let cleanedName = name ? this.sanitizeTokenText(name) : null;

            // If on-chain lookup failed, try Etherscan tokeninfo as fallback
            if (!cleanedSymbol || /^Unknown/.test(cleanedSymbol)) {
                const apiKey = process.env.ETHERSCAN_API_KEY;
                if (apiKey && apiKey !== 'YourApiKeyToken') {
                    try {
                        const url = `https://api.etherscan.io/api?module=token&action=tokeninfo&contractaddress=${checksumAddress}&apikey=${apiKey}`;
                        const data = await this.fetchJsonWithTimeout(url, 8000);
                        if (data && data.status === '1' && Array.isArray(data.result) && data.result.length > 0) {
                            const info = data.result[0];
                            cleanedSymbol = this.sanitizeTokenText(info.symbol) || cleanedSymbol;
                            cleanedName = this.sanitizeTokenText(info.tokenName) || cleanedName;
                        }
                    } catch (e) {
                        // Ignore fallback errors silently
                    }
                }
            }

            // Last-resort fallback: inspect Etherscan sourcecode and proxy implementation
            if (!cleanedSymbol || /^Unknown/.test(cleanedSymbol)) {
                const apiKey = process.env.ETHERSCAN_API_KEY;
                try {
                    const src = await this.getEtherscanSourceInfo(checksumAddress, apiKey);
                    if (src) {
                        // Use symbol/name fields from source metadata if available
                        cleanedSymbol = this.sanitizeTokenText(src.Symbol) || cleanedSymbol;
                        cleanedName = this.sanitizeTokenText(src.TokenName) || this.sanitizeTokenText(src.ContractName) || cleanedName;

                        // If contract is a proxy, fetch implementation metadata
                        if ((!cleanedSymbol || /^Unknown/.test(cleanedSymbol)) && src.Proxy === '1' && src.Implementation && /^0x[a-fA-F0-9]{40}$/.test(src.Implementation)) {
                            const implAddr = ethers.getAddress(src.Implementation);
                            // Try tokeninfo for implementation
                            const implInfo = await this.fetchJsonWithTimeout(`https://api.etherscan.io/api?module=token&action=tokeninfo&contractaddress=${implAddr}&apikey=${apiKey}`, 8000);
                            if (implInfo && implInfo.status === '1' && Array.isArray(implInfo.result) && implInfo.result.length > 0) {
                                const info = implInfo.result[0];
                                cleanedSymbol = this.sanitizeTokenText(info.symbol) || cleanedSymbol;
                                cleanedName = this.sanitizeTokenText(info.tokenName) || cleanedName;
                            } else {
                                // Further fallback: read source of implementation
                                const implSrc = await this.getEtherscanSourceInfo(implAddr, apiKey);
                                if (implSrc) {
                                    cleanedSymbol = this.sanitizeTokenText(implSrc.Symbol) || cleanedSymbol;
                                    cleanedName = this.sanitizeTokenText(implSrc.TokenName) || this.sanitizeTokenText(implSrc.ContractName) || cleanedName;
                                }
                            }
                        }
                    }
                } catch {
                    // Ignore errors silently
                }
            }

            if (!cleanedSymbol) {
                cleanedSymbol = `Unknown (${checksumAddress.slice(0, 6)}...${checksumAddress.slice(-4)})`;
            }

            const meta = { decimals: Number(decimals), symbol: cleanedSymbol, name: cleanedName };
            this.tokenMetaCache.set(checksumAddress, meta);
            return meta;
        } catch (error) {
            // Fallback if contract call fails
            console.warn(`Failed to fetch token meta for ${contractAddress}:`, error.message);
            const fallback = { decimals: 18, symbol: `Unknown (${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)})`, name: null };
            return fallback;
        }
    }

    // Decode ERC-20 Transfer events from receipt logs
    async decodeErc20TransfersFromReceipt(txHash) {
        const iface = new ethers.Interface([
            'event Transfer(address indexed from, address indexed to, uint256 value)'
        ]);
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt) return [];
        const transfers = [];
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog({ topics: log.topics, data: log.data });
                if (parsed && parsed.name === 'Transfer') {
                    const tokenContract = log.address;
                    const meta = await this.getTokenMeta(tokenContract);
                    const amount = parsed.args[2];
                    const divisor = Math.pow(10, Number(meta.decimals || 18));
                    const tokenAmount = (Number(amount) / divisor).toFixed(6);
                    transfers.push({
                        token_contract: tokenContract,
                        token_symbol: meta.symbol,
                        token_decimals: meta.decimals,
                        token_amount: tokenAmount,
                        from: parsed.args[0],
                        to: parsed.args[1]
                    });
                }
            } catch {
                // Not an ERC-20 Transfer log, skip
            }
        }
        return transfers;
    }

    async getCurrentBlockNumber() {
        try {
            const blockNumber = await this.provider.getBlockNumber();
            return blockNumber;
        } catch (error) {
            console.error('Error getting current block number:', error);
            throw error;
        }
    }

    async getBlock(blockNumber) {
        try {
            const block = await this.provider.getBlock(blockNumber, true);
            return block;
        } catch (error) {
            console.error(`Error getting block ${blockNumber}:`, error);
            throw error;
        }
    }


    async getBalance(address, blockNumber = null) {
        try {
            const checksumAddress = ethers.getAddress(address.toLowerCase());
            const balance = await this.provider.getBalance(checksumAddress, blockNumber);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error(`Error getting balance for ${address}:`, error);
            throw error;
        }
    }

    async getBalanceAtDate(address, date) {
        try {
            // Convert date to timestamp and find closest block
            const timestamp = Math.floor(new Date(date).getTime() / 1000);
            const currentBlock = await this.getCurrentBlockNumber();
            const currentBlockData = await this.getBlock(currentBlock);
            const currentTimestamp = currentBlockData.timestamp;
            
            // Check if requested date is in the future
            if (timestamp > currentTimestamp) {
                throw new Error(`Cannot get balance for future date ${date}. The latest available block is at timestamp ${currentTimestamp} (${new Date(currentTimestamp * 1000).toISOString()})`);
            }
            
            // Binary search to find block closest to timestamp
            let left = 0;
            let right = currentBlock;
            let closestBlock = 0;

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                const block = await this.getBlock(mid);
                
                if (block.timestamp <= timestamp) {
                    closestBlock = mid;
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }

            const balance = await this.getBalance(address, closestBlock);
            return {
                balance: balance,
                blockNumber: closestBlock,
                timestamp: timestamp,
                date: date
            };
        } catch (error) {
            console.error(`Error getting balance at date for ${address}:`, error);
            throw error;
        }
    }

}

export default new BlockchainService();
