<template>
  <div class="tron-wallet-connect">
    <h2>Tron WalletConnect 适配器测试</h2>
    <div class="wallet-info">
      <p><strong>连接状态:</strong> {{ connected ? '已连接' : '未连接' }}</p>
      <p v-if="adapter"><strong>适配器状态:</strong> {{ adapter.connected ? '适配器已连接' : '适配器未连接' }}</p>
      <p v-if="connected"><strong>地址:</strong> {{ address }}</p>
      <p v-if="connected"><strong>余额:</strong> {{ balance }} TRX</p>
      <p v-if="error" class="error"><strong>错误:</strong> {{ error }}</p>
      <div v-if="connecting" class="connecting-info">
        <p>🔄 正在连接钱包...</p>
        <p class="tip">💡 提示：请在弹出的钱包选择界面中选择您的钱包</p>
      </div>
    </div>
    
    <div class="actions">
      <button v-if="!connected" @click="openWalletModal" :disabled="connecting">
        {{ connecting ? '连接中...' : '选择钱包' }}
      </button>
      <button v-if="!connected" @click="connectWallet" :disabled="connecting" class="secondary-btn">
        {{ connecting ? '连接中...' : '直接连接' }}
      </button>
      <button v-if="connected" @click="disconnectWallet">
        断开连接
      </button>
      <button v-if="connected" @click="getBalance">
        刷新余额
      </button>
      <button @click="debugAdapter" class="debug-btn">
        调试适配器
      </button>
    </div>
  </div>
</template>

<script>
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect'
// 使用动态导入或者直接使用window.TronWeb
// import TronWeb from 'tronweb'

