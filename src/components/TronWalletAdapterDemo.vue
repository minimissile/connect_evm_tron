<template>
  <div class="tron-wallet-adapter-demo">
    <h2>TronWallet Adapter 完整演示</h2>
    <p class="description">
      基于 @tronweb3/tronwallet-adapters 的完整钱包连接演示，支持多种钱包适配器
    </p>

    <!-- 钱包选择区域 -->
    <div class="wallet-selection">
      <h3>选择钱包适配器</h3>
      <div class="adapter-grid">
        <div 
          v-for="adapterInfo in availableAdapters" 
          :key="adapterInfo.name"
          class="adapter-card"
          :class="{ active: selectedAdapter === adapterInfo.name, disabled: !adapterInfo.available }"
          @click="selectAdapter(adapterInfo.name)"
        >
          <div class="adapter-icon">{{ adapterInfo.icon }}</div>
          <div class="adapter-name">{{ adapterInfo.displayName }}</div>
          <div class="adapter-status">
            {{ adapterInfo.available ? '可用' : '不可用' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 连接状态显示 -->
    <div class="connection-status">
      <h3>连接状态</h3>
      <div class="status-grid">
        <div class="status-item">
          <span class="label">适配器状态:</span>
          <span class="value" :class="readyStateClass">{{ readyStateText }}</span>
        </div>
        <div class="status-item">
          <span class="label">连接状态:</span>
          <span class="value" :class="{ connected: isConnected, disconnected: !isConnected }">
            {{ isConnected ? '已连接' : '未连接' }}
          </span>
        </div>
        <div class="status-item" v-if="currentAddress">
          <span class="label">钱包地址:</span>
          <span class="value address">{{ currentAddress }}</span>
        </div>
        <div class="status-item" v-if="currentNetwork">
          <span class="label">当前网络:</span>
          <span class="value">{{ currentNetwork }}</span>
        </div>
        <div class="status-item" v-if="balance">
          <span class="label">余额:</span>
          <span class="value">{{ balance }} TRX</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button 
        v-if="!isConnected" 
        @click="connectWallet" 
        :disabled="!selectedAdapter || isConnecting"
        class="connect-btn"
      >
        {{ isConnecting ? '连接中...' : '连接钱包' }}
      </button>
      
      <button 
        v-if="isConnected" 
        @click="disconnectWallet" 
        class="disconnect-btn"
      >
        断开连接
      </button>
      
      <button 
        v-if="isConnected" 
        @click="refreshBalance" 
        class="refresh-btn"
      >
        刷新余额
      </button>
      
      <button 
        v-if="isConnected" 
        @click="signMessage" 
        class="sign-btn"
      >
        签名测试
      </button>
    </div>

    <!-- 签名测试区域 -->
    <div v-if="isConnected" class="sign-section">
      <h3>消息签名测试</h3>
      <div class="sign-form">
        <input 
          v-model="messageToSign" 
          type="text" 
          placeholder="输入要签名的消息"
          class="message-input"
        >
        <button @click="signMessage" :disabled="!messageToSign" class="sign-btn">
          签名消息
        </button>
      </div>
      <div v-if="signedMessage" class="signed-result">
        <h4>签名结果:</h4>
        <pre>{{ signedMessage }}</pre>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-section">
      <h3>错误信息</h3>
      <p class="error-message">{{ error }}</p>
    </div>

    <!-- 事件日志 -->
    <div class="event-logs">
      <h3>事件日志</h3>
      <div class="logs-container">
        <div v-for="(log, index) in eventLogs" :key="index" class="log-item">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-type" :class="log.type">{{ log.type }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLogs" class="clear-logs-btn">清空日志</button>
    </div>
  </div>
</template>

<script>
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect'

// 钱包就绪状态枚举
const WalletReadyState = {
  Installed: 'Installed',
  NotDetected: 'NotDetected',
  Loadable: 'Loadable',
  Loading: 'Loading',
  NotFound: 'NotFound'
}

export default {
  name: 'TronWalletAdapterDemo',
  data() {
    return {
      // 适配器相关
      currentAdapter: null,
      selectedAdapter: null,
      isConnected: false,
      isConnecting: false,
      readyState: WalletReadyState.NotFound,
      
      // 钱包信息
      currentAddress: '',
      currentNetwork: '',
      balance: '',
      
      // 签名测试
      messageToSign: 'Hello TronWallet Adapter!',
      signedMessage: '',
      
      // 错误和日志
      error: '',
      eventLogs: [],
      
      // 可用适配器配置
      availableAdapters: [
        {
          name: 'tronlink',
          displayName: 'TronLink',
          icon: '🔗',
          available: false
        },
        {
          name: 'walletconnect',
          displayName: 'WalletConnect',
          icon: '📱',
          available: true
        }
      ]
    }
  },
  
  computed: {
    readyStateText() {
      const stateMap = {
        [WalletReadyState.Installed]: '已安装',
        [WalletReadyState.NotDetected]: '未检测到',
        [WalletReadyState.Loadable]: '可加载',
        [WalletReadyState.Loading]: '加载中',
        [WalletReadyState.NotFound]: '未找到'
      }
      return stateMap[this.readyState] || '未知'
    },
    
    readyStateClass() {
      return {
        'state-installed': this.readyState === WalletReadyState.Installed,
        'state-not-detected': this.readyState === WalletReadyState.NotDetected,
        'state-loadable': this.readyState === WalletReadyState.Loadable,
        'state-loading': this.readyState === WalletReadyState.Loading,
        'state-not-found': this.readyState === WalletReadyState.NotFound
      }
    }
  },
  
  mounted() {
    this.checkWalletAvailability()
    this.addLog('info', '组件已加载，检查钱包可用性')
  },
  
  beforeUnmount() {
    this.cleanupAdapter()
  },
  
  methods: {
    // 检查钱包可用性
    checkWalletAvailability() {
      // 检查 TronLink
      const tronLinkAvailable = !!(window.tronLink || window.tronWeb)
      this.availableAdapters.find(a => a.name === 'tronlink').available = tronLinkAvailable
      
      this.addLog('info', `TronLink 可用性: ${tronLinkAvailable ? '是' : '否'}`)
      this.addLog('info', `WalletConnect 可用性: 是`)
    },
    
    // 选择适配器
    selectAdapter(adapterName) {
      const adapterInfo = this.availableAdapters.find(a => a.name === adapterName)
      if (!adapterInfo.available) {
        this.error = `${adapterInfo.displayName} 不可用`
        return
      }
      
      this.selectedAdapter = adapterName
      this.error = ''
      this.addLog('info', `选择适配器: ${adapterInfo.displayName}`)
    },
    
    // 创建适配器实例
    createAdapter(adapterName) {
      switch (adapterName) {
        case 'tronlink':
          return new TronLinkAdapter({
            openTronLinkAppOnMobile: true,
            openUrlWhenWalletNotFound: false,
            checkTimeout: 3000
          })
          
        case 'walletconnect':
          return new WalletConnectAdapter({
            network: 'Mainnet',
            options: {
              relayUrl: 'wss://relay.walletconnect.com',
              projectId: 'c34b3bde7397ea7ed6780e9ce1d5194d',
              metadata: {
                name: 'TronWallet Adapter Demo',
                description: 'TronWallet Adapter 完整演示应用',
                url: window.location.origin,
                icons: [window.location.origin + '/favicon.ico']
              }
            },
            web3ModalConfig: {
              themeMode: 'light',
              themeVariables: {
                '--w3m-z-index': '99999',
                '--w3m-accent-color': '#ff6b35'
              }
            }
          })
          
        default:
          throw new Error(`未知的适配器: ${adapterName}`)
      }
    },
    
    // 设置适配器事件监听
    setupAdapterEvents(adapter) {
      adapter.on('connect', this.onConnect)
      adapter.on('disconnect', this.onDisconnect)
      adapter.on('accountsChanged', this.onAccountsChanged)
      adapter.on('chainChanged', this.onChainChanged)
      adapter.on('readyStateChanged', this.onReadyStateChanged)
      adapter.on('error', this.onError)
      
      this.addLog('info', '适配器事件监听已设置')
    },
    
    // 清理适配器
    cleanupAdapter() {
      if (this.currentAdapter) {
        this.currentAdapter.removeAllListeners()
        this.currentAdapter = null
        this.addLog('info', '适配器已清理')
      }
    },
    
    // 连接钱包
    async connectWallet() {
      if (!this.selectedAdapter) {
        this.error = '请先选择一个适配器'
        return
      }
      
      this.isConnecting = true
      this.error = ''
      
      try {
        // 清理之前的适配器
        this.cleanupAdapter()
        
        // 创建新适配器
        this.currentAdapter = this.createAdapter(this.selectedAdapter)
        this.setupAdapterEvents(this.currentAdapter)
        
        this.addLog('info', `开始连接 ${this.selectedAdapter}`)
        
        // 连接钱包
        await this.currentAdapter.connect()
        
        if (this.currentAdapter.connected) {
          this.addLog('success', '钱包连接成功')
        }
        
      } catch (error) {
        console.error('连接失败:', error)
        this.error = `连接失败: ${error.message}`
        this.addLog('error', `连接失败: ${error.message}`)
      } finally {
        this.isConnecting = false
      }
    },
    
    // 断开连接
    async disconnectWallet() {
      if (!this.currentAdapter) return
      
      try {
        await this.currentAdapter.disconnect()
        this.addLog('info', '钱包已断开连接')
      } catch (error) {
        console.error('断开连接失败:', error)
        this.error = `断开连接失败: ${error.message}`
        this.addLog('error', `断开连接失败: ${error.message}`)
      }
    },
    
    // 刷新余额
    async refreshBalance() {
      if (!this.isConnected || !this.currentAddress) return
      
      try {
        const response = await fetch(`https://api.trongrid.io/v1/accounts/${this.currentAddress}`)
        const data = await response.json()
        
        if (data.data && data.data.length > 0) {
          const balanceInSun = data.data[0].balance || 0
          this.balance = (balanceInSun / 1000000).toFixed(6)
        } else {
          this.balance = '0'
        }
        
        this.addLog('info', `余额已更新: ${this.balance} TRX`)
      } catch (error) {
        console.error('获取余额失败:', error)
        this.error = `获取余额失败: ${error.message}`
        this.addLog('error', `获取余额失败: ${error.message}`)
      }
    },
    
    // 签名消息
    async signMessage() {
      if (!this.isConnected || !this.currentAdapter || !this.messageToSign) return
      
      try {
        this.addLog('info', `开始签名消息: ${this.messageToSign}`)
        const signature = await this.currentAdapter.signMessage(this.messageToSign)
        this.signedMessage = signature
        this.addLog('success', '消息签名成功')
      } catch (error) {
        console.error('签名失败:', error)
        this.error = `签名失败: ${error.message}`
        this.addLog('error', `签名失败: ${error.message}`)
      }
    },
    
    // 事件处理器
    onConnect() {
      this.isConnected = true
      this.currentAddress = this.currentAdapter.address || ''
      this.addLog('success', `钱包已连接: ${this.currentAddress}`)
      this.refreshBalance()
    },
    
    onDisconnect() {
      this.isConnected = false
      this.currentAddress = ''
      this.balance = ''
      this.signedMessage = ''
      this.addLog('info', '钱包已断开连接')
    },
    
    onAccountsChanged(accounts) {
      this.currentAddress = accounts || ''
      this.addLog('info', `账户已更改: ${this.currentAddress}`)
      if (this.currentAddress) {
        this.refreshBalance()
      }
    },
    
    onChainChanged(chainInfo) {
      this.currentNetwork = chainInfo?.name || JSON.stringify(chainInfo)
      this.addLog('info', `网络已更改: ${this.currentNetwork}`)
    },
    
    onReadyStateChanged(state) {
      this.readyState = state
      this.addLog('info', `适配器状态已更改: ${this.readyStateText}`)
    },
    
    onError(error) {
      this.error = error.message || '未知错误'
      this.addLog('error', `适配器错误: ${this.error}`)
    },
    
    // 日志管理
    addLog(type, message) {
      const log = {
        time: new Date().toLocaleTimeString(),
        type,
        message
      }
      this.eventLogs.unshift(log)
      
      // 限制日志数量
      if (this.eventLogs.length > 50) {
        this.eventLogs = this.eventLogs.slice(0, 50)
      }
    },
    
    clearLogs() {
      this.eventLogs = []
    }
  }
}
</script>

<style scoped>
.tron-wallet-adapter-demo {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.description {
  color: #666;
  margin-bottom: 30px;
  font-size: 16px;
  line-height: 1.5;
}

/* 钱包选择区域 */
.wallet-selection {
  margin-bottom: 30px;
}

.adapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.adapter-card {
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.adapter-card:hover:not(.disabled) {
  border-color: #0066cc;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.15);
}

.adapter-card.active {
  border-color: #0066cc;
  background: #f0f8ff;
}

.adapter-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
}

.adapter-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.adapter-name {
  font-weight: 600;
  margin-bottom: 5px;
  color: #333;
}

.adapter-status {
  font-size: 12px;
  color: #666;
}

/* 连接状态区域 */
.connection-status {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.label {
  font-weight: 600;
  color: #495057;
}

.value {
  color: #333;
  font-family: 'Monaco', 'Menlo', monospace;
}

.value.address {
  font-size: 12px;
  word-break: break-all;
  max-width: 150px;
}

.connected {
  color: #28a745;
  font-weight: 600;
}

.disconnected {
  color: #dc3545;
  font-weight: 600;
}

/* 状态样式 */
.state-installed {
  color: #28a745;
  font-weight: 600;
}

.state-not-detected,
.state-not-found {
  color: #dc3545;
  font-weight: 600;
}

.state-loadable {
  color: #ffc107;
  font-weight: 600;
}

.state-loading {
  color: #17a2b8;
  font-weight: 600;
}

/* 操作按钮 */
.actions {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.actions button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.connect-btn {
  background: #0066cc;
  color: white;
}

.connect-btn:hover:not(:disabled) {
  background: #0052a3;
}

.connect-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.disconnect-btn {
  background: #dc3545;
  color: white;
}

.disconnect-btn:hover {
  background: #c82333;
}

.refresh-btn,
.sign-btn {
  background: #28a745;
  color: white;
}

.refresh-btn:hover,
.sign-btn:hover {
  background: #218838;
}

/* 签名测试区域 */
.sign-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.sign-form {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.message-input {
  flex: 1;
  min-width: 200px;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
}

.signed-result {
  margin-top: 15px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.signed-result pre {
  margin: 10px 0 0 0;
  padding: 10px;
  background: #f1f3f4;
  border-radius: 4px;
  font-size: 12px;
  word-break: break-all;
  white-space: pre-wrap;
}

/* 错误信息 */
.error-section {
  margin-bottom: 30px;
  padding: 15px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
}

.error-message {
  color: #721c24;
  margin: 0;
  font-weight: 500;
}

/* 事件日志 */
.event-logs {
  margin-top: 30px;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  margin-top: 15px;
}

.log-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f3f4;
  font-size: 13px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: #666;
  margin-right: 10px;
  font-family: 'Monaco', 'Menlo', monospace;
  min-width: 80px;
}

.log-type {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  margin-right: 10px;
  min-width: 60px;
  text-align: center;
}

.log-type.info {
  background: #d1ecf1;
  color: #0c5460;
}

.log-type.success {
  background: #d4edda;
  color: #155724;
}

.log-type.error {
  background: #f8d7da;
  color: #721c24;
}

.log-message {
  flex: 1;
  color: #333;
}

.clear-logs-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.clear-logs-btn:hover {
  background: #5a6268;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .adapter-grid {
    grid-template-columns: 1fr;
  }
  
  .status-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .sign-form {
    flex-direction: column;
  }
  
  .message-input {
    min-width: auto;
  }
}
</style>