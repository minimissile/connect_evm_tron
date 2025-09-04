<template>
  <div class="tokenpocket-deeplink">
    <h2>TokenPocket DeepLink 钱包交互演示</h2>
    <p class="description">
      基于 TokenPocket DeepLink 方式实现钱包登录、授权、转账、签名等功能
    </p>

    <!-- 钱包状态显示 -->
    <div class="wallet-status">
      <h3>钱包状态</h3>
      <div class="status-grid">
        <div class="status-item">
          <span class="label">连接状态:</span>
          <span
            class="value"
            :class="{ connected: isConnected, disconnected: !isConnected }"
          >
            {{ isConnected ? "已连接" : "未连接" }}
          </span>
        </div>
        <div class="status-item" v-if="walletAddress">
          <span class="label">钱包地址:</span>
          <span class="value address">{{ walletAddress }}</span>
        </div>
        <div class="status-item" v-if="isConnected">
          <span class="label">网络:</span>
          <span class="value">{{ currentNetwork }}</span>
        </div>
      </div>
    </div>

    <!-- 登录授权区域 -->
    <div class="auth-section">
      <h3>登录授权</h3>
      <div class="auth-form">
        <div class="form-group">
          <label>DApp 名称:</label>
          <input
            v-model="dappConfig.dappName"
            type="text"
            placeholder="输入 DApp 名称"
          />
        </div>
        <div class="form-group">
          <label>DApp 图标:</label>
          <input
            v-model="dappConfig.dappIcon"
            type="url"
            placeholder="输入 DApp 图标 URL"
          />
        </div>
        <div class="form-group">
          <label>回调 URL:</label>
          <input
            v-model="dappConfig.callbackUrl"
            type="url"
            placeholder="输入回调 URL"
          />
        </div>
        <div class="form-group">
          <label>网络选择:</label>
          <select v-model="selectedNetwork">
            <option value="ethereum">Ethereum (ETH)</option>
            <option value="tron">Tron (TRX)</option>
            <option value="bsc">BSC (BNB)</option>
            <option value="polygon">Polygon (MATIC)</option>
          </select>
        </div>
        <button
          @click="loginWithTokenPocket"
          class="auth-btn"
          :disabled="!dappConfig.dappName"
        >
          🔐 TokenPocket 登录授权
        </button>
      </div>
    </div>

    <!-- 功能操作区域 -->
    <div v-if="isConnected" class="operations-section">
      <h3>钱包操作</h3>

      <!-- 转账功能 -->
      <div class="operation-card">
        <h4>💸 转账</h4>
        <div class="transfer-form">
          <div class="form-row">
            <input
              v-model="transferData.to"
              type="text"
              placeholder="接收地址"
              class="address-input"
            />
            <input
              v-model="transferData.amount"
              type="number"
              placeholder="转账金额"
              class="amount-input"
              step="0.000001"
              min="0"
            />
          </div>
          <div class="form-row">
            <input
              v-model="transferData.symbol"
              type="text"
              placeholder="代币符号 (如: ETH, TRX)"
            />
            <input
              v-model="transferData.contract"
              type="text"
              placeholder="合约地址 (可选)"
            />
          </div>
          <div class="form-row">
            <textarea
              v-model="transferData.memo"
              placeholder="备注信息 (可选)"
              rows="2"
            ></textarea>
          </div>
          <button
            @click="transferWithTokenPocket"
            class="operation-btn"
            :disabled="!transferData.to || !transferData.amount"
          >
            发起转账
          </button>
        </div>
      </div>

      <!-- 签名功能 -->
      <div class="operation-card">
        <h4>✍️ 消息签名</h4>
        <div class="sign-form">
          <div class="form-group">
            <label>签名类型:</label>
            <select v-model="signData.signType">
              <option value="ethPersonalSign">ETH Personal Sign</option>
              <option value="ethSign">ETH Sign</option>
              <option value="tronSign">Tron Sign</option>
            </select>
          </div>
          <textarea
            v-model="signData.message"
            placeholder="输入要签名的消息"
            rows="3"
          ></textarea>
          <button
            @click="signMessageWithTokenPocket"
            class="operation-btn"
            :disabled="!signData.message"
          >
            签名消息
          </button>
        </div>
      </div>

      <!-- 交易签名 -->
      <div class="operation-card">
        <h4>📝 交易签名</h4>
        <div class="transaction-form">
          <textarea
            v-model="transactionData.txData"
            placeholder="输入交易数据 (JSON 格式)"
            rows="4"
          ></textarea>
          <button
            @click="signTransactionWithTokenPocket"
            class="operation-btn"
            :disabled="!transactionData.txData"
          >
            签名交易
          </button>
        </div>
      </div>
    </div>

    <!-- 回调结果显示 -->
    <div v-if="callbackResult" class="callback-result">
      <h3>回调结果</h3>
      <div class="result-content">
        <pre>{{ JSON.stringify(callbackResult, null, 2) }}</pre>
      </div>
      <button @click="clearResult" class="clear-btn">清除结果</button>
    </div>

    <!-- 操作日志 -->
    <div class="operation-logs">
      <h3>操作日志</h3>
      <div class="logs-container">
        <div
          v-for="(log, index) in operationLogs"
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

    <!-- DeepLink 说明 -->
    <div class="deeplink-info">
      <h3>DeepLink 说明</h3>
      <div class="info-content">
        <p>
          <strong>登录授权:</strong>
          <code>tpoutside://pull.activity?param={}</code>
        </p>
        <p>
          <strong>转账:</strong> <code>tpoutside://pull.activity?param={}</code>
        </p>
        <p>
          <strong>签名:</strong> <code>tpoutside://pull.activity?param={}</code>
        </p>
        <p>
          <strong>交易签名:</strong>
          <code>tpoutside://pull.activity?param={}</code>
        </p>
        <p><strong>打开 DApp:</strong> <code>tpdapp://open?params={}</code></p>
        <div class="note">
          <strong>注意:</strong> DeepLink 方式仅适用于手机系统浏览器，需要安装
          TokenPocket 钱包应用。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from "vue";

