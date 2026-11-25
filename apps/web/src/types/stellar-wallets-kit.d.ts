declare module '@creit.tech/stellar-wallets-kit' {
  export enum Networks {
    PUBLIC = 'Public Global Stellar Network ; September 2015',
    TESTNET = 'Test SDF Network ; September 2015',
    FUTURENET = 'Test SDF Future Network ; October 2022',
    SANDBOX = 'Local Sandbox Stellar Network ; September 2022',
    STANDALONE = 'Standalone Network ; February 2017',
  }

  export enum ModuleType {
    HW_WALLET = 'HW_WALLET',
    HOT_WALLET = 'HOT_WALLET',
    BRIDGE_WALLET = 'BRIDGE_WALLET',
    AIR_GAPED_WALLET = 'AIR_GAPED_WALLET',
  }

  export enum KitEventType {
    STATE_UPDATED = 'STATE_UPDATE',
    WALLET_SELECTED = 'WALLET_SELECTED',
    DISCONNECT = 'DISCONNECT',
  }

  export interface ISupportedWallet {
    id: string;
    name: string;
    type: ModuleType;
    icon: string;
    isAvailable: boolean;
    isPlatformWrapper: boolean;
    url: string;
  }

  export interface StellarWalletsKitInitParams {
    modules: any[];
    selectedWalletId?: string;
    network?: Networks | string;
    theme?: any;
    authModal?: {
      showInstallLabel?: boolean;
      hideUnsupportedWallets?: boolean;
    };
  }

  export interface AuthModalParams {
    container?: HTMLElement;
  }

  export class StellarWalletsKit {
    static init(params: StellarWalletsKitInitParams): void;
    static setWallet(id: string): void;
    static setNetwork(network: string): void;
    static setTheme(theme?: any): void;
    static getAddress(): Promise<{ address: string }>;
    static fetchAddress(): Promise<{ address: string }>;
    static signTransaction(
      xdr: string,
      opts?: { address?: string; networkPassphrase?: string },
    ): Promise<{ signedTxXdr: string; signerAddress?: string }>;
    static signAuthEntry(
      authEntry: string,
      opts?: { address?: string; networkPassphrase?: string },
    ): Promise<any>;
    static signMessage(
      message: string,
      opts?: { address?: string; networkPassphrase?: string },
    ): Promise<any>;
    static getNetwork(): Promise<{ network: string; networkPassphrase: string }>;
    static disconnect(): Promise<void>;
    static on(type: KitEventType, callback: (event: any) => void): () => void;
    static refreshSupportedWallets(): Promise<ISupportedWallet[]>;
    static createButton(container: HTMLElement, props?: any): Promise<void>;
    static authModal(params?: AuthModalParams): Promise<{ address: string }>;
    static profileModal(params?: AuthModalParams): Promise<void>;
  }

  export const SwkAppDarkTheme: any;
  export const SwkAppLightTheme: any;
}

declare module '@creit.tech/stellar-wallets-kit/modules/utils' {
  export function defaultModules(opts?: { filterBy?: (mod: any) => boolean }): any[];
  export function sep43Modules(opts?: { filterBy?: (mod: any) => boolean }): any[];
}
