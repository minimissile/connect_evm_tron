<template>
  <div class="c-asset-spot-select-coin">
    <div class="deposit-coin" @click="isExpand = !isExpand" :class="{ 'is-active': isExpand }">
      <div class="deposit-coin-left-name">
        <div class="icon-box">
          <img v-if="coinName" :src="'@/assets/coins/png/' + coinName + '.png'" class="img-coin" alt="" />
        </div>
        <span class="short-name">{{ coinName === 'BSC' ? 'BNB' : coinName }}</span>
        <!-- <span class="full-name">Tether</span> -->
      </div>
      <i class="el-icon-arrow-down selector-right-icon"></i>
    </div>
    <div v-if="isExpand" class="via-popover-container popper-select-coin" data-popper-placement="bottom-start">
      <div>
        <div class="popper-content-box">
          <div class="search-box">
            <div
              class="via-input"
              @focusout="isFocus = false"
              @focusin="isFocus = true"
              :class="{ 'is-active': isFocus }"
              style-type="area"
              size="small"
            >
              <div class="input-prefix">
                <i class="iconfont icon-icon_search"></i>
              </div>
              <input type="text" placeholder="fast_search_coin" title="" class="input-inner" />
              <div class="input-suffix">
                <i class="iconfont icon-cancel me-4" style="display: none"></i>
              </div>
            </div>
          </div>
          <div v-if="hideHistoryCoinList" class="history-coin-box">
            <div class="sec-title flex justify-between items-center">
              <span>coin_select_history_records</span>
              <i class="iconfont icon-icon-delete" @click="deleteHistoryCoins"></i>
            </div>
            <div class="row-coin">
              <span
                v-for="(item, index) in searchCoinHistory"
                @click="getSelectedCoin(item.currency)"
                :key="index"
                class="item-coin"
              >
                {{ item.currency === 'BSC' ? 'BNB' : item.currency }}
              </span>
            </div>
          </div>
          <div class="hot-coin-box">
            <div class="sec-title flex align-middle">
              <span class="me-5">hot_coins</span>
              <img src="@/assets/image/asset/fire.svg" alt="" />
            </div>
            <div class="row-coin">
              <span
                v-for="(item, index) in hotCoinList"
                @click="getSelectedCoin(item.currency)"
                :key="index"
                class="item-coin"
              >
                {{ item.currency === 'BSC' ? 'BNB' : item.currency }}
              </span>
            </div>
          </div>
          <div class="coin-list-box">
            <div class="sec-title">coins_list</div>
            <div class="all-list">
              <div class="all-list-box">
                <div role="group">
                  <div
                    v-for="(coinItem, index) in supportedCoins"
                    @click="getSelectedCoin(coinItem)"
                    role="listitem"
                    :key="index"
                    class=""
                  >
                    <div class="list-item">
                      <div class="item-inner">
                        <div class="left-sec">
                          <img :src="'@/assets/coins/png/' + coinItem + '.png'" class="img-coin" />
                          <span class="short-name">{{ coinItem === 'BSC' ? 'BNB' : coinItem }}</span>
                        </div>
                        <span class="full-name">{{ coinItem === 'BSC' ? 'BNB' : coinItem }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.me-5 {
  margin-right: 5px;
}
.c-asset-spot-select-coin {
  position: relative;
  .deposit-coin {
    align-items: center;
    background-color: var(--profile-input-bg);
    border: 1px solid transparent;
    border-radius: 4px;
    display: flex;
    height: 40px;
    justify-content: space-between;
    line-height: normal;
    padding-inline-start: 15px;
    position: relative;
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
    cursor: pointer;
    transition: all 0.2s ease-in;
    &:hover,
    &.is-active {
      background-color: var(--bg-0ead98-5);
      border: 1px solid var(--text-base-brand);
      box-shadow: 0 0 2px var(--bg-0ead98-75);
    }
  }
  .deposit-coin-left-name {
    align-items: center;
    display: flex;
  }
  .icon-box {
    border-radius: 50%;
    height: 24px;
    margin-inline-end: 5px;
    overflow: hidden;
    width: 24px;
  }
  .img-coin {
    display: inline-block;
    width: 100%;
  }
  .short-name {
    font-weight: 700;
  }
  .full-name {
    color: var(--profile-step-num-bg);
    font-size: 12px;
    margin-inline-start: 12px;
  }
}
.selector-right-icon {
  color: var(--text-aeb0b3);
  font-weight: 700;
  margin-right: 16px;
  transition: 0.4s;
}
.deposit-coin.is-active {
  .selector-right-icon {
    color: var(--text-0ead98);
    transform: rotate(180deg);
    transition: 0.4s;
  }
}
.popper-select-coin {
  background-color: var(--primary-btn-text);
  border: none;
  box-shadow: 0 10px 40px rgba(164, 197, 205, 0.3);
  margin-top: 0 !important;
  padding: 0;
  width: 550px;
  border-radius: 8px;
  color: var(--primary-sec-text);
  position: absolute;
  inset: 0 auto auto 0;
  top: 48px;
  z-index: 2015;
  max-width: 100%;
  // transform: translate(602px, 256px);
}
.popper-content-box {
  .search-box {
    padding-left: 15px;
    padding-right: 15px;
    margin-top: 15px;
  }
  .via-input {
    background-color: var(--primary-back);
    border: 1px solid transparent;
    height: 30px;
    border-radius: 4px;
    display: flex;
    padding: 0 12px;
    align-items: center;
    &:hover {
      background-color: var(--bg-0ead98-5);
      border: 1px solid var(--text-0ead98);
      box-shadow: 0 0 2px var(--bg-0ead98-75);
      transition: 0.4s;
    }
    .input-prefix {
      margin-left: 12px;
      padding-right: 4px;
    }
    .input-inner {
      font-size: 12px;
      background-color: transparent;
      color: var(--primary-text);
      flex: 1;
      font-weight: 700;
      height: 40px;
      padding-bottom: 12px;
      padding-top: 12px;
      outline: none;
      border: none;
    }
    .input-suffix {
      align-items: center;
      display: flex;
      margin-right: 12px;
      padding-left: 4px;
    }
  }
  .via-input.is-active {
    &:hover {
      background-color: var(--bg-0ead98-5);
      border: 1px solid var(--text-0ead98);
      box-shadow: 0 0 2px var(--bg-0ead98-75);
      transition: 0.4s;
    }
  }
}
.history-coin-box {
  margin-top: 16px;
  padding-left: 15px;
  padding-right: 15px;
  .icon-icon-delete {
    color: var(--text-secondary);
    cursor: pointer;
  }
  .sec-title {
    color: var(--primary-text);
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
.item-coin {
  background-color: var(--bg-fafafa);
  border-radius: 20px;
  color: var(--region-dropdown-item-color);
  cursor: pointer;
  display: inline-block;
  margin-top: 5px;
  margin-right: 8px;
  padding: 4px 20px;
  line-height: 1.5;
  font-size: 14px;
  &:hover {
    background-color: var(--bg-0ead98-5);
    color: var(--text-0ead98);
  }
}
.hot-coin-box {
  margin-top: 16px;
  padding-left: 15px;
  padding-right: 15px;
  .sec-title {
    color: var(--primary-text);
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 4px;
    vertical-align: middle;
    display: flex;
  }
}
.coin-list-box {
  .all-list-box {
    max-height: 246px;
    overflow-y: auto;
  }
  margin-top: 16px;
  .sec-title {
    color: var(--primary-text);
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 4px;
    padding-left: 15px;
    padding-right: 15px;
  }
  .list-item {
    padding-right: 5px;
    padding-left: 15px;
    .item-inner {
      border-bottom: 1px solid var(--primary-border);
      cursor: pointer;
      display: flex;
      line-height: 40px;
    }
    .left-sec {
      align-items: center;
      display: flex;
    }
    .img-coin {
      border-radius: 50%;
      display: inline-block;
      height: 16px;
      margin-inline-end: 5px;
      width: 16px;
    }
    .short-name {
      color: var(--primary-text);
      display: inline-block;
      min-width: 70px;
    }
    .full-name {
      color: var(--primary-sec-text);
      font-size: 12px;
      margin-inline-start: 10px;
    }
  }
}
</style>

<script>
let g_assetTypes = []
let g_assetTypeMap = {}
// import { getBlockchainConfig } from '@/utils/api/asstes'
export default {
  props: ['depositToken'],
  data() {
    return {
      isFocus: false,
      isExpand: false,
      balance_list: [],
      supportedCoins: [],
      balances: [],
      hotCoinList: [],
      hideHistoryCoinList: true,
      coinName: '',
      searchCoinHistory: [],
      baseToken: 'USDT',
    }
  },
  created() {
    this.coinName = this.depositToken || this.baseToken
    this.initAsync()
  },
  mounted() {
    console.log('supportedCoins', this.supportedCoins)
  },
  methods: {
    deleteHistoryCoins() {
      this.hideHistoryCoinList = false
      this.isExpand = false
    },
    getSelectedCoin(value) {
      this.searchCoinHistory.push({ currency: value })
      this.searchCoinHistory = Array.from(new Map(this.searchCoinHistory.map(item => [JSON.stringify(item), item])).values())
      this.coinName = value
      this.isExpand = false
      this.$emit('getSelectedCoinName', this.coinName)
    },
    initAsync: async function () {
      ///////////////////////////////////////////////////////////////////////////////////////
      // Get all asset types.
      const assetTypes = []
      const assetTypeMap = {}

      // USDT and futures margin account will already be displayed at top
      assetTypes.push(this.baseToken)
      // assetTypes.push('FTUSDT');
      assetTypeMap[this.baseToken] = []
      // assetTypeMap['FTUSDT'] = [];

      // Then query blockchain config
      const resp = {
        fiatDescription: 'Please contact online customer service for fiat deposits!',
        supportMultiCoinDeposits: true,
        supportedCoins: [
          {
            currency: 'USDT',
            minDepositAmount: 1,
            minWithdrawAmount: 10,
            maxWithdrawAmount: 50000,
            withdrawFee: 2,
            targetCoins: ['USDT', 'USDT_TRC', 'USDTBEP20'],
          },
          {
            currency: 'USDC',
            minDepositAmount: 1,
            minWithdrawAmount: 10,
            maxWithdrawAmount: 50000,
            withdrawFee: 2,
            targetCoins: ['USDC', 'USDCTRC20', 'USDCBEP20'],
          },
          {
            currency: 'ETH',
            minDepositAmount: 0.001,
            minWithdrawAmount: 0.001,
            maxWithdrawAmount: 50000,
            withdrawFee: 0.0006,
            targetCoins: ['ETH'],
          },
          {
            currency: 'BTC',
            minDepositAmount: 0.0001,
            minWithdrawAmount: 0.0001,
            maxWithdrawAmount: 50000,
            withdrawFee: 0.123,
            targetCoins: ['BTC'],
          },
          {
            currency: 'BNB',
            minDepositAmount: 0.001,
            minWithdrawAmount: 0.01,
            maxWithdrawAmount: 50000,
            withdrawFee: 0.003,
            targetCoins: ['BSC'],
          },
        ],
        identityVerified: true,
        isWithdrawPasswordSet: true,
        requiresWithdrawPassword: true,
      }
      if (!resp) {
        // exit for invalid config
        console.error('Invalid blockchain config.')
        return
      }
      if (resp.supportedCoins) {
        resp.supportedCoins.forEach(item => {
          const upperCoin = item.currency.toUpperCase()

          if (!assetTypeMap[upperCoin]) {
            assetTypes.push(upperCoin)
          }
          assetTypeMap[upperCoin] = item
        })
      }
      this.supportedCoins = assetTypes
      g_assetTypes = Object.freeze(assetTypes)
      g_assetTypeMap = Object.freeze(assetTypeMap)
    },
  },
}
</script>
