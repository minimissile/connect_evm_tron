<template>
  <div class="tron-appkit-container">
    <h2>@reown/appkit Tron 连接示例</h2>

    <!-- 连接状态显示 -->
    <div v-if="!isConnected" class="connection-section">
      <p class="description">使用 @reown/appkit 连接 Tron 区块链钱包</p>

      <!-- Tron 主网信息 -->
      <div class="network-info-section">
        <h3>Tron 主网连接</h3>
        <div class="network-display">
          <div class="network-card active">
            <div class="network-icon">🔗</div>
            <div class="network-name">{{ tronMainnet.name }}</div>
            <div class="network-details">
              <p>货币: {{ tronMainnet.nativeCurrency?.symbol }}</p>
              <p>Chain ID: {{ tronMainnet.id }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 连接按钮 -->
      <div v-if="selectedNetwork" class="connect-section">
        <div class="selected-network-info">
          <span class="selected-label">已选择网络:</span>
          <div class="selected-network">
            <span class="network-icon">🔗</span>
            <span class="network-name">{{ selectedNetwork.name }}</span>
            <button @click="resetNetworkSelection" class="change-network-btn">更换</button>
          </div>
        </div>

        <button @click="connectWallet" class="connect-btn" :disabled="isConnecting">
          {{ isConnecting ? '连接中...' : `连接到 ${selectedNetwork.name}` }}
        </button>
      </div>
    </div>

    <!-- 已连接状态 -->
    <div v-else class="connected-section">
      <div class="connection-info">
        <h3>✅ 钱包已连接</h3>
        <div class="info-grid">
          <div class="info-item">
            <strong>当前网络:</strong>
            <span>{{ getCurrentNetworkName() }}</span>
          </div>
          <div class="info-item">
            <strong>钱包地址:</strong>
            <span class="address">{{ address }}</span>
          </div>
          <div class="info-item">
            <strong>网络 ID:</strong>
            <span>{{ chainId }}</span>
          </div>
          <div class="info-item">
            <strong>余额:</strong>
            <span>{{ balance }} TRX</span>
            <button @click="refreshBalance" class="refresh-btn">刷新</button>
          </div>
        </div>

        <div class="action-buttons">
          <button @click="disconnectWallet" class="disconnect-btn">断开连接</button>
        </div>
      </div>

      <!-- Tron 功能测试 -->
      <div class="tron-features">
        <h4>Tron 功能测试</h4>

        <!-- 签名测试 -->
        <div class="feature-group">
          <h5>消息签名</h5>
          <div class="sign-form">
            <input v-model="messageToSign" type="text" placeholder="输入要签名的消息" class="feature-input" />
            <button @click="signMessage" class="feature-btn" :disabled="!messageToSign.trim()">签名消息</button>
          </div>
          <div v-if="signatureResult" class="result-box">
            <strong>签名结果:</strong>
            <div class="signature-result">{{ signatureResult }}</div>
          </div>
        </div>

        <!-- 转账测试 -->
        <div class="feature-group">
          <h5>TRX 转账</h5>
          <div class="transfer-form">
            <div class="input-group">
              <input v-model="transferTo" type="text" placeholder="接收地址" class="feature-input" />
            </div>
            <div class="input-group">
              <input
                v-model="transferAmount"
                type="number"
                step="0.000001"
                placeholder="转账金额 (TRX)"
                class="feature-input"
              />
            </div>
            <button
              @click="transferTRX"
              class="feature-btn transfer-btn"
              :disabled="!transferTo.trim() || !transferAmount || parseFloat(transferAmount) <= 0"
            >
              发送转账
            </button>
          </div>
          <div v-if="transferResult" class="result-box">
            <strong>转账结果:</strong>
            <div class="transfer-result">{{ transferResult }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-message"><strong>错误:</strong> {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { AppKit, createAppKit } from '@reown/appkit/vue'
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5'
import { defineChain } from '@reown/appkit/networks'
import { ethers } from 'ethers'

// export declare enum WalletConnectChainID {
//   Mainnet = "tron:0x2b6653dc",
//   Shasta = "tron:0x94a9059e",
//   Nile = "tron:0xcd8690dc"
// }

// Tron 主网配置 (使用 EVM 兼容方式)
const tronMainnet = defineChain({
  id: 728126428, // Tron 主网的十进制 Chain ID
  caipNetworkId: 'eip155:0x2b6653dc',
  chainNamespace: 'eip155',
  name: 'Tron Mainnet',
  nativeCurrency: { name: 'TRX', symbol: 'TRX', decimals: 6 },
  rpcUrls: { default: { http: ['https://api.trongrid.io'] } },
  blockExplorers: {
    default: { name: 'TronScan', url: 'https://tronscan.org' },
  },
  contracts: {},
})

// 响应式数据
const isConnected = ref(false)
const isConnecting = ref(false)
const address = ref('')
const chainId = ref(null)
const balance = ref('')
const error = ref('')
const selectedNetwork = ref(tronMainnet)

// 只支持 Tron 主网 (移除了 tronNetworks 变量)

// 功能测试相关
const messageToSign = ref('Hello Tron!')
const signatureResult = ref('')
const transferTo = ref('')
const transferAmount = ref('')
const transferResult = ref('')

// AppKit 实例
let appKit: AppKit | null = null

// 项目配置
const projectId = 'c34b3bde7397ea7ed6780e9ce1d5194d' // 替换为您的项目ID

// 初始化 AppKit (只支持 Tron 主网)
const initializeAppKit = async () => {
  try {
    console.log('初始化 AppKit for Tron 主网')

    // 创建 Ethers 适配器
    const ethersAdapter = new Ethers5Adapter()

    // 创建 AppKit 实例
    appKit = createAppKit({
      projectId,
      adapters: [ethersAdapter],
      networks: [tronMainnet], // 只使用 Tron 主网
      metadata: {
        name: 'Tron AppKit Demo',
        description: '@reown/appkit Tron 连接示例',
        url: window.location.origin,
        icons: [window.location.origin + '/favicon.ico'],
      },
      features: {
        analytics: true,
        email: false,
        socials: [],
        emailShowWallets: true,
      },
      themeMode: 'light',
      themeVariables: {
        '--w3m-z-index': 9999,
        '--w3m-accent': '#ff6b35', // Tron 橙色主题
      },
      defaultNetwork: tronMainnet,
    })

    // 监听连接状态变化
    appKit.subscribeState(state => {
      console.log('AppKit 状态变化:', state)

      if (state.open !== undefined) {
        if (!state.open && !isConnected.value) {
          isConnecting.value = false
          console.log('模态框关闭，重置连接状态')
        }
      }

      if (state.selectedNetworkId !== undefined) {
        chainId.value = state.selectedNetworkId
        console.log('网络变化:', state.selectedNetworkId)
      }
    })

    // 监听账户变化
    appKit.subscribeAccount(account => {
      console.log('账户状态变化:', account)

      if (account.isConnected) {
        isConnected.value = true
        isConnecting.value = false
        address.value = account.address || ''
        error.value = ''

        // 获取余额
        getBalance()

        console.log('Tron 钱包已连接:', account.address)
      } else {
        isConnected.value = false
        isConnecting.value = false
        address.value = ''
        chainId.value = null
        balance.value = ''
        console.log('Tron 钱包已断开')
      }
    })

    console.log('Tron AppKit 初始化成功')
  } catch (err) {
    console.error('Tron AppKit 初始化失败:', err)
    error.value = '初始化失败: ' + err.message
  }
}

// 连接到 Tron 主网
const connectToTron = () => {
  console.log('连接到 Tron 主网')
  selectedNetwork.value = tronMainnet

  // 初始化 AppKit
  initializeAppKit()
}

const resetNetworkSelection = () => {
  console.log('重置网络选择')
  selectedNetwork.value = null

  // 如果已连接，先断开
  if (isConnected.value && appKit) {
    appKit.disconnect()
  }
}

// 连接钱包
const connectWallet = async () => {
  if (!appKit) {
    error.value = 'AppKit 未初始化'
    return
  }

  try {
    isConnecting.value = true
    error.value = ''
    console.log('开始连接 Tron 钱包...')

    // 打开连接模态框
    appKit.open()
  } catch (err) {
    console.error('连接 Tron 钱包失败:', err)
    error.value = '连接失败: ' + err.message
    isConnecting.value = false
  }
}

// 断开连接
const disconnectWallet = async () => {
  if (!appKit) return

  try {
    await appKit.disconnect()
    console.log('Tron 钱包已断开连接')
  } catch (err) {
    console.error('断开连接失败:', err)
    error.value = '断开连接失败: ' + err.message
  }
}

// 获取余额
const getBalance = async () => {
  if (!appKit || !address.value) return

  try {
    const provider = appKit.getWalletProvider() as any
    if (provider && provider.getBalance) {
      const balanceWei = await provider.getBalance(address.value)
      balance.value = ethers.utils.formatEther(balanceWei)
      console.log('余额更新:', balance.value, 'TRX')
    }
  } catch (err) {
    console.error('获取余额失败:', err)
    balance.value = '获取失败'
  }
}

// 刷新余额
const refreshBalance = () => {
  getBalance()
}

// 获取当前网络名称
const getCurrentNetworkName = () => {
  if (!chainId.value) return '未知'

  const chainIdStr = chainId.value.toString()
  const chainIdHex = typeof chainId.value === 'number' ? '0x' + chainId.value.toString(16) : chainIdStr

  // Tron 网络映射
  const networkMap = {
    '0x2b6653dc': '🔗 Tron Mainnet',
    '728126428': '🔗 Tron Mainnet',
    '0x94a9059e': '🧪 Tron Shasta Testnet',
    '2494104990': '🧪 Tron Shasta Testnet',
    '0xcd8690dc': '🧪 Tron Nile Testnet',
    '3448148188': '🧪 Tron Nile Testnet',
  }

  return networkMap[chainIdHex] || networkMap[chainIdStr] || `未知网络 (${chainId.value})`
}

// 签名消息
const signMessage = async () => {
  if (!appKit || !messageToSign.value.trim()) return

  try {
    const provider = appKit.getWalletProvider() as any
    if (provider && provider.getSigner) {
      const signer = provider.getSigner()
      const signature = await signer.signMessage(messageToSign.value)
      signatureResult.value = signature
      console.log('消息签名成功:', signature)
    } else {
      throw new Error('无法获取签名器')
    }
  } catch (err) {
    console.error('签名失败:', err)
    signatureResult.value = '签名失败: ' + (err as Error).message
  }
}

// TRX 转账
const transferTRX = async () => {
  if (!appKit || !transferTo.value.trim() || !transferAmount.value) return

  try {
    const provider = appKit.getWalletProvider() as any
    if (provider && provider.getSigner) {
      const signer = provider.getSigner()

      const tx = {
        to: transferTo.value,
        value: ethers.utils.parseEther(transferAmount.value.toString()),
      }

      const transaction = await signer.sendTransaction(tx)
      const receipt = await transaction.wait()

      transferResult.value = `转账成功! 交易哈希: ${receipt.transactionHash}`
      console.log('TRX 转账成功:', receipt)

      // 刷新余额
      setTimeout(() => {
        getBalance()
      }, 2000)
    } else {
      throw new Error('无法获取签名器')
    }
  } catch (err) {
    console.error('转账失败:', err)
    transferResult.value = '转账失败: ' + (err as Error).message
  }
}

onMounted(() => {
  console.log('Tron AppKit 组件已挂载')
  // 自动初始化 Tron 主网
  initializeAppKit()
})

onUnmounted(() => {
  // 清理资源
  if (appKit) {
    console.log('清理 Tron AppKit 资源')
  }
})
</script>

<style scoped>
.tron-appkit-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.tron-appkit-container h2 {
  text-align: center;
  color: #ff6b35;
  margin-bottom: 30px;
  font-size: 2rem;
}

.description {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-size: 1.1rem;
}

/* 网络信息样式 */
.network-info-section {
  margin-bottom: 30px;
}

.network-info-section h3 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

.network-display {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.network-details {
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}

.network-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.network-card:hover {
  border-color: #ff6b35;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
}

.network-card.active {
  border-color: #ff6b35;
  background: #fff5f2;
}

.network-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.network-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.network-type {
  color: #666;
  font-size: 0.9rem;
}

/* 连接部分样式 */
.connect-section {
  text-align: center;
}

.selected-network-info {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.selected-label {
  color: #666;
  margin-right: 10px;
}

.selected-network {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.change-network-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.change-network-btn:hover {
  background: #5a6268;
}

.connect-btn {
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 200px;
}

.connect-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.3);
}

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 已连接状态样式 */
.connected-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 25px;
}

.connection-info h3 {
  color: #28a745;
  text-align: center;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  gap: 15px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #ff6b35;
}

.address {
  font-family: monospace;
  font-size: 0.9rem;
  word-break: break-all;
}

.refresh-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  margin-left: 10px;
}

.refresh-btn:hover {
  background: #138496;
}

.action-buttons {
  text-align: center;
}

.disconnect-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
}

