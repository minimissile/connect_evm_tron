<template>
  <div class="tron-wallet-connect-direct">
    <template>
      <div class="walletconnect-container">
        <h2>WalletConnect v3 (支持多链)</h2>

        <!-- 连接状态显示 -->
        <div v-if="!isConnected" class="connection-section">
          <p class="description">
            使用 WalletConnect AppKit v3
            连接您的钱包，支持Tron、Sui、Ethereum等多链
          </p>

          <!-- 使用 AppKit 内置按钮 -->
          <w3m-button />

          <!-- 或者自定义按钮 -->
          <button
            @click="openModal"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
            class="custom-connect-btn"
            :disabled="isConnecting"
          >
            {{ isConnecting ? "连接中..." : "自定义连接按钮" }}
          </button>
        </div>

        <!-- 已连接状态 -->
        <div v-else class="connected-section">
          <div class="wallet-info">
            <h3>钱包已连接</h3>
            <div class="info-item">
              <span class="label">地址:</span>
              <span class="value">{{ address }}</span>
            </div>
            <div class="info-item" v-if="chainId">
              <span class="label">链 ID:</span>
              <span class="value">{{ chainId }}</span>
            </div>
            <div class="info-item" v-if="balance">
              <span class="label">余额:</span>
              <!--              <span class="value">{{ balance }} {{ getCurrencySymbol() }}</span>-->
            </div>
          </div>

          <!--          <div class="action-buttons">-->
          <!--            <button @click="getBalance" class="action-btn">刷新余额</button>-->
          <!--            <button @click="disconnect" class="disconnect-btn">断开连接</button>-->
          <!--          </div>-->
        </div>

        <!-- 错误信息 -->
        <div v-if="error" class="error-message">
          <strong>错误:</strong> {{ error }}
        </div>

        <!-- 网络信息 -->
        <!--        <div v-if="isConnected" class="network-info">-->
        <!--          <h4>支持的网络</h4>-->
        <!--          <div class="networks">-->
        <!--            <span-->
        <!--              v-for="network in supportedNetworks"-->
        <!--              :key="network.id"-->
        <!--              class="network-tag"-->
        <!--            >-->
        <!--              {{ network.name }}-->
        <!--            </span>-->
        <!--          </div>-->
        <!--        </div>-->
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  AppKitNetwork,
  bsc,
  mainnet,
  tron,
  tronShasta,
} from "@reown/appkit/networks";
import { defineChain } from "@reown/appkit/networks";
import UniversalProvider from "@walletconnect/universal-provider";
import { AppKit, createAppKit } from "@reown/appkit/vue";
import { onMounted, ref } from "vue";
import {
  Ethers5Adapter,
  UniversalProviderType,
} from "@reown/appkit-adapter-ethers5";

const polkadot = defineChain({
  id: "91b171bb158e2d3848fa23a9f1c25182",
  name: "Polkadot",
  nativeCurrency: { name: "Polkadot", symbol: "DOT", decimals: 10 },
  rpcUrls: {
    default: {
      http: ["https://rpc.polkadot.io"],
      wss: "wss://rpc.polkadot.io",
    },
  },
  blockExplorers: {
    default: {
      name: "Polkadot Explorer",
      url: "https://polkadot.js.org/apps/",
    },
  },
  chainNamespace: "polkadot",
  caipNetworkId: "polkadot:91b171bb158e2d3848fa23a9f1c25182",
});

// 响应式数据
const isConnected = ref(false);
const isConnecting = ref(false);
const address = ref("");
const chainId = ref(null);
const balance = ref("");
const error = ref("");
// const modal = ref(null);
// const provider = ref(null);

// export const networks = [polkadot] as [AppKitNetwork, ...AppKitNetwork[]];

let provider: UniversalProvider | undefined;
let modal: AppKit | undefined;
// 创建 AppKit 实例
let appKit = null;

const projectId = "c34b3bde7397ea7ed6780e9ce1d5194d";

async function initializeProvider() {
  if (!provider) {
    provider = await UniversalProvider.init({
      projectId,
      // client: 'walletconnect',
      metadata: {
        name: "WalletConnect x Polkadot",
        description: "Tron integration with WalletConnect's Universal Provider",
        url: "https://walletconnect.com/",
        icons: ["https://avatars.githubusercontent.com/u/37784886"],
      },
    });
  }
  return provider;
}

