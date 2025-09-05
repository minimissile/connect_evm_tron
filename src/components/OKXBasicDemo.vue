<template>
  <div class="okx-basic-demo">
    <div class="header">
      <h2>🚀 OKX Universal Provider 基础案例</h2>
      <p>基于 @okxconnect/universal-provider 的连接和授权示例</p>
    </div>

    <!-- 连接状态 -->
    <div class="status-section">
      <div class="status-header">
        <h3>📡 连接状态</h3>
        <div class="status-indicator">
          <div :class="['status-dot', isConnected ? 'connected' : 'disconnected']"></div>
          <span :class="['status-text', isConnected ? 'connected' : 'disconnected']">
            {{ isConnected ? '已连接' : '未连接' }}
          </span>
        </div>
      </div>
      <div class="status-info">
        <div v-if="isConnected" class="status-item">
          <span class="label">👤 当前账户:</span>
          <span class="value account-address">{{ currentAccount }}</span>
        </div>
        <div v-if="isConnected" class="status-item">
          <span class="label">🔗 当前链:</span>
          <span class="value chain-badge">{{ currentChain }}</span>
        </div>
      </div>
    </div>

    <!-- 连接操作 -->
    <div class="action-section">
      <h3>💼 钱包操作</h3>
      <div class="button-group">
        <button 
          @click="connectWallet" 
          :disabled="isConnecting || isConnected"
          class="btn btn-primary"
        >
          <span v-if="isConnecting" class="loading-spinner">⏳</span>
          {{ isConnecting ? '连接中...' : '🔌 连接钱包' }}
        </button>
        
        <button 
          @click="disconnectWallet" 
          :disabled="!isConnected"
          class="btn btn-secondary"
        >
          🔌 断开连接
        </button>
      </div>
    </div>

    <!-- 链切换 -->
    <div v-if="isConnected" class="chain-section">
      <h3>🔄 链切换</h3>
      <div class="chain-buttons">
        <button 
          v-for="chain in supportedChains" 
          :key="chain.chainId"
          @click="switchChain(chain)"
          :disabled="isSwitching || currentChain === chain.name"
          :class="['btn', 'btn-chain', currentChain === chain.name ? 'active' : '']"
        >
          <span class="chain-icon">{{ getChainIcon(chain.name) }}</span>
          <span class="chain-name">{{ chain.name }}</span>
        </button>
      </div>
    </div>

    <!-- 授权操作 -->
    <div v-if="isConnected" class="approve-section">
      <h3>合约授权</h3>
      <div class="approve-form">
        <div class="form-group">
          <label>授权地址 (spender):</label>
          <input 
            v-model="spenderAddress" 
            type="text" 
            placeholder="输入要授权的合约地址"
            class="input"
          />
        </div>
        <div class="form-group">
          <label>授权金额:</label>
          <select v-model="approveAmount" class="select">
            <option value="max">最大金额</option>
            <option value="custom">自定义金额</option>
          </select>
          <input 
            v-if="approveAmount === 'custom'"
            v-model="customAmount"
            type="text"
            placeholder="输入授权金额"
            class="input"
          />
        </div>
        <button 
          @click="approveContract"
          :disabled="isApproving || !spenderAddress"
          class="btn btn-approve"
        >
          {{ isApproving ? '授权中...' : '授权合约' }}
        </button>
      </div>
      
      <!-- 授权结果 -->
      <div v-if="approvalResult" class="result-section">
        <h4>授权结果</h4>
        <div class="result-info">
          <div class="result-item">
            <span class="label">交易哈希:</span>
            <span class="value">{{ approvalResult.txHash }}</span>
          </div>
          <div class="result-item">
            <span class="label">授权地址:</span>
            <span class="value">{{ approvalResult.spender }}</span>
          </div>
          <div class="result-item">
            <span class="label">授权金额:</span>
            <span class="value">{{ approvalResult.amount }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志区域 -->
    <div class="log-section">
      <h3>操作日志</h3>
      <div class="log-container">
        <div 
          v-for="(log, index) in logs" 
          :key="index"
          :class="['log-item', log.type]"
        >
          <span class="timestamp">{{ log.timestamp }}</span>
          <span class="message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLogs" class="btn btn-clear">清空日志</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'OKXBasicDemo',
  setup() {
    // 响应式数据
    const isConnected = ref(false);
    const isConnecting = ref(false);
    const isSwitching = ref(false);
    const isApproving = ref(false);
    const currentAccount = ref('');
    const currentChain = ref('');
    const spenderAddress = ref('0xda62e16FC8F0F594841073325dE49E58A43678B6');
    const approveAmount = ref('max');
    const customAmount = ref('');
    const approvalResult = ref(null);
    const logs = ref([]);
    const okxProvider = ref(null);

    // 支持的链
    const supportedChains = ref([
      {
        chainId: '0x1',
        name: 'Ethereum',
        namespace: 'eip155',
        rpcUrl: 'https://eth.llamarpc.com'
      },
      {
        chainId: '0x38',
        name: 'BSC',
        namespace: 'eip155',
        rpcUrl: 'https://bsc-dataseed1.binance.org'
      },
      {
        chainId: '0x2b6653dc',
        name: 'Tron',
        namespace: 'tron',
        rpcUrl: 'https://api.trongrid.io'
      }
    ]);

    // 添加日志
    const addLog = (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      logs.value.unshift({
        timestamp,
        message,
        type
      });
      console.log(`[${timestamp}] ${message}`);
    };

    // 清空日志
    const clearLogs = () => {
      logs.value = [];
    };

    // 初始化 OKX Provider
    const initProvider = async () => {
      try {
        if (typeof window !== 'undefined' && window.okxwallet) {
          // 检测到 OKX 钱包插件
          addLog('检测到 OKX 钱包插件');
          okxProvider.value = window.okxwallet;
        } else {
          // 使用 Universal Provider
          const { OKXUniversalProvider } = await import('@okxconnect/universal-provider');
          
          okxProvider.value = await OKXUniversalProvider.init({
            dappMetaData: {
              name: 'OKX Basic Demo',
              icon: 'https://static.okx.com/cdn/assets/imgs/247/58E63FEA47A2B7D7.png',
              url: 'https://okx.com'
            },
            optionalNamespaces: {
              eip155: {
                methods: [
                  'eth_sendTransaction',
                  'eth_signTransaction',
                  'eth_sign',
                  'personal_sign',
                  'eth_signTypedData',
                  'eth_signTypedData_v4'
                ],
                chains: ['eip155:1', 'eip155:56'],
                events: ['chainChanged', 'accountsChanged'],
                rpcMap: {
                  1: 'https://eth.llamarpc.com',
                  56: 'https://bsc-dataseed1.binance.org'
                }
              },
              tron: {
                methods: [
                  'tron_sendTransaction',
                  'tron_signTransaction',
                  'tron_signMessage'
                ],
                chains: ['tron:0x2b6653dc'],
                events: ['chainChanged', 'accountsChanged'],
                rpcMap: {
                  '0x2b6653dc': 'https://api.trongrid.io'
                }
              }
            }
          });
          addLog('OKX Universal Provider 初始化成功');
        }
      } catch (error) {
        addLog(`Provider 初始化失败: ${error.message}`, 'error');
      }
    };

    // 连接钱包
    const connectWallet = async () => {
      if (!okxProvider.value) {
        addLog('Provider 未初始化', 'error');
        return;
      }

      isConnecting.value = true;
      addLog('开始连接钱包...');

      try {
        let session;
        
        if (window.okxwallet) {
          // 插件钱包连接
          const accounts = await okxProvider.value.request({
            method: 'eth_requestAccounts'
          });
          
          if (accounts && accounts.length > 0) {
            isConnected.value = true;
            currentAccount.value = accounts[0];
            currentChain.value = 'Ethereum';
            addLog('插件钱包连接成功', 'success');
          }
        } else {
          // Universal Provider 连接
          const namespaces = {
            eip155: {
              methods: [
                'eth_sendTransaction',
                'eth_signTransaction',
                'eth_sign',
                'personal_sign',
                'eth_signTypedData',
                'eth_signTypedData_v4'
              ],
              chains: ['eip155:1', 'eip155:56'],
              events: ['chainChanged', 'accountsChanged'],
              rpcMap: {
                1: 'https://eth.llamarpc.com',
                56: 'https://bsc-dataseed1.binance.org'
              }
            },
            tron: {
              methods: [
                'tron_sendTransaction',
                'tron_signTransaction',
                'tron_signMessage'
              ],
              chains: ['tron:0x2b6653dc'],
              events: ['chainChanged', 'accountsChanged'],
              rpcMap: {
                '0x2b6653dc': 'https://api.trongrid.io'
              }
            }
          };

          session = await okxProvider.value.connect({ 
            optionalNamespaces: namespaces 
          });
          
          if (session) {
            isConnected.value = true;
            const accounts = Object.values(session.namespaces).flatMap(ns => ns.accounts);
            if (accounts.length > 0) {
              currentAccount.value = accounts[0].split(':')[2];
              currentChain.value = getChainName(accounts[0].split(':')[1]);
            }
            addLog('Universal Provider 连接成功', 'success');
          }
        }
      } catch (error) {
        addLog(`连接失败: ${error.message}`, 'error');
      } finally {
        isConnecting.value = false;
      }
    };

    // 断开连接
    const disconnectWallet = async () => {
      try {
        if (okxProvider.value && okxProvider.value.disconnect) {
          await okxProvider.value.disconnect();
        }
        isConnected.value = false;
        currentAccount.value = '';
        currentChain.value = '';
        approvalResult.value = null;
        addLog('钱包已断开连接', 'success');
      } catch (error) {
        addLog(`断开连接失败: ${error.message}`, 'error');
      }
    };

    // 获取链名称
    const getChainName = (chainId) => {
      const chain = supportedChains.value.find(c => c.chainId === chainId || c.chainId === `0x${parseInt(chainId).toString(16)}`);
      return chain ? chain.name : `Chain ${chainId}`;
    };

    // 切换链
    const switchChain = async (chain) => {
      if (!okxProvider.value || !isConnected.value) {
        addLog('请先连接钱包', 'error');
        return;
      }

      isSwitching.value = true;
      addLog(`切换到 ${chain.name}...`);

      try {
        if (window.okxwallet) {
          // 插件钱包链切换
          if (chain.namespace === 'tron') {
            addLog('插件钱包不支持Tron链切换', 'error');
            return;
          }
          
          await okxProvider.value.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chain.chainId }]
          });
        } else {
          // Universal Provider 链切换
          if (chain.namespace === 'tron') {
            // Tron 链切换
            await okxProvider.value.request({
              method: 'tron_requestAccounts',
              params: {}
            });
          } else {
            // EVM 链切换
            try {
              await okxProvider.value.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chain.chainId }]
              });
            } catch (switchError) {
              // 如果链不存在，尝试添加链
              if (switchError.code === 4902 && chain.chainId === '0x38') {
                await okxProvider.value.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x38',
                    chainName: 'BNB Smart Chain',
                    nativeCurrency: {
                      name: 'BNB',
                      symbol: 'BNB',
                      decimals: 18
                    },
                    rpcUrls: ['https://bsc-dataseed1.binance.org'],
                    blockExplorerUrls: ['https://bscscan.com']
                  }]
                });
              } else {
                throw switchError;
              }
            }
          }
        }
        
        currentChain.value = chain.name;
        addLog(`成功切换到 ${chain.name}`, 'success');
      } catch (error) {
        addLog(`链切换失败: ${error.message}`, 'error');
      } finally {
        isSwitching.value = false;
      }
    };

    // 授权合约
    const approveContract = async () => {
      if (!okxProvider.value || !isConnected.value) {
        addLog('请先连接钱包', 'error');
        return;
      }

      if (!spenderAddress.value) {
        addLog('请输入授权地址', 'error');
        return;
      }

      isApproving.value = true;
      addLog('开始授权合约...');

      try {
        const spender = spenderAddress.value;
        const amount = approveAmount.value === 'max' 
          ? '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
          : `0x${parseInt(customAmount.value || '0').toString(16)}`;

        addLog(`授权参数: spender=${spender}, amount=${amount}`);

        let result;
        if (currentChain.value === 'Tron') {
          // Tron 授权
          const tronParams = {
            feeLimit: 100000000,
            functionSelector: 'approve(address,uint256)',
            parameter: [
              { type: 'address', value: spender },
              { type: 'uint256', value: amount }
            ],
            to: spender
          };
          
          result = await okxProvider.value.request({
            method: 'tron_sendTransaction',
            params: tronParams
          });
        } else {
          // EVM 授权 - 构建正确的 approve 函数调用
          const spenderHex = spender.slice(2).toLowerCase().padStart(64, '0');
          const amountHex = amount.slice(2).padStart(64, '0');
          const data = `0x095ea7b3${spenderHex}${amountHex}`;
          
          addLog(`交易数据: ${data}`);
          
          const txParams = {
            from: currentAccount.value,
            to: spender, // 这里应该是代币合约地址
            data: data,
            gas: '0x5208', // 21000
            gasPrice: '0x9184e72a000' // 10 gwei
          };
          
          if (window.okxwallet) {
            // 插件钱包
            result = await okxProvider.value.request({
              method: 'eth_sendTransaction',
              params: [txParams]
            });
          } else {
            // Universal Provider
            result = await okxProvider.value.request({
              method: 'eth_sendTransaction',
              params: [txParams]
            });
          }
        }

        if (result) {
          approvalResult.value = {
            txHash: result,
            spender: spenderAddress.value,
            amount: approveAmount.value === 'max' ? '最大金额' : customAmount.value
          };
          addLog(`授权成功: ${result}`, 'success');
        }
      } catch (error) {
        addLog(`授权失败: ${error.message}`, 'error');
      } finally {
        isApproving.value = false;
      }
    };

    // 获取链图标
    const getChainIcon = (chainName) => {
      const icons = {
        'Ethereum': '⟠',
        'BSC': '🟡',
        'Tron': '🔴'
      };
      return icons[chainName] || '🔗';
    };

    // 组件挂载时初始化
    onMounted(() => {
      addLog('组件初始化');
      initProvider();
    });

    return {
      // 响应式数据
      isConnected,
      isConnecting,
      isSwitching,
      isApproving,
      currentAccount,
      currentChain,
      spenderAddress,
      approveAmount,
      customAmount,
      approvalResult,
      logs,
      supportedChains,
      
      // 方法
      connectWallet,
      disconnectWallet,
      switchChain,
      approveContract,
      clearLogs,
      getChainIcon
    };
  }
};
</script>

