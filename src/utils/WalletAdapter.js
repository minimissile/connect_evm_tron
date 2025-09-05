/**
 * 通用钱包适配器基类
 * 定义钱包连接、授权、交易等标准接口
 */
export class WalletAdapter {
    constructor(options = {}) {
        this.name = options.name || 'Unknown Wallet';
        this.isConnected = false;
        this.account = null;
        this.chainId = null;
        this.supportedChains = options.supportedChains || [];
        this.eventListeners = new Map();
    }

    /**
     * 连接钱包
     * @returns {Promise<{success: boolean, account?: string, error?: string}>}
     */
    async connect() {
        throw new Error('connect method must be implemented');
    }

    /**
     * 断开钱包连接
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async disconnect() {
        throw new Error('disconnect method must be implemented');
    }

    /**
     * 切换网络
     * @param {string} chainId - 链ID
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async switchChain(chainId) {
        throw new Error('switchChain method must be implemented');
    }

    /**
     * 获取账户余额
     * @param {string} tokenAddress - 代币合约地址，null表示原生代币
     * @returns {Promise<{success: boolean, balance?: string, error?: string}>}
     */
    async getBalance(tokenAddress = null) {
        throw new Error('getBalance method must be implemented');
    }

    /**
     * 授权代币
     * @param {string} tokenAddress - 代币合约地址
     * @param {string} spenderAddress - 授权给的地址
     * @param {string} amount - 授权数量
     * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
     */
    async approveToken(tokenAddress, spenderAddress, amount) {
        throw new Error('approveToken method must be implemented');
    }

    /**
     * 检查代币授权额度
     * @param {string} tokenAddress - 代币合约地址
     * @param {string} spenderAddress - 被授权的地址
     * @returns {Promise<{success: boolean, allowance?: string, error?: string}>}
     */
    async getAllowance(tokenAddress, spenderAddress) {
        throw new Error('getAllowance method must be implemented');
    }

    /**
     * 发送交易
     * @param {Object} transaction - 交易参数
     * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
     */
    async sendTransaction(transaction) {
        throw new Error('sendTransaction method must be implemented');
    }

    /**
     * 签名消息
     * @param {string} message - 要签名的消息
     * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
     */
    async signMessage(message) {
        throw new Error('signMessage method must be implemented');
    }

    /**
     * 检查是否支持指定链
     * @param {string} chainId - 链ID
     * @returns {boolean}
     */
    isChainSupported(chainId) {
        return this.supportedChains.includes(chainId);
    }

    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * 获取钱包信息
     * @returns {Object}
     */
    getWalletInfo() {
        return {
            name: this.name,
            isConnected: this.isConnected,
            account: this.account,
            chainId: this.chainId,
            supportedChains: this.supportedChains,
        };
    }
}

/**
 * 链配置常量
 */
export const CHAIN_CONFIGS = {
    'eip155:1': {
        chainId: 'eip155:1',
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://rpc.flashbots.net/',
        blockExplorerUrl: 'https://etherscan.io',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
        },
        tokens: {
            USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            USDC: '0xA0b86a33E6441b8C4c7C4b0b8c4c4c4c4c4c4c4c',
        },
    },
    'eip155:56': {
        chainId: 'eip155:56',
        name: 'BNB Smart Chain',
        rpcUrl: 'https://bsc.rpc.blxrbdn.com/',
        blockExplorerUrl: 'https://bscscan.com',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
        },
        tokens: {
            USDT: '0x55d398326f99059fF775485246999027B3197955',
            USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        },
    },
    'tron:mainnet': {
        chainId: 'tron:mainnet',
        name: 'TRON Mainnet',
        rpcUrl: 'https://api.trongrid.io',
        blockExplorerUrl: 'https://tronscan.org',
        nativeCurrency: {
            name: 'TRON',
            symbol: 'TRX',
            decimals: 6,
        },
        tokens: {
            USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            USDC: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
        },
    },
};

/**
 * 代币配置
 */
export const TOKEN_CONFIGS = {
    'USDT_Ethereum Mainnet': {
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        chain: 'Ethereum Mainnet',
    },
    'USDT_BNB Smart Chain': {
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 18,
        contractAddress: '0x55d398326f99059fF775485246999027B3197955',
        chain: 'BNB Smart Chain',
    },
    'USDT_TRON Mainnet': {
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        chain: 'TRON Mainnet',
    },
    'USDC_Ethereum Mainnet': {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        contractAddress: '0xA0b86a33E6441b8C4c7C4b0b8c4c4c4c4c4c4c4c',
        chain: 'Ethereum Mainnet',
    },
    'USDC_BNB Smart Chain': {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 18,
        contractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        chain: 'BNB Smart Chain',
    },
    'USDC_TRON Mainnet': {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        contractAddress: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
        chain: 'TRON Mainnet',
    },
};
