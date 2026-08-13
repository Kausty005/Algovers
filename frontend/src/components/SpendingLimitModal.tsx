import { useState, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';
import { Shield, Wallet, Zap, Loader } from 'lucide-react';
import { createSessionWallet, getSessionAccount, markSessionWalletFunded } from '../services/sessionWallet';

interface Props {
  onFunded: () => void;
  onCancel: () => void;
}

export function SpendingLimitModal({ onFunded, onCancel }: Props) {
  const { activeAccount, signTransactions } = useWallet();
  const activeAddress = activeAccount?.address;
  const [limit, setLimit] = useState(0.10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFund = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (!activeAddress) {
        throw new Error("Please connect a wallet first.");
      }
      
      // 1. Create the session wallet in browser memory
      createSessionWallet();
      const sessionAccount = getSessionAccount();
      if (!sessionAccount) throw new Error("Failed to generate session wallet.");

      // 2. Fund it with an atomic transaction group
      const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
      const suggestedParams = await algodClient.getTransactionParams().do();
      
      const USDC_ASSET_ID = 10458941;
      const amountMicro = Math.floor(limit * 1_000_000);

      // Txn 1: Fund ALGO for MBR and fees (0.3 ALGO)
      const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: sessionAccount.addr,
        amount: 300_000,
        suggestedParams
      });
      
      // Txn 2: Opt-in to USDC
      const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: sessionAccount.addr,
        receiver: sessionAccount.addr,
        assetIndex: USDC_ASSET_ID,
        amount: 0,
        suggestedParams
      });
      
      // Txn 3: Fund USDC limit
      const txn3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: sessionAccount.addr,
        assetIndex: USDC_ASSET_ID,
        amount: amountMicro,
        suggestedParams
      });
      
      const txns = [txn1, txn2, txn3];
      const txGroup = algosdk.assignGroupID(txns);
      
      // Sign Txn 2 with our session wallet FIRST so Pera Wallet can successfully simulate the group
      const signedTxn2Raw = txn2.signTxn(sessionAccount.sk);
      const signedTxn2 = signedTxn2Raw instanceof Uint8Array ? signedTxn2Raw : (signedTxn2Raw as any).blob;
      
      const encodedTxns = [
        txn1.toByte(),
        signedTxn2, // Include the SIGNED transaction in the payload
        txn3.toByte()
      ];
      
      // Request signature from user for Txn 1 and 3
      // We pass the indexes we want Pera to sign: [0, 2]
      if (!signTransactions) throw new Error("Wallet provider does not support signing.");
      const signedByPera = await signTransactions(encodedTxns, [0, 2]);
      
      // Merge signatures
      const signedFromWallet = signedByPera.filter(x => x !== null && x !== undefined);
      if (signedFromWallet.length < 2) {
        throw new Error(`Wallet failed to sign all required transactions. Got ${signedFromWallet.length}, expected 2. Try disconnecting and reconnecting.`);
      }
      
      const finalGroup: any[] = [signedFromWallet[0], signedTxn2, signedFromWallet[1]];
      
      const sanitizedGroup = finalGroup.map((t, i) => {
        if (!t) throw new Error(`Missing signature for transaction ${i}`);
        if (t instanceof Uint8Array) return t;
        if (t && typeof t === 'object' && 'blob' in t) return t.blob as Uint8Array;
        return new Uint8Array(t);
      });
      
      // Send to network
      const response = await algodClient.sendRawTransaction(sanitizedGroup).do();
      const txid = response.txId || response.txid;
      
      // Wait for confirmation (Algorand block time is ~3s, wait up to 20 rounds for load-balancer sync)
      await algosdk.waitForConfirmation(algodClient, txid, 20);

      markSessionWalletFunded(limit, activeAddress);
      
      onFunded();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("asset 10458941 missing")) {
        setError(
          "Your wallet is missing TestNet USDC (Asset 10458941). Please opt-in to this asset in your wallet and fund it via the Circle Testnet Faucet (faucet.circle.com), or use a different wallet with funds."
        );
      } else {
        setError(errMsg || 'Failed to fund session wallet');
      }
    } finally {
      setLoading(false);
    }
  }, [activeAddress, limit, onFunded]);

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-fade-up">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="neu-icon-wrapper" style={{ margin: '0 auto 16px auto', width: '64px', height: '64px' }}>
            <Zap size={32} color="var(--accent)" />
          </div>
          <h2 className="neu-heading" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
            Enable Agentic Payments
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            To avoid annoying wallet popups while you exercise, fund a temporary session wallet. 
            The IronIQ AI agent will autonomously purchase guidance only if your form score drops.
          </p>
        </div>

        <div className="neu-inset" style={{ padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600 }}>Spending Limit</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{limit.toFixed(2)} USDC</span>
          </div>
          
          <input
            type="range"
            min="0.05"
            max="0.50"
            step="0.05"
            value={limit}
            onChange={(e) => setLimit(parseFloat(e.target.value))}
            style={{ width: '100%', margin: '12px 0' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>$0.05</span>
            <span>$0.50</span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Agent Price List
          </h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
            <span>🗣️ Text & Voice Guidance (Lifetime Unlock)</span>
            <span style={{ fontWeight: 600 }}>0.02 USDC</span>
          </div>
        </div>

        <div style={{ padding: '12px', backgroundColor: 'rgba(235, 87, 87, 0.1)', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Shield size={20} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text)' }}>
            <strong>100% Non-Custodial:</strong> The session key stays in your browser memory. Unspent USDC is automatically refunded after your workout.
          </p>
        </div>

        {error && (
          <div style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="neu-btn" 
            style={{ flex: 1, padding: '14px' }} 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="neu-btn-accent neu-btn" 
            style={{ flex: 2, padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            onClick={handleFund}
            disabled={loading}
          >
            {loading ? <Loader className="animate-spin" size={20} /> : <Wallet size={20} />}
            Fund Session Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
