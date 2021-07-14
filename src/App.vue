<template>
  <!-- 
    就是上面两个下拉列表，可以选择 1 链 比如 bsc hech eth这些， 还有一个选择gas费，这个允许用户输入
    然后下面是一个允许用户上传文件的地方，用户上传一个文本文件，然后这个文件是一行一个地址，你这边从文件中分析出来这些，旁边一个按钮是转账
    然后下面是一个table，展示打款的一些详细信息
  -->
  <div id="app">
    <header>
      <div class="container">
        <el-row :gutter="20">
          <el-col :span="18">
            <h1>批量转账工具</h1>
          </el-col>
          <el-col :span="6">
            <span v-if="account">{{account | abbr}}</span>
            <!-- <el-button @click="connect" v-else>Input Private Key</el-button> -->
          </el-col>
        </el-row>
      </div>
    </header>

    <main>
      <el-form>
        <el-form-item label="链种类">
          <el-radio v-model="form.chain" label="bscTestnet" border>BSC Testnet</el-radio>
          <!-- <el-radio v-model="form.chain" label="HECH" border>HECH</el-radio>
          <el-radio v-model="form.chain" label="ETH" border>ETH</el-radio> -->
        </el-form-item>
        <el-form-item label="私钥" v-if="!walletWithProvider">
          <el-input type="text" v-model="privateKey" autocomplete="off" ></el-input>
        </el-form-item>
        <el-form-item v-if="!walletWithProvider">
          <el-button type="primary" @click="connect" :disabled="loading" :loading="loading">连接</el-button>
        </el-form-item>
      </el-form>
      <el-form v-if="walletWithProvider" ref="form" label-position="top" :model="form" label-width="200px">
        <el-form-item label="请输入地址和转账金额" prop="address">
          <el-input type="textarea" v-model="form.address" :rows="10" autocomplete="off" @input="addressInput"></el-input>
          <div class="tips">格式：地址 + 英文逗号 + 转账金额。一行一个地址。 <a href="javascript:;" @click="checkDemo">查看Demo</a></div>
        </el-form-item>
        <el-form-item label="详细">
          <!-- <p class="p">Token余额： {{tokenBalance | formatUnits}}</p> -->
          <p class="p">Token转账： {{totalAmount}}</p>
          <!-- <p class="p">BNB余额： {{feeBalance | fromWei}} BNB</p> -->
          <p class="p">GAS费用： {{totalGasCost | fromWei}} BNB</p>
          <p class="p">转账手续费： {{totalFeeUsed | fromWei}} BNB</p>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit" :disabled="loading" :loading="loading">生成Transaction</el-button>
          <el-button type="primary" v-if="transactions.length>0" @click="confirmSubmit" :disabled="loading" :loading="loading">确定转账</el-button>
        </el-form-item>
      </el-form>
      
      <table class="table" v-if="transactions.length>0">
        <tr>
          <!-- <th width="220">Data</th> -->
          <th>Gas</th>
          <th>Nonce</th>
          <th>To</th>
          <th>Fee</th>
        </tr>
        <tr v-for="(item, index) in transactions" :key="index">
          <!-- <td>
            <div class="data" :alt="item.data">{{item.data}}</div>
          </td> -->
          <td>{{item.gasPrice | bn}}</td>
          <td>{{item.nonce}}</td>
          <td>{{item.to}}</td>
          <td>{{item.value | bn}}</td>
        </tr>
      </table>
    </main>

  </div>
</template>

