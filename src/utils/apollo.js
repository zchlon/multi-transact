import ApolloClient from 'apollo-boost'

const apolloClient = new ApolloClient({
  // 你需要在这里使用绝对路径
  uri: 'https://graph.basepool.io/subgraphs/name/subgraph-bsctest/batch-transfer'
  
})
// uri: window.location.protocol + '//graph.basepool.io/subgraphs/name/subgraph-bsctest/batch-transfer'
export default apolloClient