<template>
  <div class="okx-connect-container">
    <h2>OKX Connect Universal Provider Demo</h2>

    <!-- 连接状态显示 -->
    <div v-if="!isConnected" class="connection-section">
      <p class="description">
        使用 OKX Connect Universal Provider 连接您的 OKX 钱包，支持多链操作
      </p>

      <!-- 链选择界面 -->
      <div v-if="!selectedChains.length" class="chain-selection">
        <h3>选择要连接的区块链</h3>
        <div class="chain-grid">
          <div
            v-for="chain in availableChains"
            :key="chain.id"
            @click="toggleChainSelection(chain)"
            :class="['chain-card', { selected: selectedChains.includes(chain.id) }]"
          >
            <div class="chain-icon">{{ chain.icon }}</div>
            <div class="chain-name">{{ chain.name }}</div>
            <div class="chain-id">{{ chain.id }}</div>
          </div>
        </div>
        <button 
          @click="proceedToConnect" 
          :disabled="selectedChains.length === 0"
          class="proceed-btn"
        >
          继续连接 ({{ selectedChains.length }} 条链)
        </button>
      </div>

      <!-- 连接按钮 -->
      <div v-else class="connect-section">
        <div class="selected-chains">
          <h4>已选择的链:</h4>
          <div class="chain-list">
            <span 
              v-for="chainId in selectedChains" 
              :key="chainId"
              class="chain-tag"
            >
              {{ getChainName(chainId) }}
            </span>
          </div>
          <button @click="resetChainSelection" class="reset-btn">重新选择</button>
        </div>

        <button
          @click="connectWallet"
          :disabled="isConnecting"
          class="connect-btn"
        >
          {{ isConnecting ? "连接中..." : "连接 OKX 钱包" }}
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

      <!-- 功能测试区域 -->
      <div class="test-section">
        <h4>功能测试</h4>

        <!-- 链切换 -->
        <div class="test-group">
          <h5>切换链</h5>
          <div class="chain-switch">
            <select v-model="targetChain" class="chain-select">
              <option value="">选择目标链</option>
              <option 
                v-for="chain in sessionInfo.chains" 
                :key="chain"
                :value="chain"
              >
                {{ getChainName(chain.split(':')[1]) }}
              </option>
            </select>
            <button 
              @click="switchChain" 
              :disabled="!targetChain || targetChain === currentChain"
              class="test-btn"
            >
              切换链
            </button>
          </div>
        </div>

        <!-- 个人签名测试 -->
        <div class="test-group">
          <h5>个人签名 (personal_sign)</h5>
          <div class="input-group">
            <input
              v-model="signMessage"
              type="text"
              placeholder="输入要签名的消息"
              class="test-input"
            />
            <button
              @click="personalSign"
              :disabled="!signMessage.trim()"
              class="test-btn"
            >
              签名
            </button>
          </div>
          <div v-if="signResult" class="result-box">
            <strong>签名结果:</strong>
            <div class="result-content">{{ signResult }}</div>
          </div>
        </div>

        <!-- 类型化数据签名 -->
        <div class="test-group">
          <h5>类型化数据签名 (eth_signTypedData_v4)</h5>
          <button @click="signTypedData" class="test-btn">
            签名示例类型化数据
          </button>
          <div v-if="typedDataResult" class="result-box">
            <strong>类型化数据签名结果:</strong>
            <div class="result-content">{{ typedDataResult }}</div>
          </div>
        </div>

        <!-- 发送交易 -->
        <div class="test-group">
          <h5>发送交易</h5>
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
                step="0.001"
                placeholder="转账金额 (ETH)"
                class="test-input"
              />
            </div>
            <button
              @click="sendTransaction"
              :disabled="!transferTo.trim() || !transferAmount || parseFloat(transferAmount) <= 0"
              class="test-btn transfer-btn"
            >
              发送交易
            </button>
          </div>
          <div v-if="txResult" class="result-box">
            <strong>交易结果:</strong>
            <div class="result-content">{{ txResult }}</div>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { OKXUniversalProvider } from '@okxconnect/universal-provider';

