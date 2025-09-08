/**
 * 构建命名空间配置
 * @param chainId eip155格式 eip155:1 | eip155:56 | tron:mainnet
 * @returns {{tron: {methods: string[], chains: *[], events: string[]}}|{eip155: {methods: string[], chains: *[], events: string[]}}}
 */
export function buildNamespaces(chainId) {
  if (chainId.startsWith('eip155:')) {
    // EVM链
    return {
      eip155: {
        methods: [
          'eth_sendTransaction',
          'eth_signTransaction',
          'eth_sign',
          'personal_sign',
          'eth_signTypedData',
          'eth_signTypedData_v4',
          'wallet_switchEthereumChain',
          'wallet_addEthereumChain',
        ],
        chains: [chainId],
        events: ['accountsChanged', 'chainChanged'],
      },
    }
  } else if (chainId.startsWith('tron:')) {
    // TRON链
    return {
      tron: {
        methods: ['tron_signTransaction', 'tron_signMessage'],
        chains: [chainId],
        events: ['accountsChanged', 'chainChanged'],
      },
    }
  }

  throw new Error(`Invalid chain id: ${chainId}`)
}

/**
 * 将插件钱包的十六进制链ID转换为eip155格式
 * @param {string} chainId - 0x1 格式的链ID
 * @returns {string} - eip155:1 格式的链ID
 */
export function convertToSdkChainId(chainId) {
  if (chainId.startsWith('0x')) {
    const numericChainId = parseInt(chainId, 16)
    return `eip155:${numericChainId}`
  }
  return chainId
}

/**
 * 将eip155格式的链ID转换为插件钱包使用的十六进制格式
 * @param {string} chainId - eip155:1 格式的链ID
 * @returns {string} - 0x1 格式的链ID
 */
export function convertToPluginChainId(chainId) {
  if (chainId.startsWith('eip155:')) {
    const numericChainId = chainId.replace('eip155:', '')
    return '0x' + parseInt(numericChainId, 10).toString(16)
  }
  return chainId
}

/**
 * 获取链名称
 * @param {string} chainId - 链ID
 * @returns {string} 链名称
 */
export function getChainName(chainId) {
  const chainNames = {
    1: 'Ethereum',
    56: 'BSC',
    137: 'Polygon',
    43114: 'Avalanche',
    250: 'Fantom',
    42161: 'Arbitrum',
    10: 'Optimism',
  }
  return chainNames[chainId] || `Chain ${chainId}`
}

/**
 * 编码ERC20 allowance查询调用
 */
export function encodeAllowanceCall(owner, spender) {
  const methodId = '0xdd62ed3e'
  // 填充owner地址到32字节
  const paddedOwner = owner.replace('0x', '').padStart(64, '0')
  // 填充spender地址到32字节
  const paddedSpender = spender.replace('0x', '').padStart(64, '0')
  return methodId + paddedOwner + paddedSpender
}