<style scoped>
.okx-basic-demo {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.header h2 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 700;
}

.header p {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
}

.status-section,
.action-section,
.chain-section,
.approve-section,
.log-section {
  margin-bottom: 24px;
  padding: 24px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.status-section:hover,
.action-section:hover,
.chain-section:hover,
.approve-section:hover,
.log-section:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.8);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-dot.connected {
  background: #28a745;
  box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
}

.status-dot.disconnected {
  background: #dc3545;
  box-shadow: 0 0 10px rgba(220, 53, 69, 0.5);
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}

.status-text {
  font-weight: 600;
  font-size: 14px;
}

.status-section h3,
.action-section h3,
.chain-section h3,
.approve-section h3,
.log-section h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-info {
  display: grid;
  gap: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(248, 249, 250, 0.8);
  border-radius: 12px;
  border-left: 4px solid #007bff;
}

.label {
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.status-text.connected {
  color: #28a745;
}

.status-text.disconnected {
  color: #dc3545;
}

.value {
  font-weight: 600;
  color: #333;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
}

.account-address {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
}

.chain-badge {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.button-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.chain-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.btn {
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn:disabled::before {
  display: none;
}

.btn-primary {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
}

.btn-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  color: white;
  box-shadow: 0 6px 20px rgba(108, 117, 125, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(108, 117, 125, 0.4);
}

.btn-chain {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border: 2px solid rgba(222, 226, 230, 0.8);
  backdrop-filter: blur(10px);
}

.btn-chain:hover:not(:disabled) {
  background: rgba(255, 255, 255, 1);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  border-color: #007bff;
}

.btn-chain.active {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  border-color: #007bff;
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
}

.chain-icon {
  font-size: 20px;
}

.chain-name {
  font-weight: 600;
}

.btn-approve {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.3);
}

.btn-approve:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
}

.btn-clear {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  padding: 8px 16px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.btn-clear:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(220, 53, 69, 0.4);
}

.approve-form {
  display: grid;
  gap: 20px;
}

.form-group {
  display: grid;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.input,
.select {
  padding: 12px 16px;
  border: 2px solid rgba(222, 226, 230, 0.8);
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
}

.input:focus,
.select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.result-section {
  margin-top: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border-radius: 12px;
  border-left: 4px solid #28a745;
}

.result-section h4 {
  margin: 0 0 16px 0;
  color: #155724;
  font-size: 16px;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  background: rgba(248, 249, 250, 0.8);
  border-radius: 12px;
  padding: 16px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  font-size: 13px;
  transition: background 0.3s ease;
}

.log-item:hover {
  background: rgba(255, 255, 255, 0.8);
}

.log-item.success {
  background: rgba(212, 237, 218, 0.6);
  border-left: 3px solid #28a745;
}

.log-item.error {
  background: rgba(248, 215, 218, 0.6);
  border-left: 3px solid #dc3545;
}

.log-item.info {
  background: rgba(209, 236, 241, 0.6);
  border-left: 3px solid #17a2b8;
}

.timestamp {
  color: #666;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  min-width: 80px;
}

.message {
  flex: 1;
  word-break: break-word;
}

@media (max-width: 768px) {
  .okx-basic-demo {
    padding: 16px;
  }
  
  .header {
    padding: 20px;
  }
  
  .header h2 {
    font-size: 24px;
  }
  
  .status-section,
  .action-section,
  .chain-section,
  .approve-section,
  .log-section {
    padding: 20px;
  }
  
  .chain-buttons {
    grid-template-columns: 1fr;
  }
  
  .button-group {
    flex-direction: column;
  }
}
</style>