// 响应式数据
const isConnected = ref(false);
const isConnecting = ref(false);
const error = ref('');
const okxProvider = ref(null);
const sessionInfo = ref({
  topic: '',
  chains: [],
  accounts: [],
  methods: []
});
const currentChain = ref('');
const balance = ref('');
const logs = ref([]);

// 链选择相关
const selectedChains = ref([]);
const availableChains = ref([
  { id: '1', name: 'Ethereum', icon: '🔷', type: 'evm' },
  { id: '56', name: 'BNB Smart Chain', icon: '🟡', type: 'evm' },
  { id: '137', name: 'Polygon', icon: '🟣', type: 'evm' },
  { id: '42161', name: 'Arbitrum', icon: '🔵', type: 'evm' },
  { id: '10', name: 'Optimism', icon: '🔴', type: 'evm' },
  { id: '43114', name: 'Avalanche', icon: '🔺', type: 'evm' },
  { id: 'tron', name: 'Tron', icon: '🔴', type: 'tron' },
  { id: 'bitcoin', name: 'Bitcoin', icon: '🟠', type: 'bitcoin' }
]);

// 测试功能相关
const signMessage = ref('Hello OKX Connect!');
const signResult = ref('');
const typedDataResult = ref('');
const transferTo = ref('');
const transferAmount = ref('');
const txResult = ref('');
const targetChain = ref('');

// 添加日志
const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message,
    type
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
  error.value = '';
};

// 链选择相关方法
const toggleChainSelection = (chain) => {
  const index = selectedChains.value.indexOf(chain.id);
  if (index > -1) {
    selectedChains.value.splice(index, 1);
  } else {
    selectedChains.value.push(chain.id);
  }
};

const proceedToConnect = () => {
  if (selectedChains.value.length === 0) {
    error.value = '请至少选择一条链';
    return;
  }
  addLog(`已选择 ${selectedChains.value.length} 条链: ${selectedChains.value.map(id => getChainName(id)).join(', ')}`);
};

const resetChainSelection = () => {
  selectedChains.value = [];
  addLog('重置链选择');
};

const getChainName = (chainId: string) => {
  const chain = availableChains.value.find(c => c.id === chainId);
  return chain ? chain.name : `Chain ${chainId}`;
};

const getCurrentChainSymbol = () => {
  const [namespace, chainId] = currentChain.value.split(':');
  
  if (namespace === 'eip155') {
    switch (chainId) {
      case '1': return 'ETH';
      case '56': return 'BNB';
      case '137': return 'MATIC';
      case '42161': return 'ETH';
      case '10': return 'ETH';
      case '43114': return 'AVAX';
      default: return 'ETH';
    }
  } else if (namespace === 'tron') {
    return 'TRX';
  } else if (namespace === 'bip122') {
    return 'BTC';
  }
  
  return 'Unknown';
};

// 初始化 OKX Provider
const initProvider = async () => {
  try {
    addLog('正在初始化 OKX Universal Provider...');
    
    okxProvider.value = await OKXUniversalProvider.init({
      dappMetaData: {
        name: 'OKX Connect Demo',
        icon: window.location.origin + '/favicon.ico'
      }
    });
    
    addLog('OKX Universal Provider 初始化成功', 'success');
  } catch (err) {
    console.error('初始化失败:', err);
    error.value = '初始化失败: ' + err.message;
    addLog('初始化失败: ' + err.message, 'error');
  }
};

