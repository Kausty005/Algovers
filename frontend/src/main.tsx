import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WalletProvider, NetworkId } from '@txnlab/use-wallet-react'
import { WalletManager, WalletId } from '@txnlab/use-wallet'
import './index.css'
import App from './App.tsx'

import { AuthProvider } from './context/AuthContext'

const walletManager = new WalletManager({
  wallets: [WalletId.DEFLY, WalletId.PERA, WalletId.EXODUS, WalletId.KMD],
  defaultNetwork: NetworkId.TESTNET
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <WalletProvider manager={walletManager}>
        <App />
      </WalletProvider>
    </AuthProvider>
  </StrictMode>,
)
