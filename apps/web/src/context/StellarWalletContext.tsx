import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { stellarApi, AccountBalance, NetworkStatus } from '../api/stellar.api';
import { ConnectWalletModal } from '../components/wallet/ConnectWalletModal';

interface FreighterApi {
  isConnected: () => Promise<{ isConnected: boolean } | boolean>;
  isAllowed: () => Promise<{ isAllowed: boolean } | boolean>;
  setAllowed: () => Promise<{ isAllowed: boolean } | boolean>;
  requestAccess?: () => Promise<string | { address?: string; error?: string }>;
  getPublicKey: () => Promise<string | { publicKey?: string; address?: string }>;
  getNetwork: () => Promise<string>;
  getNetworkPassphrase: () => Promise<string>;
  signTransaction: (
    xdr: string,
    opts?: { network?: string; networkPassphrase?: string },
  ) => Promise<string | { signedTxXdr?: string }>;
}

declare global {
  interface Window {
    freighterApi?: FreighterApi;
    varial?: any;
    varialApi?: any;
    freighter?: any;
    stellar?: any;
  }
}

interface StellarWalletContextType {
  isFreighterAvailable: boolean;
  isConnected: boolean;
  publicKey: string | null;
  network: string | null;
  networkConfig: NetworkStatus | null;
  balances: AccountBalance[];
  isConnecting: boolean;
  error: string | null;
  isConnectModalOpen: boolean;
  openConnectModal: () => void;
  closeConnectModal: () => void;
  connectWallet: () => Promise<string | null>;
  connectFreighter: () => Promise<string | null>;
  connectManualKey: (pubKey: string) => void;
  generateAndConnectTestnet: () => Promise<string | null>;
  disconnectWallet: () => void;
  signTransaction: (unsignedXdr: string) => Promise<string>;
  refreshBalances: () => Promise<void>;
}

const StellarWalletContext = createContext<StellarWalletContextType | undefined>(undefined);

