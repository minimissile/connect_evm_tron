<template>
  <div class="walletconnect-container">
    <h2>WalletConnect v3 (支持多链)</h2>

    <!-- 连接状态显示 -->
    <div v-if="!isConnected" class="connection-section">
      <p class="description">
        使用 WalletConnect AppKit v3 连接您的钱包，支持Tron、Sui、Ethereum等多链
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
          <span class="value">{{ balance }} {{ getCurrencySymbol() }}</span>
        </div>
      </div>

      <div class="action-buttons">
        <button @click="getBalance" class="action-btn">刷新余额</button>
        <button @click="disconnect" class="disconnect-btn">断开连接</button>
      </div>

      <!-- 签名和交易 -->
      <div class="actions-container">
        <!-- 签名 -->
        <div class="action-box">
          <h4>签名消息</h4>
          <input
            type="text"
            v-model="signMessageInput"
            placeholder="输入要签名的消息"
            class="action-input"
          />
          <button @click="signMessage" class="action-btn">签名</button>
          <div v-if="signature" class="signature-result">
            <p><strong>签名结果:</strong></p>
            <p class="signature-value">{{ signature }}</p>
          </div>
        </div>

        <!-- 转账 -->
        <div class="action-box">
          <h4>发起交易</h4>
          <input
            type="text"
            v-model="recipientAddress"
            placeholder="接收方地址"
            class="action-input"
          />
          <input
            type="text"
            v-model="transferAmount"
            placeholder="金额"
            class="action-input"
          />
          <button @click="sendTransaction" class="action-btn">发送</button>
          <div v-if="transactionId" class="transaction-result">
            <p><strong>交易ID:</strong></p>
            <p class="transaction-value">{{ transactionId }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-message">
      <strong>错误:</strong> {{ error }}
    </div>

    <!-- 网络信息 -->
    <div v-if="isConnected" class="network-info">
      <h4>支持的网络</h4>
      <div class="networks">
        <span
          v-for="network in supportedNetworks"
          :key="network.id"
          class="network-tag"
        >
          {{ network.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { createAppKit, AppKit } from "@reown/appkit/vue";
import { Ethers5Adapter } from "@reown/appkit-adapter-ethers5";
import {
  mainnet,
  arbitrum,
  polygon,
  optimism,
  base,
  tron,
  tronShasta,
  bsc,
} from "@reown/appkit/networks";
import { ethers } from "ethers";
// import { InferredCaipNetwork } from "@reown/appkit-common";

// Tron 网络配置 - 修复链ID格式
const tronMainnet = {
  id: "0x2b6653dc",
  name: "Tron",
  currency: "TRX",
  explorerUrl: "https://tronscan.org",
  rpcUrl: "https://api.trongrid.io",
  chainNamespace: "tron",
};

// const tronShasta = {
//   id: "0x94a9059e",
//   name: "Tron Shasta Testnet",
//   currency: "TRX",
//   explorerUrl: "https://shasta.tronscan.org",
//   rpcUrl: "https://api.shasta.trongrid.io",
//   chainNamespace: "tron",
// };

const sui = {
  id: 784,
  chainNamespace: "sui",
  caipNetworkId: "sui:mainnet",
  name: "Sui",
  nativeCurrency: { name: "SUI", symbol: "SUI", decimals: 9 },
  rpcUrls: { default: { http: ["https://fullnode.mainnet.sui.io:443"] } },
};

// 响应式数据
const isConnected = ref(false);
const isConnecting = ref(false);
const address = ref("");
const chainId = ref(null);
const balance = ref("");
const error = ref("");
const modal = ref(null);
const provider = ref(null);

// 签名和交易
const signMessageInput = ref("Hello WalletConnect");
const signature = ref("");
const recipientAddress = ref("");
const transferAmount = ref("");
const transactionId = ref("");

// 支持的网络
const supportedNetworks = [
  { id: 1, name: "Ethereum" },
  { id: 137, name: "Polygon" },
  { id: 42161, name: "Arbitrum" },
  { id: 10, name: "Optimism" },
  { id: 8453, name: "Base" },
  { id: 56, name: "Bsc" },
  { id: "0x2b6653dc", name: "Tron" },
  { id: "0x94a9059e", name: "Tron Shasta" },
  { id: 784, name: "Sui" },
];

// WalletConnect 项目 ID (需要从 https://dashboard.reown.com 获取)
const projectId = "c34b3bde7397ea7ed6780e9ce1d5194d";

// 创建 AppKit 实例
let appKit = null;

onMounted(async () => {
  try {
    // 创建 Ethers5 适配器
    const ethersAdapter = new Ethers5Adapter();

    // 创建 AppKit 实例
    appKit = createAppKit({
      adapters: [ethersAdapter],
      networks: [
        mainnet,
        // arbitrum,
        // polygon,
        // optimism,
        // base,
        tron,
        bsc,
        sui,
        tronMainnet,
        tronShasta,
      ],
      projectId,
      metadata: {
        name: "WalletConnect v3 Demo with Multi-Chain Support",
        description:
          "Vue3 WalletConnect AppKit 示例应用，支持Tron、Sui、Ethereum等多链连接",
        url: window.location.origin,
        icons: [window.location.origin + "/favicon.ico"],
      },
      features: {
        analytics: true, // 启用分析
        email: false, // 禁用邮箱登录
        socials: [], // 禁用社交登录
        emailShowWallets: true, // 显示钱包选项
      },
      themeMode: "light",
      themeVariables: {
        "--w3m-z-index": 9999,
        "--w3m-accent": "#007bff",
      },
      defaultNetwork: tronMainnet, // 设置Tron为默认网络
    });

    // 监听连接状态变化
    appKit.subscribeState((state) => {
      console.log("AppKit 状态变化:", state);

      if (state.open !== undefined) {
        // 模态框状态变化
        console.log("模态框状态:", state.open ? "打开" : "关闭");
      }

      if (state.selectedNetworkId !== undefined) {
        chainId.value = state.selectedNetworkId;
        console.log("网络变化:", state.selectedNetworkId);
      }
    });

    // 监听账户变化
    appKit.subscribeAccount((account) => {
      console.log("账户状态变化:", account);

      if (account.isConnected) {
        isConnected.value = true;
        address.value = account.address || "";
        chainId.value = account.chainId || null;

        // 获取余额
        getBalance();

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

onUnmounted(() => {
  // 清理资源
  if (appKit) {
    // AppKit 会自动处理清理
  }
});

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

// 断开连接
const disconnect = async () => {
  try {
    if (appKit) {
      await appKit.disconnect();
    }
  } catch (err) {
    console.error("断开连接失败:", err);
    error.value = "断开连接失败: " + err.message;
  }
};

// 获取余额
const getBalance = async () => {
  try {
    if (!address.value || !appKit) return;

    // 检查是否为Tron链
    const isTronChain =
      chainId.value &&
      (chainId.value === "0x2b6653dc" ||
        chainId.value === "0x94a9059e" ||
        chainId.value.toString().includes("tron"));

    // 检查是否为Sui链
    const isSuiChain =
      chainId.value &&
      (chainId.value === 784 ||
        chainId.value === "784" ||
        chainId.value.toString().includes("sui"));

    if (isTronChain) {
      // Tron链余额获取
      try {
        // 使用TronWeb获取余额
        if (window.tronWeb && window.tronWeb.ready) {
          const balanceSun = await window.tronWeb.trx.getBalance(address.value);
          balance.value = (balanceSun / 1000000).toFixed(6); // 转换为TRX
        } else {
          // 备用方案：使用Tron API
          const response = await fetch(
            `https://api.trongrid.io/v1/accounts/${address.value}`,
          );
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const balanceSun = data.data[0].balance || 0;
            balance.value = (balanceSun / 1000000).toFixed(6);
          }
        }
      } catch (tronError) {
        console.error("获取Tron余额失败:", tronError);
        balance.value = "0.000000";
      }
    } else if (isSuiChain) {
      // Sui链余额获取
      try {
        // 使用Sui RPC API获取余额
        const response = await fetch("https://fullnode.mainnet.sui.io:443", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "suix_getBalance",
            params: [address.value],
          }),
        });
        const data = await response.json();
        if (data.result && data.result.totalBalance) {
          // Sui使用9位小数，转换为SUI
          const balanceMist = parseInt(data.result.totalBalance);
          balance.value = (balanceMist / 1000000000).toFixed(6);
        } else {
          balance.value = "0.000000";
        }
      } catch (suiError) {
        console.error("获取Sui余额失败:", suiError);
        balance.value = "0.000000";
      }
    } else {
      // 以太坊及其他EVM链余额获取
      const walletProvider = appKit.getWalletProvider();
      if (walletProvider) {
        const ethersProvider = new ethers.providers.Web3Provider(
          walletProvider,
        );
        const balanceWei = await ethersProvider.getBalance(address.value);
        balance.value = ethers.utils.formatEther(balanceWei);
      }
    }
  } catch (err) {
    console.error("获取余额失败:", err);
    error.value = "获取余额失败: " + err.message;
  }
};

// 获取当前链的货币符号
const getCurrencySymbol = () => {
  if (!chainId.value) return "ETH";

  // Tron 链
  if (
    chainId.value === "0x2b6653dc" ||
    chainId.value === "0x94a9059e" ||
    chainId.value.toString().includes("tron")
  ) {
    return "TRX";
  }

  // Sui 链
  if (
    chainId.value === 784 ||
    chainId.value === "784" ||
    chainId.value.toString().includes("sui")
  ) {
    return "SUI";
  }

  // 其他链默认返回 ETH
  switch (chainId.value) {
    case 137:
      return "MATIC"; // Polygon
    case 42161:
      return "ETH"; // Arbitrum
    case 10:
      return "ETH"; // Optimism
    case 8453:
      return "ETH"; // Base
    case 56:
      return "BNB"; // BSC
    default:
      return "ETH";
  }
};

// 移动端触摸事件处理
const handleTouchStart = (event) => {
  event.preventDefault();
};

const handleTouchEnd = (event) => {
  event.preventDefault();
};

// 签名消息
const signMessage = async () => {
  try {
    if (!appKit || !address.value) return;
    signature.value = "";
    error.value = "";

    const walletProvider = appKit.getWalletProvider();
    if (!walletProvider) {
      throw new Error("Wallet provider not available");
    }

    const message = signMessageInput.value;

    // 检查是否为Tron链
    const isTronChain =
      chainId.value &&
      (chainId.value === "0x2b6653dc" ||
        chainId.value === "0x94a9059e" ||
        chainId.value.toString().includes("tron"));

    if (isTronChain) {
      // Tron 签名
      if (window.tronWeb && window.tronWeb.ready) {
        const hexMessage = window.tronWeb.toHex(message);
        const signedMessage = await window.tronWeb.trx.sign(hexMessage);
        signature.value = signedMessage;
      } else {
        throw new Error("TronWeb not available");
      }
    } else {
      // EVM 签名
      const ethersProvider = new ethers.providers.Web3Provider(walletProvider);
      const signer = ethersProvider.getSigner();
      const signedMessage = await signer.signMessage(message);
      signature.value = signedMessage;
    }
  } catch (err) {
    console.error("签名失败:", err);
    error.value = "签名失败: " + err.message;
  }
};

// 发送交易
const sendTransaction = async () => {
  try {
    if (!appKit || !address.value) return;
    transactionId.value = "";
    error.value = "";

    const walletProvider = appKit.getWalletProvider();
    if (!walletProvider) {
      throw new Error("Wallet provider not available");
    }

    const recipient = recipientAddress.value;
    const amount = transferAmount.value;

    // 检查是否为Tron链
    const isTronChain =
      chainId.value &&
      (chainId.value === "0x2b6653dc" ||
        chainId.value === "0x94a9059e" ||
        chainId.value.toString().includes("tron"));

    if (isTronChain) {
      // Tron 转账
      if (window.tronWeb && window.tronWeb.ready) {
        const tradeobj = await window.tronWeb.transactionBuilder.sendTrx(
          recipient,
          window.tronWeb.toSun(amount),
          address.value,
        );
        const signedTx = await window.tronWeb.trx.sign(tradeobj);
        const receipt = await window.tronWeb.trx.sendRawTransaction(signedTx);
        transactionId.value = receipt.txid;
      } else {
        throw new Error("TronWeb not available");
      }
    } else {
      // EVM 转账
      const ethersProvider = new ethers.providers.Web3Provider(walletProvider);
      const signer = ethersProvider.getSigner();
      const tx = await signer.sendTransaction({
        to: recipient,
        value: ethers.utils.parseEther(amount),
      });
      transactionId.value = tx.hash;
    }
  } catch (err) {
    console.error("交易失败:", err);
    error.value = "交易失败: " + err.message;
  }
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

/* 签名和交易容器 */
.actions-container {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-box {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-box h4 {
  margin: 0 0 15px 0;
  color: white;
  font-size: 18px;
}

.action-input {
  width: 100%;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
}

.action-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.signature-result,
.transaction-result {
  margin-top: 15px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.signature-value,
.transaction-value {
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
  margin-top: 5px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.9);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .action-box {
    padding: 15px;
  }

  .action-input {
    font-size: 16px;
    padding: 14px;
  }

  .signature-value,
  .transaction-value {
    font-size: 11px;
  }
}
</style>