<template>
  <div class="tron-mobile-wallet">
    <h2>Tron 移动端钱包连接</h2>
    <button @click="clearCache" class="action-btn clear-cache-btn">清除缓存</button>

    <!-- 连接状态显示 -->
    <div class="connection-status">
      <div class="status-item">
        <span class="label">连接状态:</span>
        <span class="value" :class="{ connected: isConnected, disconnected: !isConnected }">
          {{ isConnected ? '已连接' : '未连接' }}
        </span>
      </div>
      <div class="status-item" v-if="walletAddress">
        <span class="label">钱包地址:</span>
        <span class="value address">{{ formatAddress(walletAddress) }}</span>
      </div>
      <div class="status-item" v-if="balance">
        <span class="label">余额:</span>
        <span class="value">{{ balance }} TRX</span>
      </div>
    </div>

    <!-- 连接方式选择 -->
    <div v-if="!isConnected" class="connection-methods">
      <h3>选择连接方式</h3>

      <!-- WalletConnect 扫码连接 -->
      <div class="method-card">
        <div class="method-header">
          <span class="method-icon">📱</span>
          <span class="method-title">WalletConnect 扫码连接</span>
        </div>
        <p class="method-desc">支持多种钱包应用，通过扫码安全连接</p>
        <button @click="connectWalletConnect" :disabled="isConnecting" class="connect-btn walletconnect-btn">
          {{ isConnecting && connectionMethod === 'walletconnect' ? '连接中...' : '扫码连接' }}
        </button>
      </div>
    </div>

    <!-- 已连接状态的操作 -->
    <div v-if="isConnected" class="connected-actions">
      <button @click="refreshBalance" class="action-btn">刷新余额</button>
      <button @click="signMessage" class="action-btn">签名测试</button>

      <button @click="disconnect" class="action-btn disconnect-btn">断开连接</button>
    </div>

    <!-- WalletConnect URI 显示 -->
    <div v-if="wcUri && !isConnected" class="qr-section">
      <h3>扫描二维码连接</h3>
      <div class="qr-container">
        <div class="qr-placeholder">
          <p>二维码区域</p>
          <p class="uri-text">{{ wcUri }}</p>
        </div>
      </div>
      <div class="qr-actions">
        <button @click="copyUri" class="copy-btn">复制连接URI</button>
        <button @click="openInWallet" class="open-wallet-btn">在钱包中打开</button>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-section">
      <p class="error-message">{{ error }}</p>
      <button @click="clearError" class="clear-error-btn">清除错误</button>
    </div>

    <!-- 事件日志 -->
    <div class="logs-section">
      <h3>连接日志</h3>
      <div class="logs-container">
        <div v-for="(log, index) in logs" :key="index" class="log-item">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLogs" class="clear-logs-btn">清空日志</button>
    </div>
  </div>
</template>

<script>
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect'
import { WalletConnectWallet, WalletConnectChainID } from '@tronweb3/walletconnect-tron'

