<template>
  <div class="walletconnect-container">
    <h2>WalletConnect v3</h2>

    <!-- 连接状态显示 -->
    <div v-if="!isConnected" class="connection-section">
      <p class="description">
        使用 WalletConnect AppKit v3 连接您的钱包，支持Tron、Ethereum等多链
      </p>

      <!-- 使用 AppKit 内置按钮 -->
      <!--      <w3m-button />-->

      <!-- 或者自定义按钮 -->
      <button
        @click="appKit.open()"
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

      <!-- 功能测试区域 -->
      <div class="test-section">
        <h4>功能测试</h4>

        <!-- 签名测试 -->
        <div class="test-group">
          <h5>消息签名测试</h5>
          <div class="input-group">
            <input
              v-model="signMessage"
              type="text"
              placeholder="输入要签名的消息"
              class="test-input"
            />
            <button
              @click="testSignMessage"
              class="test-btn"
              :disabled="!signMessage.trim()"
            >
              签名消息
            </button>
          </div>
          <div v-if="signatureResult" class="result-box">
            <strong>签名结果:</strong>
            <div class="signature-result">{{ signatureResult }}</div>
          </div>
        </div>

        <!-- 转账测试 -->
        <div class="test-group">
          <h5>转账测试</h5>
          <div class="transfer-form">
            <div class="input-group">
              <input
                v-model="transferTo"
                type="text"
                placeholder="接收地址"
                class="test-input"
              />
            </div>
            <div class="input-group">
              <input
                v-model="transferAmount"
                type="number"
                step="0.000001"
                placeholder="转账金额"
                class="test-input"
              />
            </div>
            <button
              @click="testTransfer"
              class="test-btn transfer-btn"
              :disabled="
                !transferTo.trim() ||
                !transferAmount ||
                parseFloat(transferAmount) <= 0
              "
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
    <div v-if="error" class="error-message">
      <strong>错误:</strong> {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { createAppKit } from "@reown/appkit/vue";
import { Ethers5Adapter } from "@reown/appkit-adapter-ethers5";
import { mainnet, bsc } from "@reown/appkit/networks";
import { ethers } from "ethers";

// Tron 网络配置 - 修复链ID格式
const tronMainnet = {
  id: "0x2b6653dc",
  name: "Tron",
  currency: "TRX",
  explorerUrl: "https://tronscan.org",
  rpcUrl: "https://api.trongrid.io",
  chainNamespace: "tron",
};

const tronShasta = {
  id: "0x94a9059e",
  name: "Tron Shasta Testnet",
  currency: "TRX",
  explorerUrl: "https://shasta.tronscan.org",
  rpcUrl: "https://api.shasta.trongrid.io",
  chainNamespace: "tron",
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

// 测试功能相关数据
const signMessage = ref("Hello WalletConnect!");
const signatureResult = ref("");
const transferTo = ref("");
const transferAmount = ref("");
const transferResult = ref("");

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
      projectId,
      adapters: [ethersAdapter],
      networks: [mainnet, bsc],
      metadata: {
        name: "WalletConnect v3 Demo",
        description: "Vue3 WalletConnect AppKit 示例应用，支持Tron链连接",
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
      defaultNetwork: bsc, // 设置Tron为默认网络
    });

    // 监听连接状态变化
    appKit.subscribeState((state) => {
      console.log("AppKit 状态变化:", state);

      if (state.open !== undefined) {
        // 模态框状态变化
        console.log("模态框状态:", state.open ? "打开" : "关闭");

        // 如果模态框关闭且没有连接成功，重置连接状态
        if (!state.open && !isConnected.value) {
          isConnecting.value = false;
          console.log("模态框关闭，重置连接状态");
        }
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
        isConnecting.value = false; // 连接成功，重置连接状态
        address.value = account.address || "";
        chainId.value = account.chainId || null;
        error.value = ""; // 清除错误信息

        // 获取余额
        getBalance();

        console.log("钱包已连接:", account.address);
      } else {
        isConnected.value = false;
        isConnecting.value = false; // 断开连接，重置连接状态
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
    if (appKit) {
      await appKit.disconnect();
      appKit.open();
    }
  } catch (err) {
    console.error("打开模态框失败:", err);
    error.value = "打开连接界面失败: " + err.message;
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
    default:
      return "ETH";
  }
};

// 测试签名功能
const testSignMessage = async () => {
  try {
    signatureResult.value = "";
    error.value = "";

    if (!address.value || !appKit) {
      error.value = "请先连接钱包";
      return;
    }

    const message = signMessage.value.trim();
    if (!message) {
      error.value = "请输入要签名的消息";
      return;
    }

    // 检查是否为Tron链
    const isTronChain =
      chainId.value &&
      (chainId.value === "0x2b6653dc" ||
        chainId.value === "0x94a9059e" ||
        chainId.value.toString().includes("tron"));

    if (isTronChain) {
      // Tron链签名
      if (window.tronWeb && window.tronWeb.ready) {
        const signature = await window.tronWeb.trx.sign(message);
        signatureResult.value = signature;
      } else {
        error.value = "TronWeb 未就绪，请确保使用支持Tron的钱包";
      }
    } else {
      // EVM链签名
      const walletProvider = appKit.getWalletProvider();
      if (walletProvider) {
        const ethersProvider = new ethers.providers.Web3Provider(
          walletProvider,
        );
        const signer = ethersProvider.getSigner();
        const signature = await signer.signMessage(message);
        signatureResult.value = signature;
      } else {
        error.value = "无法获取钱包提供者";
      }
    }

    console.log("签名成功:", signatureResult.value);
  } catch (err) {
    console.error("签名失败:", err);
    error.value = "签名失败: " + err.message;
  }
};

// 测试转账功能
const testTransfer = async () => {
  try {
    transferResult.value = "";
    error.value = "";

    if (!address.value || !appKit) {
      error.value = "请先连接钱包";
      return;
    }

    const toAddress = transferTo.value.trim();
    const amount = transferAmount.value;

    if (!toAddress || !amount || parseFloat(amount) <= 0) {
      error.value = "请输入有效的接收地址和转账金额";
      return;
    }

    // 检查是否为Tron链
    const isTronChain =
      chainId.value &&
      (chainId.value === "0x2b6653dc" ||
        chainId.value === "0x94a9059e" ||
        chainId.value.toString().includes("tron"));

    if (isTronChain) {
      // Tron链转账
      if (window.tronWeb && window.tronWeb.ready) {
        const amountSun = window.tronWeb.toSun(amount); // 转换为Sun单位
        const transaction = await window.tronWeb.transactionBuilder.sendTrx(
          toAddress,
          amountSun,
          address.value,
        );
        const signedTx = await window.tronWeb.trx.sign(transaction);
        const result = await window.tronWeb.trx.sendRawTransaction(signedTx);

        if (result.result) {
          transferResult.value = `转账成功! 交易哈希: ${result.txid}`;
          // 刷新余额
          setTimeout(() => getBalance(), 2000);
        } else {
          error.value = "Tron转账失败: " + (result.message || "未知错误");
        }
      } else {
        error.value = "TronWeb 未就绪，请确保使用支持Tron的钱包";
      }
    } else {
      // EVM链转账
      const walletProvider = appKit.getWalletProvider();
      if (walletProvider) {
        const ethersProvider = new ethers.providers.Web3Provider(
          walletProvider,
        );
        const signer = ethersProvider.getSigner();

        const tx = {
          to: toAddress,
          value: ethers.utils.parseEther(amount.toString()),
          gasLimit: 21000,
        };

        const transaction = await signer.sendTransaction(tx);
        transferResult.value = `转账已发送! 交易哈希: ${transaction.hash}`;

        // 等待交易确认
        const receipt = await transaction.wait();
        transferResult.value = `转账成功! 交易哈希: ${transaction.hash} (已确认)`;

        // 刷新余额
        setTimeout(() => getBalance(), 2000);
      } else {
        error.value = "无法获取钱包提供者";
      }
    }

    console.log("转账操作完成:", transferResult.value);
  } catch (err) {
    console.error("转账失败:", err);
    error.value = "转账失败: " + err.message;
  }
};

// 移动端触摸事件处理
let touchStartTime = 0;
let touchMoved = false;
let touchHandled = false;

const handleTouchStart = (event) => {
  console.log("触摸开始");
  touchStartTime = Date.now();
  touchMoved = false;
  touchHandled = false;

  // 添加触摸反馈效果
  event.target.style.transform = "scale(0.98)";
  event.target.style.opacity = "0.8";

  // 重置触摸状态的定时器
  setTimeout(() => {
    touchHandled = false;
  }, 1000);
};

const handleTouchEnd = (event) => {
  console.log("触摸结束");
  const touchEndTime = Date.now();
  const touchDuration = touchEndTime - touchStartTime;

  // 恢复按钮样式
  event.target.style.transform = "";
  event.target.style.opacity = "";

  // 如果是快速点击且没有移动，且没有被处理过，则触发点击事件
  if (
    touchDuration < 500 &&
    !touchMoved &&
    !isConnecting.value &&
    !touchHandled
  ) {
    touchHandled = true;
    console.log("触摸触发连接");
    // 阻止后续的点击事件
    event.preventDefault();
    event.stopPropagation();
    openModal();
  }
};

// 处理触摸移动事件
const handleTouchMove = (event) => {
  touchMoved = true;
  console.log("触摸移动，取消点击");
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
  position: relative;
  overflow: hidden;
}

.custom-connect-btn:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.custom-connect-btn:active {
  transform: scale(0.98);
  background: #004085;
}

/* 移动端触摸优化 */
.custom-connect-btn {
  -webkit-tap-highlight-color: rgba(0, 123, 255, 0.3);
  tap-highlight-color: rgba(0, 123, 255, 0.3);
}

/* 添加触摸反馈动画 */
.custom-connect-btn::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition:
    width 0.3s ease,
    height 0.3s ease;
  pointer-events: none;
}

.custom-connect-btn:active::before {
  width: 300px;
  height: 300px;
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
    /* 增强移动端触摸区域 */
    min-width: 280px;
    border: 2px solid transparent;
  }

  .custom-connect-btn:active {
    transform: scale(0.95);
    border-color: rgba(255, 255, 255, 0.3);
  }

  /* 移动端特殊处理 */
  @supports (-webkit-touch-callout: none) {
    .custom-connect-btn {
      -webkit-appearance: none;
      -webkit-user-select: none;
      user-select: none;
    }
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

/* 测试功能样式 */
.test-section {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.test-section h4 {
  margin: 0 0 20px 0;
  color: white;
  text-align: center;
  font-size: 18px;
}

.test-group {
  margin-bottom: 25px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.test-group h5 {
  margin: 0 0 15px 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 600;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.test-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  min-height: 40px;
}

.test-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.test-input:focus {
  outline: none;
  border-color: #007bff;
  background: rgba(255, 255, 255, 0.15);
}

.test-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: #007bff;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 40px;
  white-space: nowrap;
}

.test-btn:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.transfer-btn {
  background: #28a745;
  width: 100%;
  margin-top: 10px;
}

.transfer-btn:hover:not(:disabled) {
  background: #1e7e34;
}

.transfer-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-box {
  margin-top: 15px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.result-box strong {
  color: rgba(255, 255, 255, 0.9);
  display: block;
  margin-bottom: 8px;
}

.signature-result,
.transfer-result {
  font-family: monospace;
  font-size: 12px;
  color: #90ee90;
  word-break: break-all;
  line-height: 1.4;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 4px;
  border: 1px solid rgba(144, 238, 144, 0.3);
}

/* 移动端测试功能优化 */
@media (max-width: 768px) {
  .test-section {
    padding: 15px;
  }

  .test-group {
    padding: 12px;
  }

  .input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .test-input {
    margin-bottom: 10px;
  }

  .test-btn {
    width: 100%;
    min-height: 48px;
  }

  .signature-result,
  .transfer-result {
    font-size: 11px;
  }
}

/* AppKit 自定义样式 */
:global(w3m-button) {
  --w3m-accent: #007bff;
  --w3m-border-radius-master: 8px;
}
</style>
