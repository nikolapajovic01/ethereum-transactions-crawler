import dotenv from 'dotenv';

dotenv.config();

const config = {
    // Ethereum configuration
    ethereum: {
        network: process.env.ETHEREUM_NETWORK || 'mainnet',
        rpcUrl: process.env.ETHEREUM_RPC_URL || `https://${process.env.ETHEREUM_NETWORK || 'mainnet'}.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        infuraProjectId: process.env.INFURA_PROJECT_ID
    },
    
    // Server configuration
    server: {
        port: process.env.PORT || 3000
    }
};

export default config;
