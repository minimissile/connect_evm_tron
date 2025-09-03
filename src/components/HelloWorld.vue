<template>
  <div class="greetings">
    <h1 class="green">{{ msg }}</h1>
    <h3>
      You've successfully created a project with
      <a href="https://vite.dev/" target="_blank" rel="noopener">Vite</a> +
      <a href="https://vuejs.org/" target="_blank" rel="noopener">Vue 3</a>.
    </h3>

    <div class="wallet-container">
      <button 
        v-if="!address" 
        @click="connect" 
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
        class="connect-btn"
        :disabled="isConnecting"
      >
        {{ isConnecting ? '连接中...' : '通过 WalletConnect 连接 Tron 钱包' }}
      </button>
      <div v-else class="connected-info">
        <div class="address-display">已连接地址：{{ address }}</div>
        <button 
          @click="disconnect" 
          @touchstart="handleTouchStart"
          @touchend="handleTouchEnd"
          class="disconnect-btn"
          :disabled="isDisconnecting"
        >
          {{ isDisconnecting ? '断开中...' : '断开连接' }}
        </button>
      </div>
      <div v-if="error" class="error-message">
        错误：{{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { WalletConnectAdapter } from "@tronweb3/tronwallet-adapter-walletconnect";

defineProps({
  msg: {
    type: String,
    required: true
  }
})

const address = ref(null);
const adapter = ref(null);
const error = ref(null);
const isConnecting = ref(false);
const isDisconnecting = ref(false);

// WalletConnect 配置
const walletConnectConfig = {
  network: 'Mainnet', // 或 'Shasta', 'Nile'
  options: {
    relayUrl: 'wss://relay.walletconnect.com',
    projectId: 'da86e4b4584399bf3c78bb7f8026cd64', // 使用项目的 WalletConnect Project ID
    metadata: {
      name: 'Tron WalletConnect Demo',
      description: 'Vue3 Tron WalletConnect 连接示例',
      url: window.location.origin,
      icons: [window.location.origin + '/favicon.ico']
    }
  },
  web3ModalConfig: {
    themeMode: 'light',
    themeVariables: {
      '--w3m-z-index': 9999
    },
    explorerRecommendedWalletIds: [
      // 可以添加推荐的钱包 ID
    ]
  }
};

onMounted(() => {
  // 初始化 WalletConnect 适配器
  adapter.value = new WalletConnectAdapter(walletConnectConfig);
  
  // 监听连接状态变化
  adapter.value.on('connect', (address) => {
    console.log('WalletConnect 连接成功:', address);
    address.value = address;
    error.value = null;
  });
  
  adapter.value.on('disconnect', () => {
    console.log('WalletConnect 断开连接');
    address.value = null;
    error.value = null;
  });
  
  adapter.value.on('error', (err) => {
    console.error('WalletConnect 错误:', err);
    error.value = err.message || '连接失败';
  });
});

async function connect() {
  if (isConnecting.value) return;
  
  try {
    isConnecting.value = true;
    error.value = null;
    console.log('开始连接 WalletConnect...');
    
    // 连接钱包
    await adapter.value.connect();
    
    // 获取连接的地址
    if (adapter.value.connected && adapter.value.address) {
      address.value = adapter.value.address;
      console.log('连接成功，地址:', address.value);
    }
  } catch (err) {
    console.error('WalletConnect 连接失败:', err);
    error.value = err.message || '连接失败，请重试';
  } finally {
    isConnecting.value = false;
  }
}

async function disconnect() {
  if (isDisconnecting.value) return;
  
  try {
    isDisconnecting.value = true;
    error.value = null;
    console.log('断开 WalletConnect 连接...');
    
    await adapter.value.disconnect();
    address.value = null;
    
    console.log('断开连接成功');
  } catch (err) {
    console.error('断开连接失败:', err);
    error.value = err.message || '断开连接失败';
  } finally {
    isDisconnecting.value = false;
  }
}

// 移动端触摸事件处理
function handleTouchStart(event) {
  // 防止默认行为，避免双击缩放
  event.preventDefault();
}

function handleTouchEnd(event) {
  // 防止默认行为
  event.preventDefault();
}
</script>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}

.wallet-container {
  padding: 20px;
  text-align: center;
}

.connected-info {
  margin: 20px 0;
}

.address-display {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 8px;
  word-break: break-all;
  font-family: monospace;
  font-size: 14px;
}

.error-message {
  color: #dc3545;
  margin-top: 15px;
  padding: 10px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
}

button {
  margin: 8px;
  padding: 15px 25px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px; /* 移动端友好的最小触摸区域 */
  min-width: 120px;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent; /* 移除iOS点击高亮 */
  touch-action: manipulation; /* 优化触摸响应 */
}

.connect-btn {
  background-color: #28a745;
  font-size: 18px;
  padding: 18px 30px;
}

.disconnect-btn {
  background-color: #dc3545;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.connect-btn:hover {
  background-color: #218838;
}

.disconnect-btn:hover {
  background-color: #c82333;
}

button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.6;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .wallet-container {
    padding: 15px;
  }
  
  button {
    width: 100%;
    max-width: 300px;
    margin: 10px auto;
    display: block;
    font-size: 18px;
    padding: 20px 25px;
    min-height: 56px; /* 更大的触摸区域 */
  }
  
  .address-display {
    font-size: 12px;
    padding: 15px;
  }
  
  .error-message {
    font-size: 14px;
    padding: 15px;
  }
}

/* 防止移动端双击缩放 */
@media (max-width: 768px) {
  * {
    touch-action: manipulation;
  }
}
</style>