// 连接钱包
const connectWallet = async () => {
  try {
    if (!okxProvider.value) {
      await initProvider();
    }
    
    isConnecting.value = true;
    error.value = '';
    addLog('正在连接 OKX 钱包...');
    
    // 根据链类型分组
    const evmChains = selectedChains.value.filter(id => {
      const chain = availableChains.value.find(c => c.id === id);
      return chain?.type === 'evm';
    }).map(id => `eip155:${id}`);
    
    const tronChains = selectedChains.value.filter(id => {
      const chain = availableChains.value.find(c => c.id === id);
      return chain?.type === 'tron';
    }).map(id => `tron:${id}`);
    
    const bitcoinChains = selectedChains.value.filter(id => {
      const chain = availableChains.value.find(c => c.id === id);
      return chain?.type === 'bitcoin';
    }).map(id => `bip122:${id}`);
    
    // 构建命名空间
     const namespaces: any = {};
     
     if (evmChains.length > 0) {
       namespaces.eip155 = {
         chains: evmChains,
         defaultChain: selectedChains.value.find(id => {
           const chain = availableChains.value.find(c => c.id === id);
           return chain?.type === 'evm';
         })
       };
     }
     
     if (tronChains.length > 0) {
       namespaces.tron = {
         chains: tronChains,
         defaultChain: 'tron'
       };
     }
     
     if (bitcoinChains.length > 0) {
       namespaces.bip122 = {
         chains: bitcoinChains,
         defaultChain: 'bitcoin'
       };
     }
    
    const session = await okxProvider.value.connect({
      namespaces: namespaces,
      sessionConfig: {
        redirect: 'none'
      }
    });
    
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
      
      if (session.namespaces.bip122) {
        allChains.push(...(session.namespaces.bip122.chains || []));
        allAccounts.push(...(session.namespaces.bip122.accounts || []));
        allMethods.push(...(session.namespaces.bip122.methods || []));
      }
      
      sessionInfo.value = {
        topic: session.topic,
        chains: allChains,
        accounts: allAccounts,
        methods: allMethods
      };
      
      // 设置当前链为第一个可用的链
      currentChain.value = allChains[0] || '';
      
      addLog('钱包连接成功!', 'success');
      addLog(`Session Topic: ${session.topic}`);
      addLog(`连接的账户: ${sessionInfo.value.accounts.join(', ')}`);
      
      // 自动获取余额
      await getBalance();
    }
  } catch (err) {
    console.error('连接失败:', err);
    error.value = '连接失败: ' + err.message;
    addLog('连接失败: ' + err.message, 'error');
  } finally {
    isConnecting.value = false;
  }
};

// 断开连接
const disconnect = async () => {
  try {
    if (okxProvider.value) {
      await okxProvider.value.disconnect();
    }
    
    isConnected.value = false;
    sessionInfo.value = {
      topic: '',
      chains: [],
      accounts: [],
      methods: []
    };
    currentChain.value = '';
    balance.value = '';
    selectedChains.value = [];
    
    addLog('钱包已断开连接', 'success');
  } catch (err) {
    console.error('断开连接失败:', err);
    error.value = '断开连接失败: ' + err.message;
    addLog('断开连接失败: ' + err.message, 'error');
  }
};

// 获取余额
const getBalance = async () => {
  try {
    if (!okxProvider.value || !sessionInfo.value.accounts.length) return;
    
    const account = sessionInfo.value.accounts[0];
    const address = account.split(':')[2];
    const [namespace] = currentChain.value.split(':');
    
    addLog('正在获取余额...');
    
    let balanceResult;
    let balanceInToken;
    
    if (namespace === 'eip155') {
      // EVM 链使用 eth_getBalance
      balanceResult = await okxProvider.value.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      }, currentChain.value);
      
      balanceInToken = parseInt(balanceResult, 16) / Math.pow(10, 18);
    } else if (namespace === 'tron') {
      // Tron 链使用 tron_getBalance
      balanceResult = await okxProvider.value.request({
        method: 'tron_getBalance',
        params: [address]
      }, currentChain.value);
      
      balanceInToken = parseInt(balanceResult) / Math.pow(10, 6); // TRX 使用 6 位小数
    } else if (namespace === 'bip122') {
      // Bitcoin 链使用 bitcoin_getBalance
      balanceResult = await okxProvider.value.request({
        method: 'bitcoin_getBalance',
        params: [address]
      }, currentChain.value);
      
      balanceInToken = parseInt(balanceResult) / Math.pow(10, 8); // BTC 使用 8 位小数
    } else {
      throw new Error('不支持的链类型');
    }
    
    balance.value = balanceInToken.toFixed(6);
    
    addLog(`余额获取成功: ${balance.value} ${getCurrentChainSymbol()}`, 'success');
  } catch (err) {
    console.error('获取余额失败:', err);
    error.value = '获取余额失败: ' + err.message;
    addLog('获取余额失败: ' + err.message, 'error');
  }
};

