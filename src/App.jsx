import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { DarkModeProvider } from './contexts/DarkModeContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import TransactionsPage from './pages/TransactionsPage'

function App() {
  return (
    <DarkModeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/transactions/:walletAddress" element={<TransactionsPage />} />
        </Routes>
      </Layout>
    </DarkModeProvider>
  )
}

export default App
