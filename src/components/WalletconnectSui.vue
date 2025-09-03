<template>
  <div class="walletconnect-sui-container">
    <h2>WalletConnect Universal Provider + Sui</h2>

    <!-- 连接状态显示 -->
    <div v-if="!address" class="connection-section">
      <p class="description">
        使用 WalletConnect Universal Provider 连接Sui钱包
      </p>

      <button
        @click="connectWallet"
        class="connect-btn"
        :disabled="isConnecting"
      >
        {{ isConnecting ? "连接中..." : "连接Sui钱包" }}
      </button>
    </div>

    <!-- 已连接状态 -->
    <div v-else class="connected-section">
      <div class="wallet-info">
        <h3>Sui钱包已连接</h3>
        <div class="info-item">
          <span class="label">地址:</span>
          <span class="value">{{ address }}</span>
        </div>
        <div class="info-item" v-if="balance">
          <span class="label">余额:</span>
          <span class="value">{{ balance }} SUI</span>
        </div>
        <div class="info-item" v-if="session">
          <span class="label">会话状态:</span>
          <span class="value">已连接</span>
        </div>
      </div>

      <div class="action-buttons">
        <button @click="getBalance" class="action-btn">刷新余额</button>
        <button @click="disconnect" class="disconnect-btn">断开连接</button>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-message">
      <strong>错误:</strong> {{ error }}
    </div>

    <!-- 调试信息 -->
    <div v-if="session" class="debug-info">
      <h4>调试信息</h4>
      <pre>{{ JSON.stringify(session, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import UniversalProvider from "@walletconnect/universal-provider";
import { createAppKit } from "@reown/appkit/core";

// 响应式数据
const provider = ref(null);
const modal = ref(null);
const address = ref("");
const session = ref(null);
const balance = ref("");
const error = ref("");
const isConnecting = ref(false);

// 项目配置
const projectId = "c34b3bde7397ea7ed6780e9ce1d5194d";

// Sui网络配置
const sui = {
  id: 784,
  chainNamespace: "sui",
  caipNetworkId: "sui:mainnet",
  name: "Sui",
  nativeCurrency: { name: "SUI", symbol: "SUI", decimals: 9 },
  rpcUrls: { default: { http: ["https://fullnode.mainnet.sui.io:443"] } }
};

const networks = [sui];

// 初始化Provider
const initializeProvider = async () => {
  if (!provider.value) {
    try {
      provider.value = await UniversalProvider.init({
        projectId,
        metadata: {
          name: "WalletConnect x Sui",
          description: "Sui integration with WalletConnect's Universal Provider",
          url: window.location.origin,
          icons: [window.location.origin + "/favicon.ico"],
        }
      });
      
      console.log("UniversalProvider initialized:", provider.value);
      
      // 检查是否有现有会话
      if (provider.value.session) {
        console.log("Existing session found:", provider.value.session);
        session.value = provider.value.session;
        updateAddressFromSession();
      }
    } catch (err) {
      console.error("Provider initialization failed:", err);
      error.value = "初始化Provider失败: " + err.message;
    }
  }
  return provider.value;
};

// 初始化Modal
const initializeModal = (universalProvider) => {
  if (!modal.value && universalProvider) {
    try {
      modal.value = createAppKit({
        projectId,
        networks,
        universalProvider: universalProvider,
        manualWCControl: true,
        features: {
          analytics: true
        }
      });
      console.log("AppKit modal initialized:", modal.value);
    } catch (err) {
      console.error("Modal initialization failed:", err);
      error.value = "初始化Modal失败: " + err.message;
    }
  }
  return modal.value;
};

// 从会话中更新地址
const updateAddressFromSession = () => {
  if (session.value?.namespaces?.sui?.accounts?.[0]) {
    const account = session.value.namespaces.sui.accounts[0];
    address.value = account.split(':')[2] || account;
    console.log("Address updated:", address.value);
  }
};

// 连接钱包
const connectWallet = async () => {
  try {
    isConnecting.value = true;
    error.value = "";
    
    const dataProvider = await initializeProvider();
    if (!dataProvider) {
      throw new Error("Provider initialization failed");
    }
    
    // 初始化modal
    const modalInstance = initializeModal(dataProvider);
    
    // 连接到Sui链
    const result = await dataProvider.connect({
      namespaces: {
        sui: {
          methods: [
            "sui_getBalance",
            "sui_signAndExecuteTransactionBlock",
            "sui_signTransactionBlock",
            "sui_signMessage"
          ],
          chains: ["sui:mainnet"],
          events: ["accountsChanged", "chainChanged"]
        }
      }
    });
    
    console.log("Connection result:", result);
    session.value = result;
    updateAddressFromSession();
    
    // 关闭modal
    if (modalInstance) {
      await modalInstance.close();
    }
    
    // 获取余额
    await getBalance();
    
  } catch (err) {
    console.error("Connection failed:", err);
    error.value = "连接失败: " + err.message;
  } finally {
    isConnecting.value = false;
  }
};

// 断开连接
const disconnect = async () => {
  try {
    if (provider.value && session.value) {
      await provider.value.disconnect();
      session.value = null;
      address.value = "";
      balance.value = "";
      console.log("Disconnected successfully");
    }
  } catch (err) {
    console.error("Disconnect failed:", err);
    error.value = "断开连接失败: " + err.message;
  }
};

// 获取余额
const getBalance = async () => {
  try {
    if (!address.value || !provider.value) return;
    
    // 使用Sui RPC API获取余额
    const response = await fetch('https://fullnode.mainnet.sui.io:443', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getBalance',
        params: [address.value]
      })
    });
    
    const data = await response.json();
    if (data.result && data.result.totalBalance) {
      // Sui使用9位小数，转换为SUI
      const balanceMist = parseInt(data.result.totalBalance);
      balance.value = (balanceMist / 1000000000).toFixed(6);
    } else {
      balance.value = "0.000000";
    }
  } catch (err) {
    console.error("获取余额失败:", err);
    error.value = "获取余额失败: " + err.message;
  }
};