// 切换链
const switchChain = async () => {
  try {
    if (!targetChain.value) return;
    
    addLog(`正在切换到链: ${getChainName(targetChain.value.split(':')[1])}`);
    
    const chainId = '0x' + parseInt(targetChain.value.split(':')[1]).toString(16);
    
    await okxProvider.value.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }]
    }, targetChain.value);
    
    currentChain.value = targetChain.value;
    addLog(`成功切换到链: ${getChainName(targetChain.value.split(':')[1])}`, 'success');
    
    // 重新获取余额
    await getBalance();
  } catch (err) {
    console.error('切换链失败:', err);
    error.value = '切换链失败: ' + err.message;
    addLog('切换链失败: ' + err.message, 'error');
  }
};

// 个人签名
const personalSign = async () => {
  try {
    if (!signMessage.value.trim()) return;
    
    const account = sessionInfo.value.accounts[0];
    const address = account.split(':')[2];
    const [namespace] = currentChain.value.split(':');
    
    addLog('正在进行个人签名...');
    
    let signature;
    
    if (namespace === 'eip155') {
      // EVM 链使用 personal_sign
      signature = await okxProvider.value.request({
        method: 'personal_sign',
        params: [signMessage.value, address]
      }, currentChain.value);
    } else if (namespace === 'tron') {
      // Tron 链使用 tron_signMessage
      signature = await okxProvider.value.request({
        method: 'tron_signMessage',
        params: [{
          message: signMessage.value,
          address: address
        }]
      }, currentChain.value);
    } else if (namespace === 'bip122') {
      // Bitcoin 链使用 bitcoin_signMessage
      signature = await okxProvider.value.request({
        method: 'bitcoin_signMessage',
        params: [{
          message: signMessage.value,
          address: address
        }]
      }, currentChain.value);
    } else {
      throw new Error('不支持的链类型');
    }
    
    signResult.value = signature;
    addLog('个人签名成功', 'success');
  } catch (err) {
    console.error('个人签名失败:', err);
    error.value = '个人签名失败: ' + err.message;
    addLog('个人签名失败: ' + err.message, 'error');
  }
};

// 类型化数据签名
const signTypedData = async () => {
  try {
    const account = sessionInfo.value.accounts[0];
    const address = account.split(':')[2];
    const [namespace] = currentChain.value.split(':');
    
    addLog('正在进行类型化数据签名...');
    
    let signature;
    
    if (namespace === 'eip155') {
      // EVM 链使用 eth_signTypedData_v4
      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' }
          ],
          Mail: [
            { name: 'from', type: 'Person' },
            { name: 'to', type: 'Person' },
            { name: 'contents', type: 'string' }
          ]
        },
        primaryType: 'Mail',
        domain: {
          name: 'OKX Connect Demo',
          version: '1',
          chainId: parseInt(currentChain.value.split(':')[1]),
          verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
        },
        message: {
          from: {
            name: 'Alice',
            wallet: address
          },
          to: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
          },
          contents: 'Hello from OKX Connect!'
        }
      };
      
      signature = await okxProvider.value.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(typedData)]
      }, currentChain.value);
    } else if (namespace === 'tron') {
      // Tron 链使用 tron_signTypedData
      const typedData = {
        domain: {
          name: 'OKX Connect Demo',
          version: '1',
          chainId: currentChain.value.split(':')[1]
        },
        message: {
          from: 'Alice',
          to: 'Bob',
          contents: 'Hello from OKX Connect!'
        }
      };
      
      signature = await okxProvider.value.request({
        method: 'tron_signTypedData',
        params: [{
          address: address,
          data: typedData
        }]
      }, currentChain.value);
    } else if (namespace === 'bip122') {
      // Bitcoin 不支持类型化数据签名，使用普通消息签名
      const message = JSON.stringify({
        from: 'Alice',
        to: 'Bob',
        contents: 'Hello from OKX Connect!',
        timestamp: Date.now()
      });
      
      signature = await okxProvider.value.request({
        method: 'bitcoin_signMessage',
        params: [{
          message: message,
          address: address
        }]
      }, currentChain.value);
    } else {
      throw new Error('不支持的链类型');
    }
    
    typedDataResult.value = signature;
    addLog('类型化数据签名成功', 'success');
  } catch (err) {
    console.error('类型化数据签名失败:', err);
    error.value = '类型化数据签名失败: ' + err.message;
    addLog('类型化数据签名失败: ' + err.message, 'error');
  }
};