export default {
  name: 'TronMobileWallet',
  data() {
    return {
      // 连接状态
      isConnected: false,
      isConnecting: false,
      connectionMethod: '', // 'walletconnect'

      // 钱包信息
      walletAddress: '',
      balance: '',

      // 适配器
      currentAdapter: null,

      // WalletConnect
      wcUri: '',

      // 错误和日志
      error: '',
      logs: [],
    }
  },

  mounted() {
    this.addLog('组件已加载，准备连接Tron钱包')
    this.detectMobileEnvironment()
  },

  beforeUnmount() {
    this.cleanup()
  },

  methods: {
    // 检测移动端环境
    detectMobileEnvironment() {
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)

      this.addLog(`移动端检测: ${isMobile ? '是' : '否'}, iOS: ${isIOS}, Android: ${isAndroid}`)
    },

    // WalletConnect 连接
    async connectWalletConnect() {
      this.isConnecting = true
      this.connectionMethod = 'walletconnect'
      this.error = ''

      try {
        this.addLog('开始 WalletConnect 连接...')

        // 清理之前的适配器
        this.cleanup()

        this.currentAdapter = new WalletConnectWallet({
          network: WalletConnectChainID.Mainnet,
          options: {
            relayUrl: 'wss://relay.walletconnect.com',
            projectId: '....',
            metadata: {
              name: 'Your dapp name',
              description: 'Your dapp description',
              url: 'your dapp url',
              icons: ['your dapp icon'],
            },
          },
          web3ModalConfig: {
            themeMode: 'dark',
            themeVariables: {
              '--wcm-z-index': 1000,
            },
            /**
             * Recommended Wallets are fetched from WalletConnect explore api:
             * https://walletconnect.com/explorer?type=wallet&version=2.
             * You can copy these ids from the page.
             */
            explorerRecommendedWalletIds: [
              '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f',
              '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
              '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
              // '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
              // '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66', // TokenPocket
              // '5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1', // OKX Wallet
              // '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Bitget Wallet
              // 'ef333840daf915aafdc4a004525502d6d49d77bd9c65e0642dbaefb3c2893bef', // imToken
            ],
          },
        })

        if (this.currentAdapter && this.currentAdapter.address) {
          this.connected = true
          this.address = this.currentAdapter.address
          console.log('Connection successful! Address:', this.address)
          await this.getBalance()
        } else {
          throw new Error('连接失败：未获取到地址')
        }

        // 创建 WalletConnect 适配器
        // this.currentAdapter = new WalletConnectAdapter({
        //   network: 'Mainnet',
        //   options: {
        //     relayUrl: 'wss://relay.walletconnect.com',
        //     projectId: 'c34b3bde7397ea7ed6780e9ce1d5194d', // 请替换为您的项目ID
        //     metadata: {
        //       name: 'Tron Mobile Wallet Demo',
        //       description: 'Tron移动端钱包连接演示',
        //       url: window.location.origin,
        //       icons: [window.location.origin + '/favicon.ico'],
        //     },
        //   },
        //   web3ModalConfig: {
        //     themeMode: 'light',
        //     themeVariables: {
        //       '--w3m-z-index': '99999',
        //       '--w3m-accent-color': '#ff6b35',
        //       '--w3m-background-color': '#ffffff',
        //     },
        //     explorerRecommendedWalletIds: [
        //       // '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
        //       // '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66', // TokenPocket
        //       // '5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1', // OKX Wallet
        //       // '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Bitget Wallet
        //       // 'ef333840daf915aafdc4a004525502d6d49d77bd9c65e0642dbaefb3c2893bef', // imToken
        //     ],
        //     excludeWalletIds: [
        //       // '5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1', // 暂时排除TokenPocket避免自动跳转
        //     ],
        //     enableAuthMode: false,
        //     enableExplorer: false, // 禁用钱包浏览器，直接显示二维码
        //     enableNetworkView: true,
        //     enableAccountView: true,
        //     defaultChain: 'tron',
        //     mobileWallets: [], // 禁用移动端钱包自动检测
        //     desktopWallets: [], // 禁用桌面端钱包自动检测
        //     walletImages: {}, // 禁用钱包图片缓存
        //     enableWalletConnect: true,
        //     enableInjected: false, // 禁用注入式钱包检测
        //     enableCoinbase: false, // 禁用Coinbase特殊处理
        //     modalMode: 'qrcode', // 强制使用二维码模式
        //     // 强制每次都显示钱包选择界面
        //     enableSessionStorage: false, // 禁用会话存储
        //     enableLocalStorage: false, // 禁用本地存储
        //     enableAutoConnect: false, // 禁用自动连接
        //     enablePersistence: false, // 禁用持久化连接
        //   },
        // })

        // 设置事件监听
        // this.setupAdapterEvents()

        await this.currentAdapter?.disconnect()
        // 连接钱包
        await this.currentAdapter.connect()

        this.addLog('WalletConnect 连接请求已发送')
      } catch (error) {
        console.error('WalletConnect 连接失败:', error)
        this.error = `WalletConnect 连接失败: ${error.message}`
        this.addLog(`连接失败: ${error.message}`)
      } finally {
        this.isConnecting = false
      }
    },

    // 设置适配器事件监听
    setupAdapterEvents() {
      if (!this.currentAdapter) return

      this.currentAdapter.on('connect', address => {
        this.isConnected = true
        this.walletAddress = address
        this.addLog(`钱包连接成功: ${this.formatAddress(address)}`)
        this.refreshBalance()
      })

      this.currentAdapter.on('disconnect', () => {
        this.isConnected = false
        this.walletAddress = ''
        this.balance = ''
        this.addLog('钱包已断开连接')
      })

      this.currentAdapter.on('accountsChanged', accounts => {
        if (accounts && accounts.length > 0) {
          this.walletAddress = accounts[0]
          this.addLog(`账户已切换: ${this.formatAddress(accounts[0])}`)
          this.refreshBalance()
        }
      })

      this.currentAdapter.on('error', error => {
        this.error = error.message
        this.addLog(`适配器错误: ${error.message}`)
      })

      // WalletConnect 特有事件
      if (this.connectionMethod === 'walletconnect') {
        this.currentAdapter.on('display_uri', uri => {
          this.wcUri = uri
          this.addLog('WalletConnect URI 已生成')
          console.log('WalletConnect URI:', uri)
        })

        this.currentAdapter.on('session_request', event => {
          this.addLog('收到会话请求')
          console.log('Session request:', event)
        })
      }
    },

    // 刷新余额
    async refreshBalance() {
      if (!this.currentAdapter || !this.walletAddress) return

      try {
        // 这里需要根据实际的适配器API来获取余额
        // 示例代码，实际实现可能不同
        if (window.tronWeb && window.tronWeb.trx) {
          const balance = await window.tronWeb.trx.getBalance(this.walletAddress)
          this.balance = (balance / 1000000).toFixed(6) // TRX 有6位小数
          this.addLog(`余额已更新: ${this.balance} TRX`)
        }
      } catch (error) {
        console.error('获取余额失败:', error)
        this.addLog(`获取余额失败: ${error.message}`)
      }
    },

    // 签名测试
    async signMessage() {
      if (!this.currentAdapter || !this.isConnected) {
        this.error = '请先连接钱包'
        return
      }

      try {
        const message = 'Hello Tron Mobile Wallet!'
        this.addLog(`开始签名消息: ${message}`)

        // 这里需要根据实际的适配器API来签名
        if (window.tronWeb && window.tronWeb.trx) {
          const signature = await window.tronWeb.trx.sign(message)
          this.addLog(`签名成功: ${signature.substring(0, 20)}...`)
        }
      } catch (error) {
        console.error('签名失败:', error)
        this.error = `签名失败: ${error.message}`
        this.addLog(`签名失败: ${error.message}`)
      }
    },

    // 断开连接
    async disconnect() {
      if (!this.currentAdapter) return

      try {
        await this.currentAdapter.disconnect()
        this.addLog('钱包连接已断开')

        // 断开连接后清除缓存，确保下次连接时重新选择钱包
        this.clearWalletConnectCache()
      } catch (error) {
        console.error('断开连接失败:', error)
        this.addLog(`断开连接失败: ${error.message}`)
      }
    },

    // 复制 WalletConnect URI
    copyUri() {
      if (!this.wcUri) return

      navigator.clipboard
        .writeText(this.wcUri)
        .then(() => {
          this.addLog('WalletConnect URI 已复制到剪贴板')
        })
        .catch(() => {
          this.addLog('复制失败，请手动复制')
        })
    },

    // 在钱包中打开
    openInWallet() {
      if (!this.wcUri) return

      // 尝试不同的钱包深链接
      const walletLinks = [
        `tronlink://wc?uri=${encodeURIComponent(this.wcUri)}`,
        `tokenpocket://wc?uri=${encodeURIComponent(this.wcUri)}`,
        `imtoken://wc?uri=${encodeURIComponent(this.wcUri)}`,
      ]

      // 依次尝试打开
      walletLinks.forEach((link, index) => {
        setTimeout(() => {
          window.location.href = link
        }, index * 1000)
      })

      this.addLog('尝试在钱包应用中打开连接')
    },

    // 清理资源
    cleanup() {
      if (this.currentAdapter) {
        // this.currentAdapter.removeAllListeners()
        this.currentAdapter = null
      }
      this.wcUri = ''

      // 清除WalletConnect相关的缓存，确保每次都能重新选择钱包
      this.clearWalletConnectCache()
    },

    // 清除WalletConnect缓存
    clearWalletConnectCache() {
      try {
        // 清除localStorage中的WalletConnect相关数据
        const wcKeys = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (
            key &&
            (key.startsWith('wc@2:') ||
              key.startsWith('walletconnect') ||
              key.includes('wc_') ||
              key.includes('wallet_connect') ||
              key.includes('w3m') ||
              key.includes('wagmi') ||
              key.includes('connector'))
          ) {
            wcKeys.push(key)
          }
        }
        wcKeys.forEach(key => {
          localStorage.removeItem(key)
          console.log(`已清除缓存: ${key}`)
        })

        // 清除sessionStorage中的相关数据
        const sessionWcKeys = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (
            key &&
            (key.startsWith('wc@2:') ||
              key.startsWith('walletconnect') ||
              key.includes('wc_') ||
              key.includes('wallet_connect') ||
              key.includes('w3m'))
          ) {
            sessionWcKeys.push(key)
          }
        }
        sessionWcKeys.forEach(key => {
          sessionStorage.removeItem(key)
          console.log(`已清除会话缓存: ${key}`)
        })

        this.addLog('WalletConnect缓存已清除，下次连接将重新选择钱包')
      } catch (error) {
        console.error('清除WalletConnect缓存失败:', error)
        this.addLog('清除WalletConnect缓存失败: ' + error.message)
      }
    },

    // 格式化地址
    formatAddress(address) {
      if (!address) return ''
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    },

    // 添加日志
    addLog(message) {
      const time = new Date().toLocaleTimeString()
      this.logs.unshift({ time, message })
      if (this.logs.length > 50) {
        this.logs = this.logs.slice(0, 50)
      }
      console.log(`[${time}] ${message}`)
    },

    // 清空日志
    clearLogs() {
      this.logs = []
    },

    // 清除错误
    clearError() {
      this.error = ''
    },

    // 清除缓存
    clearCache() {
      try {
        // 清除 localStorage
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.includes('wallet') || key.includes('wc') || key.includes('tron') || key.includes('connect'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))

        // 清除 sessionStorage
        const sessionKeysToRemove = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && (key.includes('wallet') || key.includes('wc') || key.includes('tron') || key.includes('connect'))) {
            sessionKeysToRemove.push(key)
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))

        // 清除组件状态
        this.wcUri = ''
        this.error = ''
        this.logs = []

        // 如果已连接，先断开连接
        if (this.isConnected) {
          this.disconnect()
        }

        this.addLog('缓存已清除')

        // 可选：刷新页面以确保完全清除
        setTimeout(() => {
          if (confirm('缓存已清除，是否刷新页面以确保完全重置？')) {
            window.location.reload()
          }
        }, 1000)
      } catch (error) {
        this.error = '清除缓存时出错: ' + error.message
        this.addLog('清除缓存失败: ' + error.message)
      }
    },
  },
}
</script>

