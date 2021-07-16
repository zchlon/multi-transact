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
          <el-col :span="12">
            <h1>批量转账工具</h1>
          </el-col>
          <el-col :span="12">
            <span style="display:inline-block;margin-right:20px" v-if="walletAccount">{{walletAccount | abbr}} <small>(metaMask)</small></span>
            <span v-if="account">{{account | abbr}} <small>(fee)</small></span>
            <!-- <el-button @click="connect" v-else>Input Private Key</el-button> -->
          </el-col>
        </el-row>
      </div>
    </header>

    <main>
      <el-form >
        <el-form-item label="链类型">
          <el-select v-model="form.chain" placeholder="请选择">
            <el-option
              v-for="(item, key) in $config"
              :key="key"
              :label="item.name"
              :value="key">
            </el-option>
          </el-select>
        </el-form-item>
        <div class="el-form-item__label" style="text-align:left;float:none;">
          请输入Token合约地址
          <el-tooltip class="item" effect="dark" content="需空投的代币合约地址" placement="top">
          <i class="el-icon-warning-outline" style="font-size:18px;"></i>
        </el-tooltip>
        </div>
        <el-form-item label="">
          <el-input type="text" v-model="tokenContract" autocomplete="off" placeholder="0xbd2F3a31154AfB86bA921E4f418C46FdAf2737BE"></el-input>
        </el-form-item>
        
        <div class="el-form-item__label" style="text-align:left;float:none;" v-if="!feeWalletWithProvider">
          手续费钱包私钥
          <el-tooltip class="item" effect="dark" content="`提供gas费用，及服务手续费的账户，请确保账户中有足够的BNB用于手续费消耗。该信息只会在前端页面使用，不会缓存及上传，私钥信息不会泄露`" placement="top">
          <i class="el-icon-warning-outline" style="font-size:18px;"></i>
        </el-tooltip>
        </div>
        <el-form-item label="" v-if="!feeWalletWithProvider">
          <el-input type="text" v-model="privateKey" autocomplete="off" ></el-input>
        </el-form-item>

        <el-form-item v-if="!feeWalletWithProvider">
          <el-button type="primary" @click="connect" :disabled="loading" :loading="loading">MetaMask连接</el-button>
          <!-- <el-button @click="openSearch"><i class="el-icon-search"></i> 搜索转账结果</el-button> -->
        </el-form-item>
      </el-form>

      <el-form v-if="feeWalletWithProvider" ref="form" label-position="top" :model="form" label-width="200px">
        <el-form-item label="GAS费">
          <el-input type="text" v-model="gasPrice" autocomplete="off" style="width:300px;"></el-input>
        </el-form-item>
        <el-form-item label="请输入地址和转账金额" prop="address">
          <el-input type="textarea" v-model="form.address" :rows="10" autocomplete="off" @input="addressInput"></el-input>
          <div class="tips">格式：地址 + 英文逗号 + 转账金额。一行一个地址。 <a href="javascript:;" @click="checkDemo">查看Demo</a></div>
        </el-form-item>
        <el-form-item label="详细">
          <!-- <p class="p">Token余额： {{tokenBalance | formatUnits}}</p> -->
          <p class="p">Token转账： {{totalAmount}}</p>
          <!-- <p class="p">BNB余额： {{feeBalance | fromWei}} BNB</p> -->
          <!-- <p class="p">GAS总费用： {{totalGasCost | fromWei}} BNB</p>
          <p class="p">转账手续费： {{totalFeeUsed | fromWei}} BNB</p> -->
          <p class="p">转账手续费： {{totalGasFeeCost | fromWei}} BNB</p>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" v-if="!checkApprove" @click="approve" :disabled="loading || resultAddress.length==0" :loading="loading">Approve授权</el-button>
          <el-button type="primary" v-if="checkApprove && transactions.length == 0" @click="countFee" :disabled="loading" :loading="loading">生成Transaction</el-button>
          <el-button type="primary" v-if="transactions.length>0" @click="confirmSubmit" :disabled="loading" :loading="loading">确定转账</el-button>
          <!-- <el-button @click="openSearch"><i class="el-icon-search"></i> 搜索转账结果</el-button> -->
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
      <table class="table" v-if="record.length>0">
        <tr>
          <th></th>
          <th>交易Hash</th>
        </tr>
        <tr v-for="(item, index) in record" :key="index">
          <td>{{index + 1}}</td>
          <td><a target="_blank" style="color:#409EFF" :href="$config[form.chain].txURL + item.transactionHash">{{item.transactionHash}}</a></td>
        </tr>
      </table>
    </main>

    <div class="search-panel" v-if="searchVisible">
      <div class="inner">
        <el-row type="flex" justify="center">
          <el-col :span="14">
            <el-input v-model="keyword" placeholder="钱包地址" clearable></el-input>
          </el-col>
          <el-col :span="6">
            <el-button type="primary" style="margin-left:10px" @click="search">搜索</el-button>
            <el-button style="margin-left:10px" @click="searchVisible=false">返回</el-button>
          </el-col>
        </el-row>
        <el-row type="flex" justify="center" style="padding-top:40px">
          <el-col :span="24">搜索结果：</el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-table
              v-loading="loading"
              :data="searchResult"
              style="width: 100%">
              <el-table-column
                type="index"
                width="50">
              </el-table-column>
              <el-table-column
                prop="to"
                label="转给">
              </el-table-column>
              <el-table-column
                label="数量"
                width="100">
                <template slot-scope="scope">
                  <span>{{ scope.row.amount | formatUnits }}</span>
                </template>
              </el-table-column>
              <el-table-column
                label="币名"
                width="60">
                <template slot-scope="scope">
                  <span>{{ scope.row.token.symbol }}</span>
                </template>
              </el-table-column>
              <el-table-column
                label="Hash"
                width="220">
                <template slot-scope="scope">
                  <span>{{ scope.row.transaction.id }}</span>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="more" style="text-align:center;padding:20px;">
              <el-button @click="getMore">加载下一页</el-button>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <div class="loading-wrap" v-if="transactionsLoading">
      <i class="el-icon-loading"></i>
      <span style="padding:0 6px;">{{stepTitle}} ({{currentStep}}/{{allStep}})</span>
    </div>
  </div>
