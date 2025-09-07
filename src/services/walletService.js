import { ethers } from 'ethers'
import TronWeb from 'tronweb'
import { SignClient } from '@walletconnect/sign-client'
import { WalletConnectModal } from '@walletconnect/modal'
import { ChainType, ChainConfig, MobileWalletSchemes } from '@/utils/chainConfig'

// 全局钱包状态
let walletState = {
  connected: false,
  address: '',
  chainType: ChainType.ETH,
  provider: null,
  signClient: null,
  session: null,
  eventListeners: {
    accountsChanged: null,
    disconnect: null,
    chainChanged: null,
    tronAccountsChanged: null,
    tronDisconnected: null,
    tronChainChanged: null
  },
  checkTimer: null
}

// WalletConnect v2配置
const WC_V2_CONFIG = {
  projectId: 'da86e4b4584399bf3c78bb7f8026cd64', // 替换为你的Project ID
  metadata: {
    name: 'MultiChain Wallet Demo',
    description: 'Vue3 Multi-Chain Wallet Demo',
    url: window.location.origin, // 使用当前域名
    icons: [`${window.location.origin}/favicon.ico`]
  }
}
//
// /**
//  * 新增：清除所有钱包相关缓存（localStorage/sessionStorage）
//  */
// const clearWalletCache = () => {
//   console.log('开始清理钱包缓存...')
//   // 1. 清除localStorage中与钱包相关的键
//   const localStorageKeys = Object.keys(localStorage)
//   localStorageKeys.forEach(key => {
//     if (
//         key.includes('wallet') ||
//         key.includes('ethereum') ||
//         key.includes('WC_') || // WalletConnect缓存
//         key.includes('phantom') || // Phantom缓存
//         key.includes('trust') || // Trust Wallet缓存
//         key.includes('okx') // OKX Wallet缓存
//     ) {
//       localStorage.removeItem(key)
//       console.log(`清除localStorage缓存：${key}`)
//     }
//   })
//
//   // 2. 清除sessionStorage中与钱包相关的键
//   const sessionStorageKeys = Object.keys(sessionStorage)
//   sessionStorageKeys.forEach(key => {
//     if (
//         key.includes('wallet') ||
//         key.includes('ethereum') ||
//         key.includes('WC_')
//     ) {
//       sessionStorage.removeItem(key)
//       console.log(`清除sessionStorage缓存：${key}`)
//     }
//   })
//
//   // 3. 清除window.ethereum缓存（重置权限）
//   if (window.ethereum) {
//     // 请求空权限以重置缓存（部分钱包支持）
//     window.ethereum.request({
//       method: 'wallet_requestPermissions',
//       params: []
//     }).catch(err => {
//       console.log('重置钱包权限失败（部分钱包不支持）:', err)
//     })
//
//     // 清除已记住的钱包（部分钱包支持）
//     if (window.ethereum.forgetIdentity) {
//       window.ethereum.forgetIdentity().catch(err => {
//         console.log('清除钱包身份缓存失败:', err)
//       })
//     }
//
//     // 重置提供者（避免缓存上次连接的钱包）
//     window.ethereum.setProvider = null
//     console.log('重置window.ethereum缓存')
//   }
// }

/**
 * 清除所有事件监听
 */
const clearAllEventListeners = () => {
  // 清除ETH类钱包事件
  if (window.ethereum && walletState.eventListeners.accountsChanged) {
    window.ethereum.removeListener(
        'accountsChanged',
        walletState.eventListeners.accountsChanged
    )
    window.ethereum.removeListener(
        'disconnect',
        walletState.eventListeners.disconnect
    )
    window.ethereum.removeListener(
        'chainChanged',
        walletState.eventListeners.chainChanged
    )
  }

  // 清除TronLink事件
  if (window.okxwallet.tronWeb && walletState.eventListeners.tronAccountsChanged) {
    window.okxwallet.tronWeb.off(
        'accountsChanged',
        walletState.eventListeners.tronAccountsChanged
    )
    window.okxwallet.tronWeb.off(
        'disconnected',
        walletState.eventListeners.tronDisconnected
    )
    window.okxwallet.tronWeb.off(
        'chainChanged',
        walletState.eventListeners.tronChainChanged
    )
  }

  // 清除定时校验
  if (walletState.checkTimer) {
    clearInterval(walletState.checkTimer)
    walletState.checkTimer = null
  }

  // 重置监听器存储
  walletState.eventListeners = {
    accountsChanged: null,
    disconnect: null,
    chainChanged: null,
    tronAccountsChanged: null,
    tronDisconnected: null
  }
}