export const StellarWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFreighterAvailable, setIsFreighterAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(() => {
    const saved = localStorage.getItem('fairtune_stellar_pubkey');
    return saved && typeof saved === 'string' && saved.startsWith('G') && saved.length === 56
      ? saved
      : null;
  });
  const [network, setNetwork] = useState<string | null>(null);
  const [networkConfig, setNetworkConfig] = useState<NetworkStatus | null>(null);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Check network status from backend
  useEffect(() => {
    stellarApi
      .getNetworkStatus()
      .then(setNetworkConfig)
      .catch(() => null);
  }, []);

  // Detect Varial / Freighter extension
  useEffect(() => {
    const checkWalletExtension = () => {
      if (
        typeof window !== 'undefined' &&
        (window.varial ||
          window.varialApi ||
          window.freighterApi ||
          window.freighter ||
          window.stellar)
      ) {
        setIsFreighterAvailable(true);
      }
    };
    checkWalletExtension();
    const timer = setTimeout(checkWalletExtension, 500);
    const interval = setInterval(checkWalletExtension, 2000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;
    try {
      const data = await stellarApi.getBalances(publicKey);
      setBalances(data.balances || []);
    } catch {
      setBalances([]);
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) {
      setIsConnected(true);
      refreshBalances();
    } else {
      setIsConnected(false);
      setBalances([]);
    }
  }, [publicKey, refreshBalances]);

  const openConnectModal = () => setIsConnectModalOpen(true);
  const closeConnectModal = () => setIsConnectModalOpen(false);

  const connectFreighter = async (): Promise<string | null> => {
    setIsConnecting(true);
    setError(null);

    try {
      const api =
        window.varial ||
        window.varialApi ||
        window.freighterApi ||
        window.freighter ||
        window.stellar;
      if (!api) {
        throw new Error(
          'Varial / Freighter wallet extension not found. Please install Varial from varialwallet.com or use the Instant Testnet option.',
        );
      }

      if (typeof api.setAllowed === 'function') {
        await api.setAllowed();
      }

      let rawKey: any;
      if (typeof api.requestAccess === 'function') {
        rawKey = await api.requestAccess();
      } else if (typeof api.getPublicKey === 'function') {
        rawKey = await api.getPublicKey();
      } else if (typeof api.getAddress === 'function') {
        rawKey = await api.getAddress();
      }

      let pubKey: string = '';
      if (typeof rawKey === 'string') {
        pubKey = rawKey;
      } else if (rawKey && typeof rawKey === 'object') {
        pubKey = rawKey.publicKey || rawKey.address || '';
      }

      if (!pubKey || !pubKey.startsWith('G') || pubKey.length !== 56) {
        throw new Error('Failed to retrieve a valid Stellar public key from Varial / Freighter.');
      }

      let net = 'TESTNET';
      if (typeof api.getNetwork === 'function') {
        try {
          net = await api.getNetwork();
        } catch {
          // ignore network fetch error
        }
      }

      setPublicKey(pubKey);
      setNetwork(net);
      localStorage.setItem('fairtune_stellar_pubkey', pubKey);
      return pubKey;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect Freighter wallet';
      setError(msg);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectManualKey = (pubKey: string) => {
    const cleanKey = pubKey.trim().toUpperCase();
    if (cleanKey.startsWith('G') && cleanKey.length === 56) {
      setPublicKey(cleanKey);
      setNetwork('TESTNET');
      localStorage.setItem('fairtune_stellar_pubkey', cleanKey);
      setError(null);
    }
  };

  const generateAndConnectTestnet = async (): Promise<string | null> => {
    setIsConnecting(true);
    setError(null);
    try {
      const account = await stellarApi.generateTestnetAccount();
      if (account?.publicKey) {
        setPublicKey(account.publicKey);
        setNetwork('TESTNET');
        localStorage.setItem('fairtune_stellar_pubkey', account.publicKey);
        return account.publicKey;
      }
      throw new Error('Could not generate testnet account.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate testnet wallet';
      setError(msg);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectWallet = async (): Promise<string | null> => {
    // If Varial / Freighter is available, try connecting directly; otherwise open the modal
    if (
      window.varial ||
      window.varialApi ||
      window.freighterApi ||
      window.freighter ||
      window.stellar
    ) {
      const result = await connectFreighter();
      if (result) return result;
    }
    openConnectModal();
    return null;
  };

  const disconnectWallet = () => {
    setPublicKey(null);
    setNetwork(null);
    setBalances([]);
    setIsConnected(false);
    localStorage.removeItem('fairtune_stellar_pubkey');
  };

  const signTransaction = async (unsignedXdr: string): Promise<string> => {
    const api =
      window.varial ||
      window.varialApi ||
      window.freighterApi ||
      window.freighter ||
      window.stellar;
    if (!api) {
      throw new Error(
        'Varial / Freighter wallet extension is required for on-chain signing. Please install Varial from varialwallet.com.',
      );
    }
    const passphrase = networkConfig?.passphrase || 'Test SDF Network ; September 2015';
    const result = await api.signTransaction(unsignedXdr, {
      networkPassphrase: passphrase,
    });
    if (typeof result === 'string') {
      return result;
    }
    if (result && typeof result === 'object' && result.signedTxXdr) {
      return result.signedTxXdr;
    }
    throw new Error('Unexpected signing result from Varial / Freighter.');
  };

  return (
    <StellarWalletContext.Provider
      value={{
        isFreighterAvailable,
        isConnected,
        publicKey,
        network,
        networkConfig,
        balances,
        isConnecting,
        error,
        isConnectModalOpen,
        openConnectModal,
        closeConnectModal,
        connectWallet,
        connectFreighter,
        connectManualKey,
        generateAndConnectTestnet,
        disconnectWallet,
        signTransaction,
        refreshBalances,
      }}
    >
      {children}
      <ConnectWalletModal />
    </StellarWalletContext.Provider>
  );
};

export const useStellarWallet = () => {
  const context = useContext(StellarWalletContext);
  if (!context) {
    throw new Error('useStellarWallet must be used within a StellarWalletProvider');
  }
  return context;
};