// 响应式数据
const isConnected = ref(false);
const walletAddress = ref("");
const currentNetwork = ref("ethereum");
const selectedNetwork = ref("ethereum");
const callbackResult = ref(null);
const operationLogs = ref([]);

// DApp 配置
const dappConfig = reactive({
  dappName: "TronWallet Demo",
  dappIcon: "https://eosknights.io/img/icon.png",
  callbackUrl: window.location.origin + "/callback",
  protocol: "TokenPocket",
  version: "2.0",
});

// 转账数据
const transferData = reactive({
  to: "",
  amount: "",
  symbol: "ETH",
  contract: "",
  memo: "",
  decimal: 18,
  precision: 0,
});

// 签名数据
const signData = reactive({
  message: "Hello TokenPocket!",
  signType: "ethPersonalSign",
  hash: false,
});

// 交易数据
const transactionData = reactive({
  txData: "",
});

// 网络配置
const networkConfigs = {
  ethereum: { chainId: "1", network: "ethereum" },
  tron: { chainId: "1", network: "tron" },
  bsc: { chainId: "56", network: "bsc" },
  polygon: { chainId: "137", network: "polygon" },
};

// 生命周期
onMounted(() => {
  addLog("info", "TokenPocket DeepLink 组件已加载");

  // 监听页面可见性变化，用于检测从钱包返回
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // 监听 URL 变化，用于处理回调
  window.addEventListener("popstate", handleUrlChange);

  // 检查 URL 参数中是否有回调数据
  checkCallbackParams();
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("popstate", handleUrlChange);
});

// 方法定义
function generateActionId() {
  return "web-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
}

function getNetworkConfig() {
  return networkConfigs[selectedNetwork.value] || networkConfigs.ethereum;
}