/**
 * 监听钱包原生事件
 */
const setupWalletEventListeners = (chainType) => {
  clearAllEventListeners()

  if (chainType === ChainType.TRON && window.okxwallet?.tronWeb) {
    // 绑定OKX钱包的TRON事件
    const tronWeb = window.okxwallet.tronWeb
    const onTronAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        resetWalletState()
        console.log('OKX TRON地址已清空，同步断开状态')
      } else if (accounts[0] !== walletState.address) {
        walletState.address = accounts[0]
        console.log('OKX TRON账户切换，更新地址:', accounts[0])
      }
    }
    const onTronDisconnected = () => {
      resetWalletState()
      console.log('OKX TRON主动断开，同步断开状态')
    }
    const onTronChainChanged = (chainInfo) => {
      console.log('OKX TRON链切换事件:', chainInfo)
      // TRON链切换处理逻辑
      if (chainInfo && chainInfo.chainId) {
        console.log('TRON链已切换到:', chainInfo.chainId)
        // 可以在这里添加链切换后的状态更新逻辑
      }
    }

    tronWeb.on('accountsChanged', onTronAccountsChanged)
    tronWeb.on('disconnected', onTronDisconnected)
    tronWeb.on('chainChanged', onTronChainChanged)
    walletState.eventListeners.tronAccountsChanged = onTronAccountsChanged
    walletState.eventListeners.tronDisconnected = onTronDisconnected
    walletState.eventListeners.tronChainChanged = onTronChainChanged
  } else if (window.ethereum) {
    // ETH类钱包事件（支持MetaMask/OKX/Trust/Phantom）
    const onAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        resetWalletState()
        console.log('钱包地址已清空，同步断开状态')
      } else if (accounts[0] !== walletState.address) {
        walletState.address = accounts[0]
        console.log('钱包账户切换，更新地址')
      }
    }
    const onDisconnect = (error) => {
      resetWalletState()
      console.log('钱包主动断开，同步断开状态:', error)
    }
    const onChainChanged = (chainId) => {
      walletState.chainType = getChainTypeByChainId(chainId)
      console.log('链切换，更新链类型:', walletState.chainType)
    }

    // 绑定标准EIP-1193事件
    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('disconnect', onDisconnect)
    window.ethereum.on('chainChanged', onChainChanged)
    walletState.eventListeners.accountsChanged = onAccountsChanged
    walletState.eventListeners.disconnect = onDisconnect
    walletState.eventListeners.chainChanged = onChainChanged
  }

  // 定时状态校验
  // walletState.checkTimer = setInterval(() => {
  //   checkWalletConnectionStatus()
  // }, 5000)
}

/**
 * 根据链ID获取链类型（适配多钱包链ID格式）
 */
const getChainTypeByChainId = (chainId) => {
  const chainIdNum = parseInt(chainId, 16) || parseInt(chainId)
  switch (chainIdNum) {
    case 1: // 以太坊主网
    case 5: // 以太坊测试网
      return ChainType.ETH
    case 56: // BSC主网
    case 97: // BSC测试网
      return ChainType.BSC
    default:
      return ChainType.ETH
  }
}

/**
 * 校验钱包连接状态
 */
const checkWalletConnectionStatus = async () => {
  if (!walletState.connected) return

  try {
    if (walletState.chainType === ChainType.TRON && window.okxwallet.tronWeb) {
      // 增加延迟，等待钱包地址同步
      setTimeout(async () => {
        const currentAddress = window.okxwallet.tronWeb.defaultAddress.base58
        if (!currentAddress || currentAddress !== walletState.address) {
          // 二次确认地址是否真的无效
          const confim = await window.okxwallet.tronWeb.defaultAddress.base58
          if (!confim || confim !== walletState.address) {
            resetWalletState()
            console.log('okx tron连接失效，同步断开状态')
          }
        }
      }, 1000) // 延迟1秒校验
    } else if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (!accounts || accounts.length === 0 || accounts[0] !== walletState.address) {
        resetWalletState()
        console.log('ETH类钱包连接失效，同步断开状态')
      }
    } else if (walletState.signClient && walletState.session) {
      const sessionExists = walletState.signClient.session.values.some(
          (s) => s.topic === walletState.session.topic
      )
      if (!sessionExists) {
        resetWalletState()
        console.log('WalletConnect会话失效，同步断开状态')
      }
    }
  } catch (error) {
    resetWalletState()
    console.log('钱包连接校验失败，同步断开状态:', error)
  }
}