// 打开连接模态框
const openModal = async () => {
  try {
    isConnecting.value = true;
    error.value = "";

    if (appKit) {
      appKit.open();
    }
  } catch (err) {
    console.error("打开模态框失败:", err);
    error.value = "打开连接界面失败: " + err.message;
  } finally {
    isConnecting.value = false;
  }
};

function initializeModal(universalProvider?: UniversalProviderType) {
  if (!modal && universalProvider) {
    modal = createAppKit({
      projectId,
      networks: [polkadot],
      universalProvider,
      manualWCControl: true,
      features: {
        analytics: true, // Optional - defaults to your Cloud configuration
      },
    });
  }
  return modal;
}

onMounted(async () => {
  try {
    // 创建 Ethers5 适配器
    const ethersAdapter = new Ethers5Adapter();

    const dataProvider = await initializeProvider();

    // 创建 AppKit 实例
    appKit = createAppKit({
      projectId,
      networks: [polkadot],
      universalProvider: dataProvider,
      manualWCControl: true,
      features: {
        analytics: true, // Optional - defaults to your Cloud configuration
      },

      // adapters: [ethersAdapter],
      // networks: [polkadot, mainnet, tron, bsc, tronShasta],
      // projectId,
      // metadata: {
      //   name: "WalletConnect v3 Demo with Multi-Chain Support",
      //   description:
      //     "Vue3 WalletConnect AppKit 示例应用，支持Tron、Sui、Ethereum等多链连接",
      //   url: window.location.origin,
      //   icons: [window.location.origin + "/favicon.ico"],
      // },
      // features: {
      //   analytics: true, // 启用分析
      //   email: false, // 禁用邮箱登录
      //   socials: [], // 禁用社交登录
      //   emailShowWallets: true, // 显示钱包选项
      // },
      // themeMode: "light",
      // themeVariables: {
      //   "--w3m-z-index": 9999,
      //   "--w3m-accent": "#007bff",
      // },
      // defaultNetwork: tronMainnet, // 设置Tron为默认网络
    });

    // 监听连接状态变化
    appKit.subscribeState((state) => {
      console.log("AppKit 状态变化:", state);

      if (state.open !== undefined) {
        // 模态框状态变化
        console.log("模态框状态:", state.open ? "打开" : "关闭");
      }

      // if (state.selectedNetworkId !== undefined) {
      //   chainId.value = state.selectedNetworkId;
      //   console.log("网络变化:", state.selectedNetworkId);
      // }
    });

    // 监听账户变化
    appKit.subscribeAccount((account) => {
      console.log("账户状态变化:", account);

      if (account.isConnected) {
        isConnected.value = true;
        address.value = account.address || "";
        chainId.value = account.chainId || null;

        // 获取余额
        // getBalance();

        console.log("钱包已连接:", account.address);
      } else {
        isConnected.value = false;
        address.value = "";
        chainId.value = null;
        balance.value = "";
        console.log("钱包已断开");
      }
    });

    console.log("AppKit 初始化成功");
  } catch (err) {
    console.error("AppKit 初始化失败:", err);
    error.value = "初始化失败: " + err.message;
  }
});

// 移动端触摸事件处理
const handleTouchStart = (event) => {
  event.preventDefault();
};

const handleTouchEnd = (event) => {
  event.preventDefault();
};
</script>

<style scoped>
.walletconnect-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.custom-connect-btn,
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
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.custom-connect-btn {
  background: #007bff;
  color: white;
  margin-top: 15px;
  width: 100%;
  max-width: 300px;
}

.custom-connect-btn:hover {
  background: #0056b3;
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
  background: #dc3545;
  color: white;
}

.disconnect-btn:hover {
  background: #c82333;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
  margin-bottom: 20px;
}

.network-info {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.network-info h4 {
  margin: 0 0 15px 0;
  color: #495057;
}

.networks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.network-tag {
  background: #007bff;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .walletconnect-container {
    padding: 15px;
  }

  .connection-section {
    padding: 20px;
  }

  .connected-section {
    padding: 20px;
  }

  .custom-connect-btn {
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

  .networks {
    justify-content: center;
  }
}

/* AppKit 自定义样式 */
:global(w3m-button) {
  --w3m-accent: #007bff;
  --w3m-border-radius-master: 8px;
}
</style>