function buildDeepLinkUrl(action, params) {
  const baseParams = {
    action,
    actionId: generateActionId(),
    blockchains: [getNetworkConfig()],
    dappIcon: dappConfig.dappIcon,
    dappName: dappConfig.dappName,
    protocol: dappConfig.protocol,
    callbackUrl: dappConfig.callbackUrl,
    version: dappConfig.version,
    ...params,
  };

  console.log("BaseParams:", baseParams);

  const paramString = encodeURIComponent(JSON.stringify(baseParams));
  return `tpoutside://pull.activity?param=${paramString}`;
}

// 登录授权
function loginWithTokenPocket() {
  try {
    addLog("info", "发起 TokenPocket 登录授权...");

    const deepLinkUrl = buildDeepLinkUrl("login", {});

    addLog("info", `DeepLink URL: ${deepLinkUrl}`);

    // 尝试打开 DeepLink
    window.location.href = deepLinkUrl;

    // 设置超时检测
    setTimeout(() => {
      if (!isConnected.value) {
        addLog("warning", "未检测到钱包响应，请确保已安装 TokenPocket 应用");
      }
    }, 3000);
  } catch (error) {
    addLog("error", `登录失败: ${error.message}`);
  }
}

// 转账
function transferWithTokenPocket() {
  try {
    addLog(
      "info",
      `发起转账: ${transferData.amount} ${transferData.symbol} 到 ${transferData.to}`,
    );

    const transferParams = {
      amount: parseFloat(transferData.amount),
      to: transferData.to,
      symbol: transferData.symbol,
      decimal: transferData.decimal,
      precision: transferData.precision,
    };

    if (transferData.contract) {
      transferParams.contract = transferData.contract;
    }

    if (transferData.memo) {
      transferParams.memo = transferData.memo;
    }

    if (walletAddress.value) {
      transferParams.from = walletAddress.value;
    }

    const deepLinkUrl = buildDeepLinkUrl("transfer", transferParams);

    addLog("info", `转账 DeepLink: ${deepLinkUrl.substring(0, 100)}...`);

    window.location.href = deepLinkUrl;
  } catch (error) {
    addLog("error", `转账失败: ${error.message}`);
  }
}

// 消息签名
function signMessageWithTokenPocket() {
  try {
    addLog("info", `发起消息签名: ${signData.message}`);

    const signParams = {
      message: signData.message,
      signType: signData.signType,
      hash: signData.hash,
      memo: "Message signing demo",
    };

    const deepLinkUrl = buildDeepLinkUrl("sign", signParams);

    addLog("info", `签名 DeepLink: ${deepLinkUrl.substring(0, 100)}...`);

    window.location.href = deepLinkUrl;
  } catch (error) {
    addLog("error", `签名失败: ${error.message}`);
  }
}

// 交易签名
function signTransactionWithTokenPocket() {
  try {
    addLog("info", "发起交易签名...");

    let txData;
    try {
      txData = JSON.parse(transactionData.txData);
    } catch (e) {
      addLog("error", "交易数据格式错误，请输入有效的 JSON");
      return;
    }

    const signParams = {
      txData: JSON.stringify(txData),
    };

    const deepLinkUrl = buildDeepLinkUrl("pushTransaction", signParams);

    addLog("info", `交易签名 DeepLink: ${deepLinkUrl.substring(0, 100)}...`);

    window.location.href = deepLinkUrl;
  } catch (error) {
    addLog("error", `交易签名失败: ${error.message}`);
  }
}

// 处理页面可见性变化
function handleVisibilityChange() {
  if (!document.hidden) {
    addLog("info", "页面重新获得焦点，检查回调结果...");
    setTimeout(checkCallbackParams, 500);
  }
}

// 处理 URL 变化
function handleUrlChange() {
  checkCallbackParams();
}

