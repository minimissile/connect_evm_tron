<template>
  <div class="tron-wallet-vue-ui">
    <h2>TronWallet Vue UI 组件演示</h2>
    <p class="description">
      使用 @tronweb3/tronwallet-adapter-vue-ui 提供的开箱即用组件
    </p>

    <!-- 钱包提供者包装器 -->
    <WalletProvider @error="onError">
      <WalletModalProvider>
        <!-- 主要功能区域 -->
        <div class="main-content">
          <!-- 钱包操作按钮 -->
          <div class="wallet-actions">
            <h3>钱包操作</h3>
            <div class="button-group">
              <!-- 多功能钱包按钮 -->
              <WalletActionButton class="action-button" />

              <!-- 分离的操作按钮 -->
              <div class="separate-buttons">
                <WalletSelectButton class="select-button">
                  选择钱包
                </WalletSelectButton>
                <WalletConnectButton class="connect-button">
                  连接钱包
                </WalletConnectButton>
                <WalletDisconnectButton class="disconnect-button">
                  断开连接
                </WalletDisconnectButton>
              </div>
            </div>
          </div>

          <!-- 钱包信息显示 -->
          <div class="wallet-info">
            <h3>钱包信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">连接状态:</span>
                <span
                  class="value"
                  :class="{ connected: connected, disconnected: !connected }"
                >
                  {{ connected ? "已连接" : "未连接" }}
                </span>
              </div>
              <div class="info-item" v-if="wallet">
                <span class="label">当前钱包:</span>
                <span class="value">{{ wallet.adapter.name }}</span>
              </div>
              <div class="info-item" v-if="publicKey">
                <span class="label">钱包地址:</span>
                <span class="value address">{{ publicKey }}</span>
              </div>
              <div class="info-item" v-if="connected">
                <span class="label">余额:</span>
                <span class="value">{{ balance }} TRX</span>
                <button @click="refreshBalance" class="refresh-btn">
                  刷新
                </button>
              </div>
            </div>
          </div>

          <!-- 功能测试区域 -->
          <div v-if="connected" class="feature-tests">
            <h3>功能测试</h3>

            <!-- 签名测试 -->
            <div class="test-section">
              <h4>消息签名</h4>
              <div class="sign-form">
                <input
                  v-model="messageToSign"
                  type="text"
                  placeholder="输入要签名的消息"
                  class="message-input"
                />
                <button
                  @click="signMessage"
                  :disabled="!messageToSign"
                  class="sign-btn"
                >
                  签名消息
                </button>
              </div>
              <div v-if="signedMessage" class="signed-result">
                <h5>签名结果:</h5>
                <pre>{{ signedMessage }}</pre>
              </div>
            </div>

            <!-- 交易测试 -->
            <div class="test-section">
              <h4>发送交易</h4>
              <div class="transaction-form">
                <input
                  v-model="recipientAddress"
                  type="text"
                  placeholder="接收地址"
                  class="address-input"
                />
                <input
                  v-model="transferAmount"
                  type="number"
                  placeholder="转账金额 (TRX)"
                  class="amount-input"
                  step="0.000001"
                  min="0"
                />
                <button
                  @click="sendTransaction"
                  :disabled="!recipientAddress || !transferAmount"
                  class="send-btn"
                >
                  发送交易
                </button>
              </div>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="error" class="error-section">
            <h3>错误信息</h3>
            <p class="error-message">{{ error }}</p>
            <button @click="clearError" class="clear-error-btn">
              清除错误
            </button>
          </div>

          <!-- 事件日志 -->
          <div class="event-logs">
            <h3>事件日志</h3>
            <div class="logs-container">
              <div
                v-for="(log, index) in eventLogs"
                :key="index"
                class="log-item"
              >
                <span class="log-time">{{ log.time }}</span>
                <span class="log-type" :class="log.type">{{ log.type }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
            <button @click="clearLogs" class="clear-logs-btn">清空日志</button>
          </div>
        </div>
      </WalletModalProvider>
    </WalletProvider>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  useWallet,
  WalletProvider,
} from "@tronweb3/tronwallet-adapter-vue-hooks";
import {
  WalletModalProvider,
  WalletActionButton,
  WalletSelectButton,
  WalletConnectButton,
  WalletDisconnectButton,
} from "@tronweb3/tronwallet-adapter-vue-ui";
import {
  WalletDisconnectedError,
  WalletError,
  WalletNotFoundError,
} from "@tronweb3/tronwallet-abstract-adapter";