// 设置事件监听器
const setupEventListeners = () => {
  if (!provider.value) return;
  
  // 监听display_uri事件
  const handleDisplayUri = (uri) => {
    console.log("Display URI:", uri);
    const modalInstance = initializeModal(provider.value);
    if (modalInstance) {
      modalInstance.open({ uri, view: 'ConnectingWalletConnectBasic' });
    }
  };
  
  // 监听connect事件
  const handleConnect = async (sessionData) => {
    console.log("Connected:", sessionData);
    session.value = sessionData.session || sessionData;
    updateAddressFromSession();
    
    const modalInstance = initializeModal(provider.value);
    if (modalInstance) {
      await modalInstance.close();
    }
    
    await getBalance();
  };
  
  // 监听disconnect事件
  const handleDisconnect = () => {
    console.log("Disconnected");
    session.value = null;
    address.value = "";
    balance.value = "";
  };
  
  provider.value.on('display_uri', handleDisplayUri);
  provider.value.on('connect', handleConnect);
  provider.value.on('disconnect', handleDisconnect);
  
  // 返回清理函数
  return () => {
    if (provider.value) {
      provider.value.removeListener('display_uri', handleDisplayUri);
      provider.value.removeListener('connect', handleConnect);
      provider.value.removeListener('disconnect', handleDisconnect);
    }
  };
};

onMounted(async () => {
  try {
    await initializeProvider();
    const cleanup = setupEventListeners();
    
    // 保存清理函数
    onUnmounted(() => {
      if (cleanup) cleanup();
    });
  } catch (err) {
    console.error("Component initialization failed:", err);
    error.value = "组件初始化失败: " + err.message;
  }
});
</script>

<style scoped>
.walletconnect-sui-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.description {
  text-align: center;
  color: #666;
  margin-bottom: 20px;
  font-size: 16px;
}

.connection-section {
  text-align: center;
  padding: 30px;
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  margin-bottom: 20px;
}

.connected-section {
  background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
  color: white;
  padding: 25px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.wallet-info h3 {
  margin: 0 0 20px 0;
  text-align: center;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.label {
  font-weight: 600;
  opacity: 0.9;
}

.value {
  font-family: monospace;
  word-break: break-all;
  text-align: right;
  max-width: 60%;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: center;
}

.connect-btn,
.action-btn,
.disconnect-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
}

.connect-btn {
  background: #29b6f6;
  color: white;
  width: 100%;
  max-width: 300px;
}

.connect-btn:hover {
  background: #0288d1;
  transform: translateY(-1px);
}

.action-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.disconnect-btn {
  background: #f44336;
  color: white;
}

.disconnect-btn:hover {
  background: #d32f2f;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #ffcdd2;
  margin-bottom: 20px;
}

.debug-info {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.debug-info h4 {
  margin: 0 0 10px 0;
  color: #666;
}

.debug-info pre {
  background: #fff;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .walletconnect-sui-container {
    padding: 15px;
  }

  .connection-section {
    padding: 20px;
  }

  .connected-section {
    padding: 20px;
  }

  .connect-btn {
    font-size: 18px;
    padding: 16px 24px;
    min-height: 56px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-btn,
  .disconnect-btn {
    width: 100%;
    min-height: 52px;
  }

  .value {
    font-size: 14px;
    max-width: 50%;
  }
}
</style>