// 发送交易
const sendTransaction = async () => {
  try {
    if (!transferTo.value.trim() || !transferAmount.value) return;
    
    const account = sessionInfo.value.accounts[0];
    const fromAddress = account.split(':')[2];
    const [namespace] = currentChain.value.split(':');
    
    addLog('正在发送交易...');
    
    let txHash;
    
    if (namespace === 'eip155') {
      // EVM 链交易
      const value = '0x' + (parseFloat(transferAmount.value) * Math.pow(10, 18)).toString(16);
      
      txHash = await okxProvider.value.request({
        method: 'eth_sendTransaction',
        params: [{
          from: fromAddress,
          to: transferTo.value,
          value: value,
          gas: '0x5208' // 21000
        }]
      }, currentChain.value);
    } else if (namespace === 'tron') {
      // Tron 链交易
      const amount = parseFloat(transferAmount.value) * Math.pow(10, 6); // TRX 使用 6 位小数
      
      txHash = await okxProvider.value.request({
        method: 'tron_sendTransaction',
        params: [{
          from: fromAddress,
          to: transferTo.value,
          amount: amount.toString()
        }]
      }, currentChain.value);
    } else if (namespace === 'bip122') {
      // Bitcoin 链交易
      const amount = parseFloat(transferAmount.value) * Math.pow(10, 8); // BTC 使用 8 位小数
      
      txHash = await okxProvider.value.request({
        method: 'bitcoin_sendTransaction',
        params: [{
          from: fromAddress,
          to: transferTo.value,
          amount: amount.toString()
        }]
      }, currentChain.value);
    } else {
      throw new Error('不支持的链类型');
    }
    
    txResult.value = txHash;
    addLog(`交易发送成功: ${txHash}`, 'success');
    
    // 重新获取余额
    setTimeout(() => getBalance(), 3000);
  } catch (err) {
    console.error('发送交易失败:', err);
    error.value = '发送交易失败: ' + err.message;
    addLog('发送交易失败: ' + err.message, 'error');
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
        topic: '',
        chains: [],
        accounts: [],
        methods: []
      };
      addLog('检测到钱包连接已断开', 'error');
    }
  }
};

// 生命周期
onMounted(async () => {
  await initProvider();
  
  // 定期检查连接状态
  setInterval(checkConnection, 5000);
  
  addLog('OKX Connect Demo 组件已加载');
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

.chain-selection {
  text-align: center;
}

.chain-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.chain-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.chain-card:hover {
  border-color: #000;
  transform: translateY(-2px);
}

.chain-card.selected {
  border-color: #000;
  background: #f0f0f0;
}

.chain-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.chain-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.chain-id {
  font-size: 12px;
  color: #666;
}

.proceed-btn {
  background: #000;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 20px;
  transition: all 0.2s ease;
}

.proceed-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.proceed-btn:hover:not(:disabled) {
  background: #333;
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