<style scoped>
.tron-mobile-wallet {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #333;
}

.tron-mobile-wallet h2 {
  text-align: center;
  color: white;
  margin-bottom: 30px;
  font-size: 24px;
  font-weight: 600;
}

.tron-mobile-wallet h3 {
  color: white;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 500;
}

/* 连接状态 */
.connection-status {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-item .label {
  font-weight: 500;
  color: #666;
}

.status-item .value {
  font-weight: 600;
}

.status-item .value.connected {
  color: #10b981;
}

.status-item .value.disconnected {
  color: #ef4444;
}

.status-item .value.address {
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
}

/* 连接方式 */
.connection-methods {
  margin-bottom: 20px;
}

.method-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.method-card:hover {
  transform: translateY(-2px);
}

.method-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.method-icon {
  font-size: 24px;
  margin-right: 10px;
}

.method-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.method-desc {
  color: #666;
  margin-bottom: 15px;
  line-height: 1.5;
}

/* 按钮样式 */
.connect-btn,
.action-btn,
.copy-btn,
.open-wallet-btn,
.clear-error-btn,
.clear-logs-btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 10px;
}

.connect-btn:last-child,
.action-btn:last-child {
  margin-bottom: 0;
}

.walletconnect-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.walletconnect-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  transform: translateY(-1px);
}

