import { OKXTronProvider } from '@okxconnect/universal-provider'

/**
 * Tron 链相关操作
 */
export class TronService {
  constructor(provider, message) {
    this.provider = provider
    this.chainId = 'tron:mainnet'
    this.tronWeb = null
    this.okxTronProvider = null
    this.message = message
    
    if (provider) {
      this.okxTronProvider = new OKXTronProvider(this.provider)
      this.initializeTronWeb()
    }
  }

  /**
   * 初始化TronWeb实例
   */
  async initializeTronWeb() {
    try {
      this.tronWeb = await this.createTronWeb()
      console.log('TronService: TronWeb实例初始化成功')
    } catch (error) {
      console.error('TronService: TronWeb实例初始化失败:', error)
    }
  }

  /**
   * 更新provider
   * @param {Object} provider 新的provider实例
   */
  updateProvider(provider) {
    this.provider = provider
    if (provider) {
      this.okxTronProvider = new OKXTronProvider(this.provider)
      this.initializeTronWeb()
    } else {
      this.okxTronProvider = null
      this.tronWeb = null
    }
  }

  /**
   * 从 CDN 加载 TronWeb
   * @returns {Promise<unknown>}
   * @private
   */
  _loadTronWebFromCDN() {
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      if (window.TronWeb) {
        console.log('TronWeb 已存在于 window 对象中')
        resolve(window.TronWeb)
        return
      }

      console.log('开始从 CDN 加载 TronWeb...')

      // 创建 script 标签加载 TronWeb
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/tronweb@latest/dist/TronWeb.js'
      script.onload = () => {
        console.log('TronWeb CDN 脚本加载完成')
        // 等待一小段时间确保 TronWeb 完全初始化
        setTimeout(() => {
          if (window.TronWeb) {
            console.log('TronWeb 成功加载到 window 对象')
            resolve(window.TronWeb)
          } else {
            console.error('TronWeb 脚本加载完成但 window.TronWeb 不存在')
            reject(new Error('TronWeb 加载失败：window.TronWeb 不存在'))
          }
        }, 100)
      }
      script.onerror = error => {
        console.error('TronWeb CDN 加载失败:', error)
        reject(new Error('无法从 CDN 加载 TronWeb，请检查网络连接'))
      }
      document.head.appendChild(script)
    })
  }

  /**
   * 创建TronWeb实例
   */
  async createTronWeb() {
    // 确保只在客户端执行
    console.log('createTronWeb 函数被调用')

    try {
      console.log('开始加载 TronWeb...')
      const TronWeb = await this._loadTronWebFromCDN()
      console.log('TronWeb 类加载成功，开始创建实例')
      console.log('TronWeb 对象结构:', TronWeb)
      console.log('TronWeb 类型:', typeof TronWeb)
      console.log('TronWeb 是否为函数:', typeof TronWeb === 'function')

      // 检查 TronWeb 的正确构造方式
      let TronWebConstructor = TronWeb
      if (TronWeb.TronWeb && typeof TronWeb.TronWeb === 'function') {
        console.log('使用 TronWeb.TronWeb 作为构造函数')
        TronWebConstructor = TronWeb.TronWeb
      } else if (TronWeb.default && typeof TronWeb.default === 'function') {
        console.log('使用 TronWeb.default 作为构造函数')
        TronWebConstructor = TronWeb.default
      }

      const tronWeb = new TronWebConstructor({
        fullHost: 'https://api.trongrid.io',
      })

      console.log('TronWeb 实例创建成功>>>>>>>:', tronWeb)
      return tronWeb
    } catch (error) {
      console.error('createTronWeb 失败:', error)
      throw new Error(`TronWeb 加载失败: ${error.message}`)
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.provider = null
    this.tronWeb = null
    this.okxTronProvider = null
  }

  /**
   * 检查TRON代币授权状态
   * @param {string} spenderAddress 授权地址
   * @param {string} tokenAddress 代币合约地址
   * @param {string} walletAddress 钱包地址
   * @returns {Promise<{isApproved: boolean, allowanceAmount: string}>}
   */
  async checkTronApproval(spenderAddress, tokenAddress, walletAddress) {
    try {
      if (!tokenAddress) {
        return { isApproved: true, allowanceAmount: 'unlimited' }
      }

      // 查询授权额度
      const result = await this.getTronAllowance(tokenAddress, spenderAddress, walletAddress)

      if (result.success) {
        const allowanceAmount = result.allowance || '0'
        const allowanceNum = parseFloat(allowanceAmount)
        const isApproved = allowanceNum > 0

        console.log('TRON授权状态检查完成:', {
          allowanceAmount,
          isApproved,
          allowanceNum,
        })

        return { isApproved, allowanceAmount }
      } else {
        throw new Error(result.error || 'TRON授权查询失败')
      }
    } catch (error) {
      console.error('checkTronApproval error:', error)
      throw error
    }
  }

  /**
   * 使用 TronWeb 查询 TRON 代币授权额度
   * @param {string} tokenAddress 代币合约地址
   * @param {string} spenderAddress 授权地址
   * @param {string} walletAddress 钱包地址
   * @returns {Promise<{success: boolean, allowance?: string, error?: string}>}
   */
  async getTronAllowance(tokenAddress, spenderAddress, walletAddress) {
    try {
      if (!this.provider) {
        throw new Error('The wallet is not connected, please connect the wallet first')
      }

      if (!tokenAddress || !spenderAddress || !walletAddress) {
        throw new Error('Missing necessary contract address parameters')
      }

      // 获取TronWeb实例
      const tronWeb = await this.createTronWeb()

      // 验证地址格式
      if (!tronWeb.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address format')
      }
      if (!tronWeb.isAddress(spenderAddress)) {
        throw new Error('Invalid authorization address format')
      }
      if (!tronWeb.isAddress(tokenAddress)) {
        throw new Error('Invalid contract address format')
      }

      console.log('tron地址格式验证通过')

      // 使用 TronWeb 的 triggerConstantContract 方法
      const functionSelector = 'allowance(address,address)'
      const parameter = [
        { type: 'address', value: walletAddress },
        { type: 'address', value: spenderAddress },
      ]

      const result = await tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress,
        functionSelector,
        { feeLimit: 100000000 },
        parameter,
        walletAddress,
      )

      if (!result || !result.constant_result || result.constant_result.length === 0) {
        throw new Error('Query result is empty')
      }

      // 解析返回的十六进制结果
      const hexResult = result.constant_result[0]
      const allowance = tronWeb.BigNumber('0x' + hexResult)

      // 转换为可读格式 (根据代币精度，USDT 有 6 位小数)
      const decimals = 6 // 默认使用6位小数
      let allowanceFormatted
      if (typeof allowance === 'object' && allowance.toString) {
        // 处理 BigNumber 类型
        allowanceFormatted = allowance.toString() / Math.pow(10, decimals)
      } else {
        allowanceFormatted = allowance / Math.pow(10, decimals)
      }

      console.log('格式化授权额度:', allowanceFormatted)

      return {
        success: true,
        allowance: allowanceFormatted.toString(),
      }
    } catch (error) {
      // 提供更友好的错误信息
      let errorMessage = 'Failed to query the authorization limit'
      if (error.message.includes('User rejected')) {
        errorMessage = 'The user canceled the operation'
      } else if (error.message.includes('network')) {
        errorMessage = 'Network connection is wrong, please check the network'
      } else if (error.message.includes('contract')) {
        errorMessage = 'The contract call failed, please check the contract address'
      } else if (error.message.includes('Invalid address')) {
        errorMessage = 'Invalid contract address format'
      } else if (error.message.includes('owner_address')) {
        errorMessage = 'TRON Address parameter error'
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * 授权TRON代币
   * @param {string} tokenAddress 代币合约地址
   * @param {string} spenderAddress 授权地址
   * @param {string} amount 授权金额
   * @param {string} walletAddress 钱包地址
   * @returns {Promise<{success: boolean, txHash?: string, error?: string, skipped?: boolean}>}
   */
  async approveTronToken(tokenAddress, spenderAddress, amount, walletAddress) {
    try {
      if (!tokenAddress || !spenderAddress || !amount || !walletAddress) {
        throw new Error('Missing necessary authorization parameters')
      }

      console.log({
        key: '开始 TRON 代币授权',
        tokenAddress,
        spenderAddress,
        amount,
        from: walletAddress,
      })

      // 获取TronWeb实例
      const tronWeb = await this.createTronWeb()

      // 验证地址格式
      if (!tronWeb.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address format')
      }
      if (!tronWeb.isAddress(spenderAddress)) {
        throw new Error('Invalid authorization address format')
      }
      if (!tronWeb.isAddress(tokenAddress)) {
        throw new Error('Invalid contract address format')
      }

      // 智能授权额度验证和策略
      const validatedAmount = await this.validateAndOptimizeApprovalAmount(amount, tokenAddress, spenderAddress, walletAddress)

      // 如果当前授权额度已足够，直接返回成功
      if (validatedAmount.skipApproval) {
        return {
          success: true,
          txHash: null,
          message: validatedAmount.reason,
          skipped: true,
        }
      }

      // 使用 triggerSmartContract 方法构建授权交易
      const functionSelector = 'approve(address,uint256)'
      const parameter = [
        { type: 'address', value: spenderAddress },
        { type: 'uint256', value: validatedAmount.amount },
      ]

      // 构建交易
      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        tokenAddress,
        functionSelector,
        { feeLimit: 100000000 },
        parameter,
        walletAddress,
      )

      if (!transaction || !transaction.transaction) {
        throw new Error('Failed to build authorization transaction')
      }

      // 签名并广播交易
      console.log('开始签名交易...')
      const broadcastResult = await this.okxTronProvider.signAndSendTransaction(transaction.transaction, 'tron:mainnet')

      if (!broadcastResult || !broadcastResult.result) {
        throw new Error(broadcastResult?.message || 'Transaction broadcast failed')
      }

      const txHash = broadcastResult.txid

      return {
        success: true,
        txHash: txHash,
      }
    } catch (error) {
      console.error('TRON 代币授权失败:', error)

      // 提供更友好的错误信息
      let errorMessage = 'Token authorization failed'
      if (error.message.includes('User rejected') || error.message.includes('User denied')) {
        errorMessage = 'The user canceled the authorization operation'
      } else if (error.message.includes('insufficient')) {
        errorMessage = 'TRX balance is insufficient and cannot pay the handling fee'
      } else if (error.message.includes('network')) {
        errorMessage = 'Network connection is wrong, please check the network'
      } else if (error.message.includes('contract')) {
        errorMessage = 'The contract call failed, please check the contract address'
      } else if (error.message.includes('Invalid address')) {
        errorMessage = 'Invalid address format'
      } else if (error.message.includes('amount')) {
        errorMessage = 'Invalid authorization amount'
      } else if (error.message.includes('broadcast')) {
        errorMessage = 'Transaction broadcast failed, please try again'
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * 智能授权额度验证和优化策略
   * @param {string} requestedAmount 请求的授权金额
   * @param {string} tokenAddress 代币合约地址
   * @param {string} spenderAddress 授权地址
   * @param {string} walletAddress 钱包地址
   * @returns {Promise<{amount: string, strategy: string, reason: string, skipApproval?: boolean}>}
   */
  async validateAndOptimizeApprovalAmount(requestedAmount, tokenAddress, spenderAddress, walletAddress) {
    try {
      // 基础验证
      if (!requestedAmount || requestedAmount === '0') {
        throw new Error('Invalid authorization amount')
      }

      // 获取当前授权额度
      const currentAllowanceResult = await this.getTronAllowance(tokenAddress, spenderAddress, walletAddress)
      const currentAllowance = currentAllowanceResult.success ? parseFloat(currentAllowanceResult.allowance) : 0

      // 转换请求金额为数值
      const requestedAmountNum = parseFloat(requestedAmount)

      // 智能授权策略选择
      let strategy = 'exact' // 默认策略：精确授权
      let optimizedAmount = requestedAmount
      let reason = 'Use the exact authorization amount'

      // 策略1: 如果当前授权额度已足够，无需重新授权
      if (currentAllowance >= requestedAmountNum) {
        return {
          amount: '0', // 不需要授权
          strategy: 'sufficient',
          reason: `The current authorization limit ${currentAllowance} is sufficient, no reauthorization is required`,
          skipApproval: true,
        }
      }

      // 策略2: 小额授权 - 对于小额交易使用精确授权
      const decimals = 6 // 默认使用6位小数
      const smallAmountThreshold = 100 // 小于100个代币视为小额

      if (requestedAmountNum < smallAmountThreshold) {
        strategy = 'exact'
        optimizedAmount = requestedAmount
        reason = 'Small transactions, using precise authorization for increased security'
      }
      // 策略3: 中等金额 - 授权2倍金额以减少频繁授权
      else if (requestedAmountNum < 10000) {
        strategy = 'double'
        const doubleAmount = requestedAmountNum * 2
        optimizedAmount = (doubleAmount * Math.pow(10, decimals)).toString()
        reason = 'Medium amount, authorization 2 times the amount to reduce frequent authorization'
      }
      // 策略4: 大额授权 - 使用最大授权额度
      else {
        strategy = 'unlimited'
        optimizedAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
        reason = 'Large transactions, unlimited authorization for the best user experience'
      }

      // 安全检查：确保授权金额不超过合理范围
      const maxReasonableAmount = Math.pow(10, decimals + 12) // 10^12 个代币
      if (parseFloat(optimizedAmount) > maxReasonableAmount && strategy !== 'unlimited') {
        optimizedAmount = maxReasonableAmount.toString()
        reason += ' (limited to reasonable range)'
      }

      console.log('智能授权策略:', {
        requestedAmount,
        currentAllowance,
        strategy,
        optimizedAmount,
        reason,
      })

      return {
        amount: optimizedAmount,
        strategy,
        reason,
        skipApproval: false,
      }
    } catch (error) {
      console.error('validateAndOptimizeApprovalAmount error:', error)
      // 如果策略计算失败，回退到精确授权
      return {
        amount: requestedAmount,
        strategy: 'exact',
        reason: 'Fallback to exact authorization due to strategy calculation error',
        skipApproval: false,
      }
    }
  }

  /**
   * 获取TRON账户余额
   * @param {string} address 钱包地址
   * @returns {Promise<{success: boolean, balance?: string, error?: string}>}
   */
  async getTronBalance(address) {
    try {
      if (!address) {
        throw new Error('Address is required')
      }

      const tronWeb = await this.createTronWeb()
      
      if (!tronWeb.isAddress(address)) {
        throw new Error('Invalid address format')
      }

      const balanceSun = await tronWeb.trx.getBalance(address)
      const balanceTrx = tronWeb.fromSun(balanceSun)

      return {
        success: true,
        balance: balanceTrx.toString(),
      }
    } catch (error) {
      console.error('getTronBalance error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get balance',
      }
    }
  }

  /**
   * 验证TRON地址格式
   * @param {string} address 地址
   * @returns {Promise<boolean>}
   */
  async isValidTronAddress(address) {
    try {
      if (!address) return false
      const tronWeb = await this.createTronWeb()
      return tronWeb.isAddress(address)
    } catch (error) {
      console.error('isValidTronAddress error:', error)
      return false
    }
  }

  /**
   * 签名消息
   * @param {string} message 要签名的消息
   * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
   */
  async signMessage(message) {
    try {
      if (!message) {
        throw new Error('Message is required')
      }

      if (!this.okxTronProvider) {
        throw new Error('Provider not initialized')
      }

      const signature = await this.okxTronProvider.signMessage(message, 'tron:mainnet')

      return {
        success: true,
        signature: signature,
      }
    } catch (error) {
      console.error('signMessage error:', error)
      return {
        success: false,
        error: error.message || 'Failed to sign message',
      }
    }
  }

  /**
   * 发送TRX交易
   * @param {string} toAddress 接收地址
   * @param {string} amount 发送金额(TRX)
   * @param {string} fromAddress 发送地址
   * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
   */
  async sendTrx(toAddress, amount, fromAddress) {
    try {
      if (!toAddress || !amount || !fromAddress) {
        throw new Error('Missing required parameters')
      }

      const tronWeb = await this.createTronWeb()
      
      // 验证地址格式
      if (!tronWeb.isAddress(fromAddress)) {
        throw new Error('Invalid from address format')
      }
      if (!tronWeb.isAddress(toAddress)) {
        throw new Error('Invalid to address format')
      }

      // 转换金额为Sun单位
      const amountSun = tronWeb.toSun(parseFloat(amount))

      // 构建交易
      const transaction = await tronWeb.transactionBuilder.sendTrx(
        toAddress,
        amountSun,
        fromAddress
      )

      if (!transaction) {
        throw new Error('Failed to build transaction')
      }

      // 签名并发送交易
      const result = await this.okxTronProvider.signAndSendTransaction(transaction, 'tron:mainnet')

      if (!result || !result.result) {
        throw new Error(result?.message || 'Transaction failed')
      }

      return {
        success: true,
        txHash: result.txid,
      }
    } catch (error) {
      console.error('sendTrx error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send TRX',
      }
    }
  }

  /**
   * 获取交易信息
   * @param {string} txHash 交易哈希
   * @returns {Promise<{success: boolean, transaction?: Object, error?: string}>}
   */
  async getTransactionInfo(txHash) {
    try {
      if (!txHash) {
        throw new Error('Transaction hash is required')
      }

      const tronWeb = await this.createTronWeb()
      
      const txInfo = await tronWeb.trx.getTransactionInfo(txHash)
      const transaction = await tronWeb.trx.getTransaction(txHash)

      return {
        success: true,
        transaction: {
          info: txInfo,
          details: transaction,
        },
      }
    } catch (error) {
      console.error('getTransactionInfo error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get transaction info',
      }
    }
  }

  buildNamespaces() {
    return {
      tron: {
        methods: ['tron_signTransaction', 'tron_signMessage'],
        chains: [this.chainId],
        events: ['accountsChanged', 'chainChanged'],
      },
    }
  }
}
