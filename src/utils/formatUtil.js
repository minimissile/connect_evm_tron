import BigNumber from 'bignumber.js'

// USDT小数位（ERC20/BEP20/TRC20均为6位）
export const USDT_DECIMALS = 6
export const BSC_USDT_DECIMALS = 18

/**
 * 最小单位→USDT（格式化）
 * @param {string} value - 最小单位数值（wei/sun）
 * @returns {string} 保留6位小数的USDT
 */
export const fromWeiToUsdt = (value,decimals) => {
  if (!value || value === '0') return '0'
  const bn = new BigNumber(value)
  return bn.dividedBy(new BigNumber(10).pow(decimals)).toFixed(6)
}

/**
 * USDT→最小单位（合约调用用）
 * @param {string} value - USDT数值
 * @returns {string} 最小单位数值
 */
export const fromUsdtToWei = (value,decimals) => {
  if (!value || isNaN(Number(value)) || Number(value) <= 0) return '0'
  const bn = new BigNumber(value)
  return bn.multipliedBy(new BigNumber(10).pow(decimals)).toString()
}

/**
 * 格式化钱包地址（中间省略）
 * @param {string} address - 完整地址
 * @returns {string} 格式化地址（如0x1234...5678）
 */
export const formatAddress = (address, len = 4) => {
  if (!address) return ''
  if (address.startsWith('0x')) {
    // ETH/BSC地址（0x开头）
    return `${address.slice(0, len + 2)}...${address.slice(-len)}`
  } else if (address.startsWith('T')) {
    // TRON地址（T开头）
    return `${address.slice(0, len + 1)}...${address.slice(-len)}`
  }
  return address
}