export default {
  name: 'TronWalletConnect',
  data() {
    return {
      adapter: null,
      tronWeb: null,
      connected: false,
      connecting: false,
      address: '',
      balance: '0',
      error: ''
    }
  },
  mounted() {
    this.initializeTronWeb()
    this.initializeAdapter()
  },
  methods: {
    initializeTronWeb() {
      // 暂时跳过TronWeb初始化，专注于测试WalletConnect适配器
      console.log('Skipping TronWeb initialization for now')
    },
    
    initializeAdapter() {
      try {
        this.adapter = new WalletConnectAdapter({
          network: 'Mainnet', // 或 'Nile' 用于测试网
          options: {
            relayUrl: 'wss://relay.walletconnect.com',
            projectId: 'e899c82be21d4acca2c8aec45e893598', // 示例项目ID，实际使用时需要替换
            metadata: {
              name: 'Tron Wallet Test',
              description: 'Testing Tron WalletConnect Adapter',
              url: 'https://localhost:5174',
              icons: ['https://localhost:5174/favicon.ico']
            }
          },
          web3ModalConfig: {
            themeMode: 'light',
            themeVariables: {
              '--w3m-z-index': '1000',
              '--w3m-accent-color': '#ff6b35',
              '--w3m-background-color': '#ffffff'
            },
            // 使用官方推荐的钱包ID
            explorerRecommendedWalletIds: [
              '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // TronLink
              '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Trust Wallet  
              '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0'  // TokenPocket
            ],
            // 启用钱包浏览器
            enableExplorer: true,
            // 启用网络切换
            enableNetworkView: true,
            // 启用账户视图
            enableAccountView: true
          }
        })
        
        // 监听连接状态变化
        this.adapter.on('connect', this.onConnect)
        this.adapter.on('disconnect', this.onDisconnect)
        this.adapter.on('accountsChanged', this.onAccountsChanged)
        this.adapter.on('error', this.onError)
        
        console.log('WalletConnect Adapter initialized:', this.adapter)
      } catch (error) {
        console.error('Failed to initialize adapter:', error)
        this.error = `初始化失败: ${error.message}`
      }
    },
    
    async openWalletModal() {
      if (!this.adapter) {
        this.error = 'Adapter not initialized'
        return
      }
      
      try {
        this.connecting = true
        this.error = ''
        
        console.log('Opening wallet selection modal...')
        
        // 检查是否有专门的模态框方法
        if (typeof this.adapter.openModal === 'function') {
          console.log('Using openModal method')
          await this.adapter.openModal()
        } else if (typeof this.adapter.connect === 'function') {
          console.log('Using connect method to trigger modal')
          await this.adapter.connect()
        } else {
          throw new Error('No available method to open wallet selection')
        }
        
      } catch (error) {
        console.error('Failed to open wallet modal:', error)
        this.error = `打开钱包选择失败: ${error.message}`
      } finally {
        this.connecting = false
      }
    },
    
    async connectWallet() {
      if (!this.adapter) {
        this.error = 'Adapter not initialized'
        return
      }
      
      try {
        this.connecting = true
        this.error = ''
        
        console.log('Connecting to wallet...')
        console.log('Available adapter methods:', Object.getOwnPropertyNames(this.adapter))
        
        // 检查适配器状态
        if (this.adapter.connected) {
          console.log('Already connected, disconnecting first...')
          await this.adapter.disconnect()
        }
        
        // 尝试连接
        await this.adapter.connect()
        
        // 连接成功后的处理
        if (this.adapter.connected) {
          console.log('Connection successful!')
          this.onConnect()
        } else {
          throw new Error('连接失败：适配器未报告连接成功')
        }
        
      } catch (error) {
        console.error('Connection failed:', error)
        
        // 提供更详细的错误信息
        let errorMessage = error.message || '未知错误'
        if (errorMessage.includes('User rejected')) {
          errorMessage = '用户取消了连接请求'
        } else if (errorMessage.includes('No wallet')) {
          errorMessage = '未找到支持的钱包，请确保已安装TronLink或其他支持Tron的钱包'
        } else if (errorMessage.includes('Network')) {
          errorMessage = '网络连接错误，请检查网络设置'
        }
        
        this.error = `连接失败: ${errorMessage}`
      } finally {
        this.connecting = false
      }
    },
    
    async disconnectWallet() {
      if (!this.adapter) return
      
      try {
        await this.adapter.disconnect()
      } catch (error) {
        console.error('Disconnect failed:', error)
        this.error = `断开连接失败: ${error.message}`
      }
    },
    
    async getBalance() {
      if (!this.connected || !this.address) return
      
      try {
        // 使用简单的API调用获取余额
        const response = await fetch(`https://api.trongrid.io/v1/accounts/${this.address}`)
        const data = await response.json()
        
        if (data.data && data.data.length > 0) {
          const balanceInSun = data.data[0].balance || 0
          this.balance = (balanceInSun / 1000000).toFixed(6) // 转换为TRX
        } else {
          this.balance = '0'
        }
      } catch (error) {
        console.error('Failed to get balance:', error)
        this.error = `获取余额失败: ${error.message}`
      }
    },
    
    onConnect() {
      console.log('Wallet connected')
      this.connected = true
      this.address = this.adapter.address || ''
      this.error = ''
      
      if (this.address) {
        this.getBalance()
      }
    },
    
    onDisconnect() {
      console.log('Wallet disconnected')
      this.connected = false
      this.address = ''
      this.balance = '0'
      this.error = ''
    },
    
    onAccountsChanged(accounts) {
      console.log('Accounts changed:', accounts)
      if (accounts && accounts.length > 0) {
        this.address = accounts[0]
        this.getBalance()
      }
    },
    
    onError(error) {
      console.error('Adapter error:', error)
      this.error = `适配器错误: ${error.message || error}`
    },
    
    debugAdapter() {
      console.log('=== 适配器调试信息 ===')
      if (this.adapter) {
        console.log('适配器对象:', this.adapter)
        console.log('适配器方法:', Object.getOwnPropertyNames(this.adapter))
        console.log('适配器原型方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.adapter)))
        console.log('连接状态:', this.adapter.connected)
        console.log('地址:', this.adapter.address)
        console.log('网络:', this.adapter.network)
        
        // 检查是否有钱包选择方法
        if (typeof this.adapter.openModal === 'function') {
          console.log('✅ 支持 openModal 方法')
        } else {
          console.log('❌ 不支持 openModal 方法')
        }
        
        if (typeof this.adapter.getWallets === 'function') {
          console.log('✅ 支持 getWallets 方法')
          try {
            const wallets = this.adapter.getWallets()
            console.log('可用钱包:', wallets)
          } catch (e) {
            console.log('获取钱包列表失败:', e)
          }
        } else {
          console.log('❌ 不支持 getWallets 方法')
        }
      } else {
        console.log('❌ 适配器未初始化')
      }
      console.log('=== 调试信息结束 ===')
    }
  },
  
  beforeUnmount() {
    if (this.adapter) {
      this.adapter.off('connect', this.onConnect)
      this.adapter.off('disconnect', this.onDisconnect)
      this.adapter.off('accountsChanged', this.onAccountsChanged)
      this.adapter.off('error', this.onError)
    }
  }
}
</script>

<style scoped>
.tron-wallet-connect {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.wallet-info {
  margin: 20px 0;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border: 1px solid #eee;
}

.wallet-info p {
  margin: 8px 0;
  word-break: break-all;
}

.error {
  color: #e74c3c;
}

.connecting-info {
  background: #e8f4fd;
  border: 1px solid #3498db;
  border-radius: 6px;
  padding: 10px;
  margin: 10px 0;
}

.connecting-info p {
  margin: 5px 0;
  color: #2980b9;
}

.tip {
  font-size: 12px;
  color: #7f8c8d;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #2980b9;
}

button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.debug-btn {
  background: #9b59b6 !important;
  font-size: 12px;
}

.debug-btn:hover {
  background: #8e44ad !important;
}

.secondary-btn {
  background: #ecf0f1;
  color: #2c3e50;
  border: 1px solid #bdc3c7;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 10px;
}

.secondary-btn:hover {
  background: #d5dbdb;
}

.secondary-btn:disabled {
  background: #ecf0f1;
  color: #95a5a6;
  cursor: not-allowed;
}

h2 {
  color: #2c3e50;
  margin-bottom: 20px;
}
</style>