// 导入样式
// import '@tronweb3/tronwallet-adapter-vue-ui/style.css'

// 响应式数据
const balance = ref("0");
const error = ref("");
const eventLogs = ref([]);
const messageToSign = ref("Hello TronWallet Vue UI!");
const signedMessage = ref("");
const recipientAddress = ref("");
const transferAmount = ref("");

// 使用钱包 hooks
const {
  wallet,
  connected,
  publicKey,
  signMessage: walletSignMessage,
  sendTransaction: walletSendTransaction,
} = useWallet();

// 计算属性
const walletName = computed(() => wallet.value?.adapter?.name || "未选择");

// 生命周期
onMounted(() => {
  addLog("info", "TronWallet Vue UI 组件已加载");

  // 如果已连接，获取余额
  if (connected.value) {
    refreshBalance();
  }
});

// 方法定义
function onError(e) {
  let errorMessage = "";

  if (e instanceof WalletNotFoundError) {
    errorMessage = `钱包未找到: ${e.message}`;
    addLog("error", errorMessage);
  } else if (e instanceof WalletDisconnectedError) {
    errorMessage = `钱包已断开: ${e.message}`;
    addLog("error", errorMessage);
  } else if (e instanceof WalletError) {
    errorMessage = `钱包错误: ${e.message}`;
    addLog("error", errorMessage);
  } else {
    errorMessage = `未知错误: ${e.message || e}`;
    addLog("error", errorMessage);
  }

  error.value = errorMessage;
  console.error("Wallet Error:", e);
}

// 刷新余额
async function refreshBalance() {
  if (!connected.value || !publicKey.value) {
    balance.value = "0";
    return;
  }

  try {
    addLog("info", "正在获取余额...");
    const response = await fetch(
      `https://api.trongrid.io/v1/accounts/${publicKey.value}`,
    );
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const balanceInSun = data.data[0].balance || 0;
      balance.value = (balanceInSun / 1000000).toFixed(6);
    } else {
      balance.value = "0";
    }

    addLog("success", `余额已更新: ${balance.value} TRX`);
  } catch (err) {
    const errorMsg = `获取余额失败: ${err.message}`;
    error.value = errorMsg;
    addLog("error", errorMsg);
  }
}

// 签名消息
async function signMessage() {
  if (!connected.value || !messageToSign.value) {
    error.value = "请先连接钱包并输入要签名的消息";
    return;
  }

  try {
    addLog("info", `开始签名消息: ${messageToSign.value}`);
    const signature = await walletSignMessage(messageToSign.value);
    signedMessage.value = signature;
    addLog("success", "消息签名成功");
    error.value = "";
  } catch (err) {
    const errorMsg = `签名失败: ${err.message}`;
    error.value = errorMsg;
    addLog("error", errorMsg);
  }
}

// 发送交易
async function sendTransaction() {
  if (!connected.value || !recipientAddress.value || !transferAmount.value) {
    error.value = "请填写完整的交易信息";
    return;
  }

  try {
    addLog(
      "info",
      `准备发送 ${transferAmount.value} TRX 到 ${recipientAddress.value}`,
    );

    // 构建交易参数
    const transaction = {
      to: recipientAddress.value,
      value: parseFloat(transferAmount.value) * 1000000, // 转换为 SUN
    };

    const result = await walletSendTransaction(transaction);
    addLog("success", `交易发送成功: ${result}`);

    // 清空表单
    recipientAddress.value = "";
    transferAmount.value = "";

    // 刷新余额
    setTimeout(refreshBalance, 2000);

    error.value = "";
  } catch (err) {
    const errorMsg = `交易发送失败: ${err.message}`;
    error.value = errorMsg;
    addLog("error", errorMsg);
  }
}