/**
 * 初始化WalletConnect v2
 */
export const initWalletConnectV2 = async (chainType) => {
  if (walletState.signClient) {
    if (walletState.session) {
      await walletState.signClient.disconnect({
        topic: walletState.session.topic,
        reason: { code: 5900, message: 'Disconnected by user' }
      })
    }
    walletState.signClient = null
    walletState.session = null
  }

  const chainConfig = ChainConfig[chainType]
  let wcChainId = ''
  switch (chainType) {
    case ChainType.ETH:
      wcChainId = 'eip155:1'
      break
    case ChainType.BSC:
      wcChainId = 'eip155:56'
      break
    case ChainType.TRON:
      wcChainId = 'tron:0'
      break
    default:
      wcChainId = 'eip155:1'
  }

  try {
    console.log('初始化WalletConnect v2...', {
      projectId: WC_V2_CONFIG.projectId,
      chainType,
      wcChainId,
      metadata: WC_V2_CONFIG.metadata
    })

    const signClient = await SignClient.init({
      projectId: WC_V2_CONFIG.projectId,
      metadata: WC_V2_CONFIG.metadata
    })
    console.log('SignClient初始化成功')

    const modal = new WalletConnectModal({
      projectId: WC_V2_CONFIG.projectId,
      metadata: WC_V2_CONFIG.metadata,
      themeMode: 'light',
      enableExplorer: true, // 启用钱包浏览器
      explorerRecommendedWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
      ]
    })
    console.log('WalletConnectModal初始化成功')

    const connectPromise = signClient.connect({
      requiredNamespaces: {
        ...(chainType !== ChainType.TRON && {
          eip155: {
            chains: [wcChainId],
            methods: ['eth_requestAccounts', 'eth_sendTransaction', 'eth_sign'],
            events: ['chainChanged', 'accountsChanged']
          }
        }),
        ...(chainType === ChainType.TRON && {
          tron: {
            chains: [wcChainId],
            methods: ['tron_requestAccounts', 'tron_sendTransaction'],
            events: ['chainChanged', 'accountsChanged']
          }
        })
      }
    })
    console.log('开始连接请求...')
    
    await connectPromise

    signClient.on('session_connected', (event) => {
      walletState.session = event.session
      walletState.signClient = signClient
      const accounts = Object.values(event.session.namespaces)[0].accounts
      if (accounts && accounts.length > 0) {
        walletState.address = accounts[0].split(':')[2]
        walletState.connected = true
        walletState.chainType = chainType
        initProvider(chainType, signClient, wcChainId)
        setupWalletEventListeners(chainType)
      }
    })

    signClient.on('session_disconnected', (event) => {
      console.log('WalletConnect会话断开:', event)
      resetWalletState()
    })

    signClient.on('session_expired', (event) => {
      console.log('WalletConnect会话过期:', event)
      resetWalletState()
    })

    // 等待连接请求完成后再打开弹窗
    console.log('打开WalletConnect弹窗...')
    modal.openModal()
    
    // 添加弹窗关闭监听
    modal.subscribeModal((state) => {
      console.log('WalletConnect弹窗状态:', state)
      if (!state.open) {
        console.log('用户关闭了WalletConnect弹窗')
      }
    })
    
    return true
  } catch (error) {
    console.error('WalletConnect v2连接失败:', error)
    resetWalletState()
    throw new Error(`扫码连接失败：${error.message || '未知错误'}`)
  }
}

/**
 * 连接Chrome钱包（支持MetaMask/OKX/Trust/Phantom）
 * 核心：使用标准EIP-1193接口，不硬编码钱包名称
 */
