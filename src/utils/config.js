import TokenJSON from '../../batch-transfer/deployments/bsctest/MockToken_USDT.json'
import TransferJSON from '../../batch-transfer/deployments/bsctest/TransferHelper.json'

export default {
  bscTestnet: {
    endpoint: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    chainId: 97,
    decimals: '18',
    contract: {
      TokenJSON,
      TransferJSON
    }
  }
}