import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WalletProvider, NetworkId } from '@txnlab/use-wallet-react'
import { WalletManager } from '@txnlab/use-wallet'
import './index.css'
import App from './App.tsx'

const walletManager = new WalletManager({
  wallets: ['defly', 'pera', 'exodus', 'kmd'],
  network: NetworkId.TESTNET
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider manager={walletManager}>
      <App />
    </WalletProvider>
  </StrictMode>,
)