export const connectChromeWallet = async (chainType) => {
  let provider, address
  const chainConfig = ChainConfig[chainType]

  try {
    if (chainType === ChainType.TRON) {
      // accounts = await window.tronWeb.request({ method: 'tron_requestAccounts' })
      await window.okxwallet.tronLink.request({method: 'tron_requestAccounts'})
      address = window.okxwallet.tronWeb.defaultAddress.base58

      provider = window.okxwallet.tronWeb
      // address = provider.defaultAddress.base58
      if (!address) throw new Error('okx未授权地址')
    } else {
      // ETH/BSC链：支持所有EIP-1193兼容钱包（MetaMask/OKX/Trust/Phantom）
      if (!window.ethereum) throw new Error('未检测到兼容钱包，请安装支持EIP-1193的钱包（如MetaMask、Trust、OKX、Phantom）')

      // 关键：调用标准接口触发钱包选择弹窗，不指定钱包
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
        params: [] // 空参数触发钱包选择
      })

      if (!accounts || accounts.length === 0) throw new Error('未授权钱包地址')
      address = accounts[0]
      provider = new ethers.providers.Web3Provider(window.ethereum)

      // 切换到目标链
      const currentChainId = await provider.send('eth_chainId', [])
      const targetChainId = `0x${chainConfig.chainId.toString(16)}`
      if (currentChainId !== targetChainId) {
        await provider.send('wallet_switchEthereumChain', [{ chainId: targetChainId }])
      }
    }

    // 更新状态并绑定事件
    walletState = {
      ...walletState,
      connected: true,
      address,
      chainType,
      provider,
      signClient: null,
      session: null
    }

    setupWalletEventListeners(chainType)

    return { address, provider }
  } catch (error) {
    resetWalletState()
    // 优化错误提示，区分不同钱包问题
    if (error.message.includes('User rejected')) {
      throw new Error('用户拒绝了钱包授权')
    } else if (error.message.includes('No Ethereum provider')) {
      throw new Error('未检测到钱包，请先安装兼容钱包（如MetaMask、Trust、OKX、Phantom）')
    } else {
      throw new Error(`连接失败：${error.message}`)
    }
  }
}

/**
 * 连接TronLink钱包
 */
export const connectTronlinkWallet = async () => {
  try {
    // 检查TronLink是否安装
    if (!window.tronLink && !window.tronWeb) {
      throw new Error('未检测到TronLink钱包，请先安装TronLink浏览器扩展')
    }

    let address = null

    // 尝试不同的TronLink连接方式
    if (window.tronLink) {
      try {
        // 新版TronLink API
        const result = await window.tronLink.request({
          method: 'tron_requestAccounts'
        })
        
        if (result && result.code === 200) {
          // 请求成功后，等待TronWeb更新地址信息
          await new Promise((resolve) => {
            const checkAddress = () => {
              if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
                address = window.tronWeb.defaultAddress.base58
                resolve()
              } else {
                setTimeout(checkAddress, 100)
              }
            }
            checkAddress()
            // 3秒超时
            setTimeout(() => resolve(), 3000)
          })
        }
      } catch (requestError) {
        console.warn('TronLink request方法失败，尝试其他方式:', requestError)
      }
    }

    // 如果上面的方法失败，尝试直接检查tronWeb
    if (!address && window.tronWeb && window.tronWeb.defaultAddress) {
      address = window.tronWeb.defaultAddress.base58
    }

    // 如果还是没有地址，尝试等待TronLink初始化
    if (!address) {
      await new Promise((resolve) => {
        const checkTronWeb = () => {
          if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
            address = window.tronWeb.defaultAddress.base58
            resolve()
          } else {
            setTimeout(checkTronWeb, 100)
          }
        }
        checkTronWeb()
        // 5秒超时
        setTimeout(() => resolve(), 5000)
      })
    }

    if (!address) {
      throw new Error('TronLink未返回有效地址，请检查钱包是否解锁或授权')
    }

    // 更新钱包状态
    walletState = {
      ...walletState,
      connected: true,
      address,
      chainType: ChainType.TRON,
      provider: window.tronWeb,
      signClient: null,
      session: null
    }

    // 设置事件监听
    setupWalletEventListeners(ChainType.TRON)

    return { address, provider: window.tronWeb }
  } catch (error) {
    resetWalletState()
    throw new Error(`TronLink连接失败：${error.message}`)
  }
}

