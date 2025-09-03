// 链类型枚举
export const ChainType = {
  ETH: "ethereum",
  BSC: "bsc",
  TRON: "tron",
};

// 三条链的基础配置
export const ChainConfig = {
  [ChainType.ETH]: {
    name: "Ethereum Mainnet",
    chainId: 1, // 以太坊主网链ID（测试网用5）
    rpcUrl: "https://eth.blockrazor.xyz", // 替换为你的Infura密钥
    usdtContract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // 以太坊USDT合约地址
    explorerUrl: "https://etherscan.io/",
    walletConnectChainId: "eip155:1", // WalletConnect标识
  },
  [ChainType.BSC]: {
    name: "Binance Smart Chain Mainnet",
    chainId: 56, // BSC主网链ID（测试网用97）
    rpcUrl: "https://bsc-dataseed.binance.org/",
    usdtContract: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT合约地址
    explorerUrl: "https://bscscan.com/",
    walletConnectChainId: "eip155:56",
  },
  [ChainType.TRON]: {
    name: "Tron Mainnet",
    chainId: 61, // 波场链ID格式特殊
    rpcUrl: "https://api.trongrid.io/",
    usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // 波场USDT合约地址（TRC20）
    explorerUrl: "https://tronscan.org/",
    walletConnectChainId: "tron:0",
  },
};

// 默认链配置
export const DEFAULT_CHAIN = ChainType.TRON;

// 手机钱包唤起URL Scheme（主流钱包）
export const MobileWalletSchemes = {
  metamask: "metamask://",
  trust: "trust://",
  imtoken: "imtoken://",
  tronlink: "tronlink://",
};