.disconnect-btn:hover {
  background: #c82333;
}

/* Tron 功能测试样式 */
.tron-features {
  margin-top: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.tron-features h4 {
  color: #ff6b35;
  text-align: center;
  margin-bottom: 20px;
}

.feature-group {
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.feature-group h5 {
  color: #333;
  margin-bottom: 15px;
}

.sign-form,
.transfer-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-group {
  display: flex;
  flex-direction: column;
}

.feature-input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.feature-input:focus {
  outline: none;
  border-color: #ff6b35;
}

.feature-btn {
  background: #ff6b35;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s ease;
}

.feature-btn:hover:not(:disabled) {
  background: #e55a2b;
}

.feature-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.transfer-btn {
  background: #28a745;
}

.transfer-btn:hover:not(:disabled) {
  background: #218838;
}

.result-box {
  margin-top: 15px;
  padding: 15px;
  background: #e9ecef;
  border-radius: 6px;
  border-left: 4px solid #ff6b35;
}

.signature-result,
.transfer-result {
  font-family: monospace;
  font-size: 0.9rem;
  word-break: break-all;
  margin-top: 5px;
  color: #495057;
}

/* 错误信息样式 */
.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tron-appkit-container {
    padding: 15px;
  }

  .network-grid {
    grid-template-columns: 1fr;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .sign-form,
  .transfer-form {
    gap: 15px;
  }
}
</style>
