import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  StellarWalletsKit,
  Networks,
  SwkAppDarkTheme,
  KitEventType,
  ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import { stellarApi, AccountBalance, NetworkStatus } from '../api/stellar.api';
import { ConnectWalletModal } from '../components/wallet/ConnectWalletModal';

declare global {
  interface Window {
    varial?: any;
    varialApi?: any;
    freighterApi?: any;
    freighter?: any;
    stellar?: any;
    xBullSDK?: any;
    xbull?: any;
    albedo?: any;
    lobstr?: any;
    lobstrSignerExtension?: any;
    lobstrExtensionApi?: any;
    rabet?: any;
    hanaWallet?: any;
  }
}

interface StellarWalletContextType {
  isFreighterAvailable: boolean;
  isLobstrAvailable: boolean;
  isConnected: boolean;
  publicKey: string | null;
  network: string | null;
  networkConfig: NetworkStatus | null;
  balances: AccountBalance[];
  isConnecting: boolean;
  connectingWalletId: string | null;
  error: string | null;
  isConnectModalOpen: boolean;
  openConnectModal: () => void;
  closeConnectModal: () => void;
  connectWallet: () => void;
  connectWalletById: (walletId: string) => Promise<string | null>;
  connectFreighter: () => Promise<string | null>;
  connectManualKey: (pubKey: string) => void;
  generateAndConnectTestnet: () => Promise<string | null>;
  disconnectWallet: () => void;
  signTransaction: (unsignedXdr: string) => Promise<string>;
  refreshBalances: () => Promise<void>;
  openProfileModal: () => Promise<void>;
  supportedWallets: ISupportedWallet[];
  refreshSupportedWallets: () => Promise<ISupportedWallet[]>;
}

const StellarWalletContext = createContext<StellarWalletContextType | undefined>(undefined);

let isKitInitialized = false;

function ensureKitInitialized(networkPassphrase?: string) {
  if (typeof window === 'undefined') return;
  if (!isKitInitialized) {
    try {
      StellarWalletsKit.init({
        modules: defaultModules(),
        network: networkPassphrase || Networks.TESTNET,
        theme: SwkAppDarkTheme,
        authModal: {
          showInstallLabel: true,
          hideUnsupportedWallets: false,
        },
      });
      isKitInitialized = true;
    } catch (e) {
      console.warn('Failed to initialize StellarWalletsKit:', e);
    }
  } else if (networkPassphrase) {
    try {
      StellarWalletsKit.setNetwork(networkPassphrase);
    } catch {
      // ignore
    }
  }
}