<script>
import BigNumber from 'bignumber.js'
import { ethers } from 'ethers';
import config from './utils/config'
export default {
  name: 'App',
  data() {
    return {
      form: {
        chain: 'bscTestnet',
        address: '',
      },
      privateKey: '8b55a19e9bf951bbea8061dd1d6028a809c0f16af79cbfbf47d384048c8526cc',
      provider: null,
      walletWithProvider: null,
      account: '',
      tokenInstance: null,
      transferInstance: null,
      resultAddress: [],
      resultAmount: [],
      loading: false,
      tokenBalance: '',
      totalAmount: '',
      feeBalance: '',
      gasPrice: '',
      feePercent: '',
      addressArrays: [],
      amountArrays: [],
      feeUsedArray: [],
      totalGasCost: '',
      totalFeeUsed: '',
      transactions: [],
      timer: null
    }
  },
  filters: {
    abbr(val) {
      var _reg = /^(\w{6})\w+(\w{4})$/
      return val ? val.replace(_reg, '$1******$2') : ''
    },
    formatUnits(val) {
      if (val) {
        return ethers.utils.formatUnits(String(val), config[window.vm.$children[0].form.chain].decimals)
      } else {
        return ''
      }
    },
    fromWei(val) {
      if (val) {
        return ethers.utils.formatUnits(String(val), '18')
      } else {
        return ''
      }
    },
    bn(o) {
      return o.toString()
    }
  },
  methods: {
    async connect() {
      this.loading = true
      // Connect a wallet to mainnet
      console.log(this.$config[this.form.chain].endpoint)
      this.provider = new ethers.providers.JsonRpcProvider(this.$config[this.form.chain].endpoint)
      this.walletWithProvider = new ethers.Wallet(this.privateKey, this.provider)
      this.loading = false
      this.account = this.walletWithProvider.address
      // const resb = await this.walletWithProvider.getBalance(this.account)
      // console.log(resb)
      this.init()
    },
    async init() {
      this.tokenInstance = new ethers.Contract(this.$config[this.form.chain].contract['TokenJSON'].address, this.$config[this.form.chain].contract['TokenJSON'].abi, this.provider)
      const res = await this.tokenInstance.balanceOf(this.account)
      this.tokenBalance = res.toString()
      const bnb = await this.provider.getBalance(this.account)
      this.feeBalance = bnb.toString()

    },
    checkDemo() {
      this.form.address = `0xC1b2566B4262bb18ECBfbB89bfBCE98b70257796,10
0xBac7136B6F2C0F6559a7620Ab9Bf27E5687D73F4,20`
      this.addressInput()
    },
    async addressInput() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
      if (this.form.address) {

        setTimeout(async () => {
          this.loading = true
          const addr = this.form.address //window.encodeURIComponent(this.form.address)
          const arr = addr.split('\n')
          this.resultAddress = []
          this.resultAmount = []
          this.totalAmount = 0
          let totalAmount = new BigNumber(0)
          arr.forEach(item => {
            const t = item.split(',')
            this.resultAddress.push(t[0])
            this.resultAmount.push(t[1])
            totalAmount = totalAmount.plus(t[1])
          })
          this.totalAmount = totalAmount.toString()
          this.gasPrice = (await this.provider.getGasPrice()).toString()
          if (!this.transferInstance) {
            this.transferInstance = new ethers.Contract(this.$config[this.form.chain].contract['TransferJSON'].address, this.$config[this.form.chain].contract['TransferJSON'].abi, this.provider)
          }
          this.feePercent = (await this.transferInstance.feePercent()).toString()
          console.log(this.gasPrice)
          console.log(this.feePercent)
          this.loading = false
          this.countFee()
        }, 500);
        
      } else {
        this.loading = false
        this.totalAmount = ''
        this.totalGasCost = ''
        this.totalFeeUsed = ''
        this.transactions = []
      }
    },
    async countFee() {
      this.loading = true
      const numVal = new BigNumber(ethers.utils.parseUnits(this.totalAmount, this.$config[this.form.chain].decimals).toString())

      console.log(this.$config[this.form.chain].contract['TransferJSON'].address)
      console.log(numVal.toString())

      await this.tokenInstance.connect(this.walletWithProvider).approve(
        this.$config[this.form.chain].contract['TransferJSON'].address,
        numVal.toFixed(0)
      )
      console.log('approve ok')
      let totalNum = this.resultAddress.length
      let maxNum = 300
      let loopNum = Math.floor(totalNum / maxNum) + (totalNum % maxNum == 0 ? 0 : 1)
      let addressArrays = [];
      let amountArrays = [];
      let balance = new BigNumber(this.feeBalance);
      let gasPrice = new BigNumber(this.gasPrice);
      let feePercent = new BigNumber(this.feePercent);
      for (let loop = 0; loop < loopNum; loop++) {
        let startIndex = loop * maxNum;
        let endIndex = (loop + 1) * maxNum;
        addressArrays.push(this.resultAddress.slice(startIndex, endIndex));
        amountArrays.push(this.resultAmount.slice(startIndex, endIndex));
      }
      let feeUsedArray = [];
      let gasCostArray = [];
      try {
        console.log(balance.toFixed(0))
        for (let i = 0; i < addressArrays.length; i ++) {
          let addresses = addressArrays[i];
          let amounts = amountArrays[i];
          let gasUsed = new BigNumber((await this.transferInstance.connect(this.walletWithProvider).estimateGas.batchTransfer(
            this.$config[this.form.chain].contract['TokenJSON'].address,
            this.account, 
            addresses, 
            amounts, 
            false, 
            {value: balance.toFixed(0)}
            )).toString()
          );
          let gasCost = gasUsed.multipliedBy(gasPrice);
          let feeUsed = gasUsed.multipliedBy(gasPrice).multipliedBy(feePercent).dividedBy('1000000000000000000');
          feeUsedArray.push(feeUsed);
          gasCostArray.push(gasCost);
        }
      } catch(e) {
        console.log(e)
      }
      let totalFeeUsed = new BigNumber('0');
      for (let feeUsed in feeUsedArray) {
        feeUsed = feeUsedArray[feeUsed];
        totalFeeUsed = totalFeeUsed.plus(feeUsed);
      }
      let totalGasCost = new BigNumber('0');
      for (let gasCost in gasCostArray) {
        gasCost = gasCostArray[gasCost];
        totalGasCost = totalGasCost.plus(gasCost);
      }
      this.totalFeeUsed = totalFeeUsed.toFixed(0)
      this.totalGasCost = totalGasCost.toFixed(0)
      this.addressArrays = addressArrays
      this.amountArrays = amountArrays
      this.feeUsedArray = feeUsedArray
      this.loading = false
    },
    async onSubmit() {
      this.loading = true
      const loading = this.$loading({
        lock: true,
        text: 'Loading',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });
      let nonce = await this.provider.getTransactionCount(this.account);

      let gasPrice = new BigNumber(this.gasPrice)

      let transactions = []
      for (let i = 0; i < this.addressArrays.length; i ++) {
        let addresses = this.addressArrays[i];
        let amounts = this.amountArrays[i];
        let feeUsed = this.feeUsedArray[i];
        let transaction = await this.transferInstance.populateTransaction.batchTransfer(
          this.$config[this.form.chain].contract['TokenJSON'].address,
          this.account, 
          addresses, 
          amounts, 
          false, 
          {value: feeUsed.toFixed(0), nonce: nonce++, gasPrice: gasPrice.toFixed(0)}
        );
        transactions.push(transaction);
      }
      this.transactions = transactions
      console.log('transactions')
      console.log(this.transactions)
      
      // let txs = []
      // for (let i = 0; i < transactions.length; i ++) {
      //   let transaction = transactions[i];
      //   let tx = await this.walletWithProvider.sendTransaction(transaction);
      //   txs.push(tx);
      // }
      // for (let i = 0; i < txs.length; i ++) {
      //   let tx = txs[i];
      //   tx = await tx.wait();
      // }
      this.loading = false
      loading.close()
    },
    async confirmSubmit() {
      let txs = []
      for (let i = 0; i < this.transactions.length; i ++) {
        let transaction = this.transactions[i];
        let tx = await this.walletWithProvider.sendTransaction(transaction);
        txs.push(tx);
      }
      for (let i = 0; i < txs.length; i ++) {
        let tx = txs[i];
        tx = await tx.wait();
      }
    }
  }
}
</script>

<style lang="less">
* {
  padding: 0;
  margin: 0;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
header {
  width: 100%;
  height: auto;
  padding: 15px;
  box-shadow: 0 4px 6px 0 rgba(178, 178, 184, 0.2);
  h1 {
    font-size: 20px;
  }
}
main {
  padding: 20px 30px;
  font-size: 16px;
}
.el-form--label-top .el-form-item__label {
  padding-bottom: 0;
  font-size: 16px;
  color: #666;
}
.p {
  line-height: 28px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  border-top: 1px solid #eee;
  // border-bottom: 1px solid #eee;
  th {
    padding: 10px 0 0;
  }
  td {
    vertical-align: middle;
    border-bottom: 1px solid #eee;
    padding: 10px;
    text-align: center;
  }
  .data {
    width: 240px;
    height: 48px;
    line-height: 24px;
    font-size: 12px;
    word-break: break-all;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
</style>
