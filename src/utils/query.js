import gql from 'graphql-tag'

export const transferFromInfosQuery = gql`
  query transferFromInfos ($page: Int, $address: String) {
    transferFromInfos(skip: $page, first: 20, where: { from: $address }, orderBy: blocktime, orderDirection: desc) {
      id
      from
      to
      amount
      success
      token {
        id
        symbol
        decimals
      }
      transaction {
        id
        gasPrice
        gasUsed
      }
    }
  }`