export const StellarWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFreighterAvailable, setIsFreighterAvailable] = useState(false);
  const [isLobstrAvailable, setIsLobstrAvailable] = useState(false);
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
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [supportedWallets, setSupportedWallets] = useState<ISupportedWallet[]>([]);

  // Check network status from backend and initialize kit
  useEffect(() => {
    stellarApi
      .getNetworkStatus()
      .then((cfg) => {
        setNetworkConfig(cfg);
        ensureKitInitialized(cfg.passphrase);
      })
      .catch(() => {
        ensureKitInitialized(Networks.TESTNET);
      });
  }, []);

  // Restore saved wallet module if previously selected
  useEffect(() => {
    const savedWalletId = localStorage.getItem('fairtune_stellar_wallet_id');
    if (savedWalletId && isKitInitialized) {
      try {
        StellarWalletsKit.setWallet(savedWalletId);
      } catch {
        // ignore if not found
      }
    }
  }, [publicKey]);

  // Refresh available wallets from StellarWalletsKit
  const refreshSupportedWallets = useCallback(async (): Promise<ISupportedWallet[]> => {
    ensureKitInitialized(networkConfig?.passphrase || Networks.TESTNET);
    try {
      const wallets = await StellarWalletsKit.refreshSupportedWallets();
      setSupportedWallets(wallets);
      return wallets;
    } catch {
      return [];
    }
  }, [networkConfig?.passphrase]);

  // Initial wallet scan
  useEffect(() => {
    refreshSupportedWallets();
  }, [refreshSupportedWallets]);

  // Listen to kit events
  useEffect(() => {
    ensureKitInitialized();
    let unsubState: (() => void) | undefined;
    let unsubDisconnect: (() => void) | undefined;

    try {
      unsubState = StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event: any) => {
        if (event?.payload?.address) {
          const addr = event.payload.address;
          if (typeof addr === 'string' && addr.startsWith('G') && addr.length === 56) {
            setPublicKey(addr);
            setIsConnected(true);
            localStorage.setItem('fairtune_stellar_pubkey', addr);
          }
        }
      });
    } catch {
      // ignore
    }

    try {
      unsubDisconnect = StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
        setPublicKey(null);
        setNetwork(null);
        setBalances([]);
        setIsConnected(false);
        localStorage.removeItem('fairtune_stellar_pubkey');
        localStorage.removeItem('fairtune_stellar_wallet_id');
      });
    } catch {
      // ignore
    }

    return () => {
      if (typeof unsubState === 'function') unsubState();
      if (typeof unsubDisconnect === 'function') unsubDisconnect();
    };
  }, []);

  // Detect Varial / Freighter and Lobstr browser extensions
  useEffect(() => {
    const checkWalletExtensions = () => {
      if (typeof window === 'undefined') return;

      const hasVarial = Boolean(
        window.varial ||
          window.varialApi ||
          window.freighterApi ||
          window.freighter ||
          window.stellar,
      );
      if (hasVarial) {
        setIsFreighterAvailable(true);
      }

      const hasLobstr = Boolean(
        window.lobstr ||
          window.lobstrSignerExtension ||
          window.lobstrExtensionApi,
      );
      if (hasLobstr) {
        setIsLobstrAvailable(true);
      }
    };

    checkWalletExtensions();
    const t1 = setTimeout(checkWalletExtensions, 200);
    const t2 = setTimeout(checkWalletExtensions, 800);
    const interval = setInterval(checkWalletExtensions, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
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

  const openConnectModal = () => {
    setError(null);
    refreshSupportedWallets();
    setIsConnectModalOpen(true);
  };

  const closeConnectModal = () => {
    setIsConnectModalOpen(false);
    setConnectingWalletId(null);
  };

  const connectWallet = () => {
    openConnectModal();
  };

  /**
   * Connects via StellarWalletsKit with resilient fallbacks for Varial and Lobstr
   */
  const connectWalletById = async (walletId: string): Promise<string | null> => {
    setIsConnecting(true);
    setConnectingWalletId(walletId);
    setError(null);

    try {
      ensureKitInitialized(networkConfig?.passphrase || Networks.TESTNET);
      StellarWalletsKit.setWallet(walletId);

      let address: string | null = null;

      try {
        const res = await StellarWalletsKit.fetchAddress();
        address = res?.address || null;
      } catch (kitErr) {
        // Fallback for Varial
        if (walletId === 'varial' || walletId === 'freighter') {
          const api =
            window.varial ||
            window.varialApi ||
            window.freighterApi ||
            window.freighter ||
            window.stellar;
          if (api) {
            if (typeof api.setAllowed === 'function') {
              try {
                await api.setAllowed();
              } catch {
                // ignore
              }
            }
            let raw: any;
            if (typeof api.requestAccess === 'function') {
              raw = await api.requestAccess();
            } else if (typeof api.getPublicKey === 'function') {
              raw = await api.getPublicKey();
            } else if (typeof api.getAddress === 'function') {
              raw = await api.getAddress();
            }

            if (typeof raw === 'string') {
              address = raw;
            } else if (raw && typeof raw === 'object') {
              address = raw.publicKey || raw.address || null;
            }
          }
        }

        // Fallback for Lobstr
        if (walletId === 'lobstr' && !address) {
          const lobstrApi = window.lobstr || window.lobstrSignerExtension || window.lobstrExtensionApi;
          if (lobstrApi && typeof lobstrApi.getPublicKey === 'function') {
            const raw = await lobstrApi.getPublicKey();
            if (typeof raw === 'string') {
              address = raw;
            } else if (raw && typeof raw === 'object' && raw.publicKey) {
              address = raw.publicKey;
            }
          }
        }

        if (!address) {
          throw kitErr;
        }
      }

      if (address && address.startsWith('G') && address.length === 56) {
        setPublicKey(address);
        setNetwork('TESTNET');
        setIsConnected(true);
        localStorage.setItem('fairtune_stellar_pubkey', address);
        localStorage.setItem('fairtune_stellar_wallet_id', walletId);
        closeConnectModal();
        return address;
      }
      throw new Error(`Failed to retrieve a valid Stellar public key from ${walletId}.`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : `Connection to ${walletId} was cancelled or could not be established.`;
      setError(msg);
      return null;
    } finally {
      setIsConnecting(false);
      setConnectingWalletId(null);
    }
  };

  /**
   * Direct connection helper for Varial
   */
  const connectFreighter = async (): Promise<string | null> => {
    return connectWalletById('varial');
  };

  const connectManualKey = (pubKey: string) => {
    const cleanKey = pubKey.trim().toUpperCase();
    if (cleanKey.startsWith('G') && cleanKey.length === 56) {
      setPublicKey(cleanKey);
      setNetwork('TESTNET');
      setIsConnected(true);
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
        setIsConnected(true);
        localStorage.setItem('fairtune_stellar_pubkey', account.publicKey);
        localStorage.removeItem('fairtune_stellar_wallet_id');
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

  const disconnectWallet = () => {
    try {
      StellarWalletsKit.disconnect();
    } catch {
      // ignore
    }
    setPublicKey(null);
    setNetwork(null);
    setBalances([]);
    setIsConnected(false);
    localStorage.removeItem('fairtune_stellar_pubkey');
    localStorage.removeItem('fairtune_stellar_wallet_id');
  };

  const openProfileModal = async () => {
    ensureKitInitialized(networkConfig?.passphrase || Networks.TESTNET);
    await StellarWalletsKit.profileModal();
  };

  const signTransaction = async (unsignedXdr: string): Promise<string> => {
    ensureKitInitialized(networkConfig?.passphrase || Networks.TESTNET);
    const passphrase = networkConfig?.passphrase || Networks.TESTNET;

    // Ensure wallet module is set if saved
    const savedWalletId = localStorage.getItem('fairtune_stellar_wallet_id');
    if (savedWalletId) {
      try {
        StellarWalletsKit.setWallet(savedWalletId);
      } catch {
        // ignore
      }
    }

    try {
      const result = await StellarWalletsKit.signTransaction(unsignedXdr, {
        networkPassphrase: passphrase,
        address: publicKey || undefined,
      });

      if (typeof result === 'string') {
        return result;
      }
      if (result && typeof result === 'object' && result.signedTxXdr) {
        return result.signedTxXdr;
      }
      throw new Error('Unexpected signing result from wallet provider.');
    } catch (err: unknown) {
      // Fallback for Varial window provider
      const api =
        window.varial ||
        window.varialApi ||
        window.freighterApi ||
        window.freighter ||
        window.stellar;
      if (api && typeof api.signTransaction === 'function') {
        const res = await api.signTransaction(unsignedXdr, {
          networkPassphrase: passphrase,
        });
        if (typeof res === 'string') return res;
        if (res && res.signedTxXdr) return res.signedTxXdr;
      }

      // Fallback for Lobstr window provider
      const lobstrApi = window.lobstr || window.lobstrSignerExtension || window.lobstrExtensionApi;
      if (lobstrApi && typeof lobstrApi.signTransaction === 'function') {
        const res = await lobstrApi.signTransaction(unsignedXdr);
        if (typeof res === 'string') return res;
        if (res && res.signedTxXdr) return res.signedTxXdr;
      }

      const msg =
        err instanceof Error
          ? err.message
          : 'Transaction signing failed or was rejected by your wallet.';
      throw new Error(msg);
    }
  };

  return (
    <StellarWalletContext.Provider
      value={{
        isFreighterAvailable,
        isLobstrAvailable,
        isConnected,
        publicKey,
        network,
        networkConfig,
        balances,
        isConnecting,
        connectingWalletId,
        error,
        isConnectModalOpen,
        openConnectModal,
        closeConnectModal,
        connectWallet,
        connectWalletById,
        connectFreighter,
        connectManualKey,
        generateAndConnectTestnet,
        disconnectWallet,
        signTransaction,
        refreshBalances,
        openProfileModal,
        supportedWallets,
        refreshSupportedWallets,
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