.action-btn {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  margin-right: 10px;
  flex: 1;
}

.action-btn:hover {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  transform: translateY(-1px);
}

.disconnect-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
}

.disconnect-btn:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
}

.clear-cache-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
}

.clear-cache-btn:hover {
  background: linear-gradient(135deg, #d97706, #b45309) !important;
}

.connect-btn:disabled,
.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 已连接操作 */
.connected-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

/* 二维码区域 */
.qr-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.qr-container {
  margin-bottom: 20px;
}

.qr-placeholder {
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  color: #6b7280;
}

.uri-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  word-break: break-all;
  margin-top: 10px;
  background: white;
  padding: 10px;
  border-radius: 6px;
}

.qr-actions {
  display: flex;
  gap: 10px;
}

.copy-btn,
.open-wallet-btn {
  flex: 1;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.copy-btn:hover,
.open-wallet-btn:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  transform: translateY(-1px);
}

/* 错误信息 */
.error-section {
  background: rgba(254, 242, 242, 0.95);
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.error-message {
  color: #dc2626;
  margin-bottom: 10px;
  font-weight: 500;
}

.clear-error-btn {
  background: #dc2626;
  color: white;
  padding: 8px 16px;
  font-size: 14px;
}

.clear-error-btn:hover {
  background: #b91c1c;
}

/* 日志区域 */
.logs-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  background: #f9fafb;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.log-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.4;
}

.log-item:last-child {
  margin-bottom: 0;
}

.log-time {
  color: #6b7280;
  margin-right: 10px;
  min-width: 80px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.log-message {
  color: #374151;
  flex: 1;
}

.clear-logs-btn {
  background: #6b7280;
  color: white;
  padding: 8px 16px;
  font-size: 14px;
}

.clear-logs-btn:hover {
  background: #4b5563;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tron-mobile-wallet {
    padding: 15px;
  }

  .connected-actions {
    flex-direction: column;
  }

  .action-btn {
    margin-right: 0;
    margin-bottom: 10px;
  }

  .qr-actions {
    flex-direction: column;
  }

  .method-title {
    font-size: 16px;
  }

  .tron-mobile-wallet h2 {
    font-size: 20px;
  }
}

/* 滚动条样式 */
.logs-container::-webkit-scrollbar {
  width: 6px;
}

.logs-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.logs-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.logs-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