// 清除错误
function clearError() {
  error.value = "";
}

// 日志管理
function addLog(type, message) {
  const log = {
    time: new Date().toLocaleTimeString(),
    type,
    message,
  };
  eventLogs.value.unshift(log);

  // 限制日志数量
  if (eventLogs.value.length > 50) {
    eventLogs.value = eventLogs.value.slice(0, 50);
  }
}

function clearLogs() {
  eventLogs.value = [];
}

// 监听连接状态变化
const unwatchConnected = computed(() => {
  if (connected.value) {
    addLog("success", `钱包已连接: ${publicKey.value}`);
    refreshBalance();
  } else {
    addLog("info", "钱包已断开连接");
    balance.value = "0";
    signedMessage.value = "";
  }
});

// 监听钱包变化
const unwatchWallet = computed(() => {
  if (wallet.value) {
    addLog("info", `当前钱包: ${wallet.value.adapter.name}`);
  }
});

// 清理
onUnmounted(() => {
  if (typeof unwatchConnected === "function") unwatchConnected();
  if (typeof unwatchWallet === "function") unwatchWallet();
});
</script>

<style scoped>
.tron-wallet-vue-ui {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.description {
  color: #666;
  margin-bottom: 30px;
  font-size: 16px;
  line-height: 1.5;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* 钱包操作区域 */
.wallet-actions {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 15px;
}

.action-button {
  align-self: flex-start;
}

.separate-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.separate-buttons button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.select-button {
  background: #6c757d;
  color: white;
}

.select-button:hover {
  background: #5a6268;
}

.connect-button {
  background: #0066cc;
  color: white;
}

.connect-button:hover:not(:disabled) {
  background: #0052a3;
}

.connect-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.disconnect-button {
  background: #dc3545;
  color: white;
}

.disconnect-button:hover:not(:disabled) {
  background: #c82333;
}

.disconnect-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 钱包信息区域 */
.wallet-info {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.info-item {
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
  font-family: "Monaco", "Menlo", monospace;
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

.refresh-btn {
  margin-left: 10px;
  padding: 4px 8px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.refresh-btn:hover {
  background: #218838;
}

/* 功能测试区域 */
.feature-tests {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.test-section {
  margin-bottom: 25px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.test-section:last-child {
  margin-bottom: 0;
}

.sign-form,
.transaction-form {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.message-input,
.address-input,
.amount-input {
  flex: 1;
  min-width: 200px;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
}

.sign-btn,
.send-btn {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.sign-btn:hover,
.send-btn:hover {
  background: #218838;
}

.sign-btn:disabled,
.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.signed-result {
  margin-top: 15px;
  padding: 15px;
  background: #f1f3f4;
  border-radius: 8px;
}

.signed-result pre {
  margin: 10px 0 0 0;
  padding: 10px;
  background: #e9ecef;
  border-radius: 4px;
  font-size: 12px;
  word-break: break-all;
  white-space: pre-wrap;
}

/* 错误信息 */
.error-section {
  padding: 15px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
}

.error-message {
  color: #721c24;
  margin: 0 0 10px 0;
  font-weight: 500;
}

.clear-error-btn {
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.clear-error-btn:hover {
  background: #c82333;
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
  font-family: "Monaco", "Menlo", monospace;
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
  .info-grid {
    grid-template-columns: 1fr;
  }

  .separate-buttons {
    flex-direction: column;
  }

  .sign-form,
  .transaction-form {
    flex-direction: column;
  }

  .message-input,
  .address-input,
  .amount-input {
    min-width: auto;
  }
}
</style>