/**
 * 唤起手机钱包
 */
export const openMobileWallet = (chainType, walletName) => {
  const scheme = MobileWalletSchemes[walletName]
  if (!scheme) throw new Error(`不支持的钱包：${walletName}`)

  let deeplink = ''
  switch (walletName) {
    case 'metamask':
      deeplink = `metamask://wc?uri=${encodeURIComponent(window.location.href)}`
      break
    case 'trust':
      deeplink = `trust://walletconnect?uri=${encodeURIComponent(window.location.href)}`
      break
    case 'imtoken':
      deeplink = `imtoken://wc?uri=${encodeURIComponent(window.location.href)}`
      break
    case 'okx':
      deeplink = `okx://walletconnect?uri=${encodeURIComponent(window.location.href)}`
      break
    case 'phantom':
      deeplink = `phantom://walletconnect?uri=${encodeURIComponent(window.location.href)}`
      break
    case 'tronlink':
      deeplink = `tronlink://walletconnect?uri=${encodeURIComponent(window.location.href)}`
      break
  }

  if (window.navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
    window.location.href = deeplink
  } else {
    throw new Error('请在移动端打开以唤起钱包')
  }
  return true
}

/**
 * 断开钱包连接（核心：添加缓存清理）
 */
export const disconnectWallet = async () => {
  try {
    // 1. 断开WalletConnect会话
    if (walletState.signClient && walletState.session) {
      await walletState.signClient.disconnect({
        topic: walletState.session.topic,
        reason: { code: 5900, message: 'Disconnected by user' }
      })
    }
    console.log('用户断开钱包')
    // 2. 断开ETH类钱包连接
    if (window.ethereum && walletState.chainType !== ChainType.TRON) {
      // 重置权限
      // await window.ethereum.request({
      //   method: 'wallet_requestPermissions',
      //   params: []
      // }).catch(() => {})
      //
      // // 清除账户缓存
      // await window.ethereum.request({
      //   method: 'eth_requestAccounts',
      //   params: []
      // }).catch(() => {})
    }

    // 3. 断开TronLink连接
    if (window.okxwallet.tronWeb && walletState.chainType === ChainType.TRON) {
      window.okxwallet.tronWeb.defaultAddress = { base58: '', hex: '' }
    }

    // 4. 关键：清理所有钱包缓存（解决无法重新选择问题）
    // clearWalletCache()

  } finally {
    console.log('充值状态')
    // 5. 重置状态+清除事件监听
    resetWalletState()
  }
}

/**
 * 重置钱包状态
 */
export const resetWalletState = () => {
  clearAllEventListeners()
  if (walletState.connected) {
    walletState.connected = false
    walletState.address = ''
    walletState.provider = null
    clearAllEventListeners()
    console.log('钱包状态已重置')
  }
  if (walletState.signClient && walletState.session) {
    walletState.signClient.disconnect({
      topic: walletState.session.topic,
      reason: { code: 5900, message: 'Session reset' }
    }).catch((err) => console.log('WalletConnect断开失败:', err))
  }

  walletState = {
    ...walletState,
    connected: false,
    address: '',
    chainType: ChainType.ETH,
    provider: null,
    signClient: null,
    session: null
  }
}

/**
 * 初始化Provider
 */
const initProvider = (chainType, signClient, wcChainId) => {
  const chainConfig = ChainConfig[chainType]
  if (chainType === ChainType.TRON) {
    walletState.provider = new TronWeb({
      fullHost: chainConfig.rpcUrl,
      privateKey: '',
      signClient: signClient
    })
  } else {
    walletState.provider = new ethers.providers.Web3Provider({
      request: async (args) => {
        const { method, params } = args
        const topic = walletState.session.topic
        const response = await signClient.request({
          topic,
          chainId: wcChainId,
          request: { method, params }
        })
        return response
      }
    })
  }
}

/**
 * 获取当前钱包状态
 */
export const getWalletState = () => ({ ...walletState })

export const updateGlobalWalletState = (state) => {
  walletState = { ...walletState, ...state };
};