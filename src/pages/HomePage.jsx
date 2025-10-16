import React from 'react'
import BlockchainInfo from '../components/BlockchainInfo'
import CrawlerForm from '../components/CrawlerForm'
import BalanceChecker from '../components/BalanceChecker'
import CrawlHistory from '../components/CrawlHistory'

const HomePage = () => {
  return (
    <div className="space-y-6">
      <BlockchainInfo />
      <CrawlerForm />
      <BalanceChecker />
      <CrawlHistory />
    </div>
  )
}

export default HomePage