</template>

<script>
import BigNumber from 'bignumber.js'
import { ethers } from 'ethers';
import config from './utils/config'
import {transferFromInfosQuery} from './utils/query'
export default {
  name: 'App',
  data() {
    return {
      form: {
        chain: 'bscTestnet',
        address: '',
      },
      tokenContract: '',
      privateKey: '',
      provider: null,
      metamaskProvider: null,
      feeWalletWithProvider: null,
      account: '',
      signer: '',
      walletAccount: '',
      tokenInstance: null,
      transferInstance: null,
      resultAddress: [],
      resultAmount: [],
      checkApprove: false,
      loading: false,
      tokenBalance: '',
      lastAmount: 0,
      totalAmount: 0,
      feeBalance: '',
      gasPrice: '',
      feePercent: '',
      addressArrays: [],
      amountArrays: [],
      feeUsedArray: [],
      totalGasCost: '',
      totalFeeUsed: '',
      transactionsLoading: false,
      transactions: [],
      timer: null,
      record: [],
      searchVisible: false,
      keyword: '',
      searchResult: [],
      page: 0,
      more: false,
      currentStep: 0,
      allStep: 0,
      stepTitle: ''
    }
  },
  computed: {
    totalGasFeeCost() {
      if(this.totalGasCost && this.totalFeeUsed) {
        return new BigNumber(this.totalGasCost).plus(parseFloat(this.totalFeeUsed)).toString()
      } else {
        return '0'
      }
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
  mounted() {
    // this.transactionsLoading = true
  },
  methods: {
    async connect() {
      if (!this.tokenContract) {
        this.$message({
          message: '请输入需空投的代币合约地址',
          type: 'error',
          offset: 80
        });
        return
      } else if (!this.privateKey) {
        this.$message({
          message: '请输入钱包私钥',
          type: 'error',
          offset: 80
        });
        return
      }

      this.loading = true

      const loading = this.$loading({
        lock: true,
        text: 'Loading',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });
      // Connect a wallet      
      try {
        this.metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        this.walletAccount = accounts[0]
        
        this.provider = new ethers.providers.JsonRpcProvider(this.$config[this.form.chain].endpoint)
        this.feeWalletWithProvider = new ethers.Wallet(this.privateKey, this.provider)
        this.account = this.feeWalletWithProvider.address.toLowerCase()

        const bnb = await this.metamaskProvider.getBalance(this.account)
        this.feeBalance = bnb.toString()
        this.gasPrice = (await this.metamaskProvider.getGasPrice()).toString()

        this.loading = false
        loading.close()
      } catch(e) {
        this.loading = false
        loading.close()
        console.error(e)
        this.$message({
          message: JSON.stringify(e),
          type: 'error',
          offset: 50
        });
      }
      // if (this.account.toLowerCase() == this.walletAccount.toLowerCase()) {
      //   this.$alert('手续费钱包不能和MetaMask当前钱包一样', '提示', {
      //     confirmButtonText: '确定'
      //   }).then(() => {
      //     window.location.reload()
      //   })
      // }
    },
    checkDemo() {
      this.form.address = `0xC1b2566B4262bb18ECBfbB89bfBCE98b70257796,10
0x8B5D6DF33d3a0AA991AE653361a3ac86Fc713d92,20`
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
          const addr = this.form.address
          const arr = addr.split('\n')
          this.resultAddress = []
          this.resultAmount = []
          this.totalAmount = 0
          let totalAmount = new BigNumber(0)
          arr.forEach(item => {
            if (item) {
              const t = item.split(',')
              this.resultAddress.push(t[0])
              this.resultAmount.push(ethers.utils.parseUnits(t[1], config[window.vm.$children[0].form.chain].decimals).toString())
              totalAmount = totalAmount.plus(t[1])
            }
          })
          this.totalAmount = totalAmount.toString()
          this.transactions = []
          if (new BigNumber(this.totalAmount).isGreaterThan(new BigNumber(this.lastAmount))) {
            this.checkApprove = false
          }
          console.log(this.gasPrice)
          console.log(this.feePercent)
          this.loading = false
        }, 500);
        
      } else {
        this.loading = false
        this.totalAmount = ''
        this.totalGasCost = ''
        this.totalFeeUsed = ''
        this.transactions = []
      }
    },
    async approve() {
      if (this.resultAddress) {
        const loading = this.$loading({
          lock: true,
          text: 'Loading',
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        });
        try {
          this.signer = this.metamaskProvider.getSigner();
          this.tokenInstance = new ethers.Contract(this.tokenContract, this.$config[this.form.chain].abi, this.signer)
          const res = await this.tokenInstance.balanceOf(this.walletAccount)
          this.tokenBalance = res.toString()

          const numVal = new BigNumber(ethers.utils.parseUnits(this.totalAmount, this.$config[this.form.chain].decimals).toString())
        
          this.checkApprove = await this.tokenInstance.approve(
            this.$config[this.form.chain].contract['TransferJSON'].address,
            numVal.toFixed(0)
          )
          this.checkApprove = await this.checkApprove.wait()
          this.lastAmount = this.totalAmount

          loading.close()
        } catch(e) {
          loading.close()
          console.log(e)
          this.checkApprove = false
          this.$alert(JSON.stringify(e), '出错了', {
            confirmButtonText: '确定'
          })
        }
        console.log('approve ok')
      }
    },
    async countFee() {
      this.loading = true
      // const loading = this.$loading({
      //   lock: true,
      //   text: 'Loading',
      //   spinner: 'el-icon-loading',
      //   background: 'rgba(0, 0, 0, 0.7)'
      // });
      this.stepTitle = 'Counting'
      this.transactionsLoading = true

      try {
        this.transferInstance = new ethers.Contract(this.$config[this.form.chain].contract['TransferJSON'].address, this.$config[this.form.chain].contract['TransferJSON'].abi, this.provider)
        this.feePercent = (await this.transferInstance.feePercent()).toString()

        let totalNum = this.resultAddress.length
        let maxNum = 300
        let loopNum = Math.floor(totalNum / maxNum) + (totalNum % maxNum == 0 ? 0 : 1)
        let addressArrays = [];
        let amountArrays = [];
        // let balance = new BigNumber(this.feeBalance);
        const bnb = await this.metamaskProvider.getBalance(this.account)
        this.feeBalance = bnb.toString()
        this.gasPrice = (await this.metamaskProvider.getGasPrice()).toString()
        let gasPrice = new BigNumber(this.gasPrice);
        let feePercent = new BigNumber(this.feePercent);
        for (let loop = 0; loop < loopNum; loop++) {
          let startIndex = loop * maxNum;
          let endIndex = (loop + 1) * maxNum;
          addressArrays.push(this.resultAddress.slice(startIndex, endIndex));
          amountArrays.push(this.resultAmount.slice(startIndex, endIndex));
        }

        this.addressArrays = addressArrays
        this.amountArrays = amountArrays

        let feeUsedArray = [];
        let gasCostArray = [];
        
        console.log('after loop')
        console.log('this.feeBalance:')
        console.log(this.feeBalance)
                
        // loading.close()

        this.stepTitle = 'Estimate Gas'
        this.currentStep = 0
        this.allStep = addressArrays.length

        for (let i = 0; i < addressArrays.length; i ++) {
          let addresses = addressArrays[i];
          let amounts = amountArrays[i];
          let gasStr = (await this.transferInstance.connect(this.feeWalletWithProvider).estimateGas.batchTransfer(
            this.tokenContract,
            this.walletAccount, 
            addresses, 
            amounts,
            false, 
            {value: this.feeBalance}
          )).toString()
          console.log(gasStr)
          let gasUsed = new BigNumber(gasStr);
          let gasCost = gasUsed.multipliedBy(gasPrice);
          let feeUsed = gasUsed.multipliedBy(gasPrice).multipliedBy(feePercent).dividedBy('1000000000000000000');
          console.log('gasUsed: ' + gasUsed)
          console.log('gasPrice: ' + gasPrice)
          console.log('feePercent: ' + feePercent)
          console.log('feeUsed: ' + feeUsed)
          feeUsedArray.push(feeUsed);
          gasCostArray.push(gasCost);
        }
        console.log(feeUsedArray)
        console.log(gasCostArray)
        console.log('after gasCostArray')
        
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
        this.feeUsedArray = feeUsedArray

        if (new BigNumber(this.totalGasFeeCost).isGreaterThan(new BigNumber(this.feeBalance))) {
          this.$alert('不够额度扣除手续费', '额度不足', {
            confirmButtonText: '确定'
          })
          return
        }

        this.stepTitle = 'Getting Transactions'
        this.currentStep = 0
        this.allStep = this.addressArrays.length
        this.transactionsLoading = true
        console.log('start transactions')
        let nonce = await this.provider.getTransactionCount(this.account);
        let transactions = []
        this.transactions = []
        this.record = []
        for (let i = 0; i < this.addressArrays.length; i ++) {
          let addresses = this.addressArrays[i];
          let amounts = this.amountArrays[i];
          let feeUsed = this.feeUsedArray[i];
          let transaction = await this.transferInstance.populateTransaction.batchTransfer(
            this.tokenContract,
            this.walletAccount,
            addresses,
            amounts,
            false,
            {
              value: feeUsed.toFixed(0),
              nonce: nonce++,
              gasPrice: gasPrice.toFixed(0)
            }
          );
          transactions.push(transaction);
          this.transactions.push(transaction);
          this.currentStep = this.currentStep+1
        }
        this.$message({
          message: 'transactions已生成',
          type: 'success',
          offset: 80
        })
        this.loading = false
        this.transactionsLoading = false
        // loading.close()
      } catch(e) {
        console.error(e)
        this.loading = false
        this.transactionsLoading = false
        // loading.close()
        const ERROR_STR = JSON.stringify(e)
        if (ERROR_STR.includes('SERVER_ERROR')) {
          let that = this
          this.$alert('网络请求超时', '出错了', {
            confirmButtonText: '重试',
            callback: () => {
              that.retryGetTransactions()
            }
          })
        } else {
          this.$alert(ERROR_STR, '出错了', {
            confirmButtonText: '确定'
          })
        }
      }
    },
    async retryGetTransactions() {
      this.loading = true
      this.transactionsLoading = true
      console.log('retryGetTransactions')
      let gasPrice = new BigNumber(this.gasPrice);
      try {
        let nonce = await this.provider.getTransactionCount(this.account);
        let transactions = []
        this.transactions = []
        this.record = []
        for (let i = this.currentStep; i < this.addressArrays.length; i ++) {
          let addresses = this.addressArrays[i];
          let amounts = this.amountArrays[i];
          let feeUsed = this.feeUsedArray[i];
          let transaction = await this.transferInstance.populateTransaction.batchTransfer(
            this.tokenContract,
            this.walletAccount,
            addresses,
            amounts,
            false,
            {
              value: feeUsed.toFixed(0),
              nonce: nonce++,
              gasPrice: gasPrice.toFixed(0)
            }
          );
          transactions.push(transaction);
          this.transactions.push(transaction);
          this.currentStep = this.currentStep+1
        }
        this.loading = false
        this.transactionsLoading = false
      } catch(e) {
        const ERROR_STR = JSON.stringify(e)
        this.loading = false
        this.transactionsLoading = false
        if (ERROR_STR.includes('SERVER_ERROR')) {
          let that = this
          this.$alert('网络请求超时', '出错了', {
            confirmButtonText: '重试',
            callback: () => {
              that.retryGetTransactions()
            }
          })
        } else {
          this.$alert(ERROR_STR, '出错了', {
            confirmButtonText: '确定'
          })
        }
      }
    },
    async confirmSubmit() {
      this.loading = true
      this.transactionsLoading = true
      this.currentStep = 0
      this.allStep = this.transactions.length
      this.stepTitle = 'Send Transactions'
      try {
        let txs = []
        this.record = []
        for (let i = 0; i < this.transactions.length; i ++) {
          let transaction = this.transactions[i];
          let tx = await this.feeWalletWithProvider.sendTransaction(transaction);
          txs.push(tx);
          this.currentStep = this.currentStep+1
        }
        // for (let i = 0; i < txs.length; i ++) {
        //   let tx = txs[i];
        //   tx = await tx.wait();
        //   console.log(tx)
        //   this.record.push(tx)
        //   this.currentStep = this.currentStep+1 
        // }
        this.loading = false
        this.transactionsLoading = false
        // loading.close()
        this.$alert('转账成功', '提示', {
          confirmButtonText: '确定'
        });
        this.checkApprove = false
        this.totalAmount = ''
        this.form.address = ''
        this.totalGasCost = ''
        this.totalFeeUsed = ''
        this.transactions = []
        console.log(this.record)
        this.keyword = this.walletAccount
      } catch(e) {
        const ERROR_STR = JSON.stringify(e)
        this.loading = false
        this.transactionsLoading = false
        if (ERROR_STR.includes('SERVER_ERROR')) {
          let that = this
          this.$alert('网络请求超时', '出错了', {
            confirmButtonText: '重试',
            callback: () => {
              that.retrySendTransactions()
            }
          })
        } else {
          this.$alert(ERROR_STR, '出错了', {
            confirmButtonText: '确定'
          })
        }
      }
    },
    async retrySendTransactions() {
      this.loading = true
      this.transactionsLoading = true
      try {
        let txs = []
        for (let i = this.currentStep; i < this.transactions.length; i ++) {
          let transaction = this.transactions[i];
          let tx = await this.feeWalletWithProvider.sendTransaction(transaction);
          txs.push(tx);
          this.currentStep = this.currentStep+1
          console.log(tx)
          this.record.push(tx)
        }
        // for (let i = 0; i < txs.length; i ++) {
        //   let tx = txs[i];
        //   tx = await tx.wait();
        //   console.log(tx)
        //   this.record.push(tx) 
        // }
        this.loading = false
        this.transactionsLoading = false
        this.$alert('转账成功', '提示', {
          confirmButtonText: '确定'
        });
        this.checkApprove = false
        this.totalAmount = ''
        this.form.address = ''
        this.totalGasCost = ''
        this.totalFeeUsed = ''
        this.transactions = []
        this.keyword = this.walletAccount
      } catch(e) {
        const ERROR_STR = JSON.stringify(e)
        this.loading = false
        this.transactionsLoading = false
        if (ERROR_STR.includes('SERVER_ERROR')) {
          let that = this
          this.$alert('网络请求超时', '出错了', {
            confirmButtonText: '重试',
            callback: () => {
              that.retrySendTransactions()
            }
          })
        } else {
          this.$alert(ERROR_STR, '出错了', {
            confirmButtonText: '确定'
          })
        }
      }
    },
    openSearch() {
      this.searchVisible = true
    },
    async search() {
      this.page = 0
      this.more = false
      this.searchFetch()
    },
    async searchFetch() {
      this.loading = true
      try {
        const res = await this.$apollo.query({
          query: transferFromInfosQuery,
          variables: {
            page: this.page ? this.page * 20 : this.page,
            address: this.walletAccount || this.keyword
          }
        })
        console.log(res)
        this.loading = false
        this.searchResult = this.page === 0 ? res.data.transferFromInfos : this.searchResult.concat(res.data.transferFromInfos)
        this.more = res.data.transferFromInfos.length >= 20
      } catch(e) {
        this.loading = false
        this.more = false
      }
    },
    getMore() {
      if (this.more) {
        this.page++
        this.searchFetch()
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
  width: 100%;
  max-width: 1024px;
  margin: 0 auto;
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
.search-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: rgba(0,0,0,0.8);
  .inner {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    left: 200px;
    background-color: #fff;
    box-sizing: border-box;
    padding: 50px;
    overflow-y: auto;
  }
}
.loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 30px;
}
</style>
