/// <reference types="vite/client" />

import { EIP1193Provider } from './eip6963';

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent
  }
  interface Window {
    //https://docs.ethers.org/v6/api/providers/#Eip1193Provider
    ethereum ?: EIP1193Provider;
  }
};