// 检查回调参数
function checkCallbackParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  // 检查 URL 参数
  const code = urlParams.get("code") || hashParams.get("code");
  const message = urlParams.get("message") || hashParams.get("message");
  const address = urlParams.get("address") || hashParams.get("address");
  const signature = urlParams.get("signature") || hashParams.get("signature");
  const txHash = urlParams.get("txHash") || hashParams.get("txHash");
  const actionId = urlParams.get("actionId") || hashParams.get("actionId");

  if (code !== null) {
    const result = {
      code: parseInt(code),
      message: message || "",
      address: address || "",
      signature: signature || "",
      txHash: txHash || "",
      actionId: actionId || "",
      timestamp: new Date().toISOString(),
    };

    handleCallbackResult(result);

    // 清理 URL 参数
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

// 处理回调结果
function handleCallbackResult(result) {
  callbackResult.value = result;

  if (result.code === 0) {
    addLog("success", "操作成功完成");

    if (result.address) {
      isConnected.value = true;
      walletAddress.value = result.address;
      currentNetwork.value = selectedNetwork.value;
      addLog("success", `钱包已连接: ${result.address}`);
    }

    if (result.signature) {
      addLog("success", `签名成功: ${result.signature.substring(0, 20)}...`);
    }

    if (result.txHash) {
      addLog("success", `交易成功: ${result.txHash}`);
    }
  } else {
    addLog("error", `操作失败: ${result.message || "未知错误"}`);
  }
}

// 清除结果
function clearResult() {
  callbackResult.value = null;
}

// 日志管理
function addLog(type, message) {
  const log = {
    time: new Date().toLocaleTimeString(),
    type,
    message,
  };
  operationLogs.value.unshift(log);

  // 限制日志数量
  if (operationLogs.value.length > 50) {
    operationLogs.value = operationLogs.value.slice(0, 50);
  }
}

function clearLogs() {
  operationLogs.value = [];
}

// 示例交易数据
function fillExampleTransactionData() {
  transactionData.txData = JSON.stringify(
    {
      from: walletAddress.value || "0x12F4900A1fB41f751b8F616832643224606B75B4",
      gasPrice: "0x6c088e200",
      gas: "0xea60",
      chainId: getNetworkConfig().chainId,
      to: "0x1d1e7fb353be75669c53c18ded2abcb8c4793d80",
      data: "0xa9059cbb000000000000000000000000171a0b081493722a5f22ebe6f0c4adf5fde49bd8000000000000000000000000000000000000000000000000000000000012c4b0",
    },
    null,
    2,
  );
}
</script>

<style scoped>
.tokenpocket-deeplink {
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

/* 钱包状态 */
.wallet-status {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  margin-bottom: 30px;
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

/* 登录授权区域 */
.auth-section {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  margin-bottom: 30px;
}

.auth-form {
  margin-top: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #495057;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
}

.auth-btn {
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.auth-btn:hover:not(:disabled) {
  background: #0056b3;
}

.auth-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 操作区域 */
.operations-section {
  margin-bottom: 30px;
}

.operation-card {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  margin-bottom: 20px;
}

.operation-card h4 {
  margin: 0 0 15px 0;
  color: #495057;
}

.form-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.form-row input,
.form-row textarea {
  flex: 1;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
}

.address-input {
  flex: 2;
}

.amount-input {
  flex: 1;
}

textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: "Monaco", "Menlo", monospace;
}

.operation-btn {
  width: 100%;
  padding: 10px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
}

.operation-btn:hover:not(:disabled) {
  background: #218838;
}

.operation-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 回调结果 */
.callback-result {
  padding: 20px;
  background: #e8f5e8;
  border: 1px solid #c3e6c3;
  border-radius: 8px;
  margin-bottom: 30px;
}

.result-content {
  margin: 15px 0;
}

.result-content pre {
  background: #f1f3f4;
  padding: 15px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
}

.clear-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.clear-btn:hover {
  background: #5a6268;
}

/* 操作日志 */
.operation-logs {
  margin-bottom: 30px;
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

.log-type.warning {
  background: #fff3cd;
  color: #856404;
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

/* DeepLink 说明 */
.deeplink-info {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.info-content p {
  margin: 10px 0;
  font-size: 14px;
}

.info-content code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "Monaco", "Menlo", monospace;
  font-size: 12px;
}

.note {
  margin-top: 15px;
  padding: 10px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  color: #856404;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .status-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
  }

  .address-input,
  .amount-input {
    flex: 1;
  }
}
</style>
