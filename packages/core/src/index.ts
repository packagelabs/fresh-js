// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Signer } from '@fresh-js/crypto';

export type Config = {
  host: string;
  contracts: { [key: string]: string };
};

export const TestnetConfig: Config = {
  host: 'https://rest-testnet.onflow.org',
  contracts: {
    FungibleToken: '0x9a0766d93b6608b7',
    NonFungibleToken: '0x631e88ae7f1d7c20',
    MetadataViews: '0x631e88ae7f1d7c20',
    NFTClaimSale: '0xf6908f3ab6c14d81',
  },
};

export const MainnetConfig: Config = {
  host: 'https://rest-mainnet.onflow.org',
  contracts: {
    FungibleToken: '0xf233dcee88fe0abe',
    NonFungibleToken: '0x1d7e57aa55817448',
    MetadataViews: '0x1d7e57aa55817448',
    NFTClaimSale: '', // TODO: deploy NFTClaimSale to mainnet
  },
};

export type Event = {
  type: string;
  data: { [key: string]: string };
};

const toHex = (buffer: Buffer) => buffer.toString('hex');
const fromHex = (hex: string) => Buffer.from(hex, 'hex');

export class Authorizer {
  address: string;
  keyIndex: number;
  signer: Signer;

  constructor({ address, keyIndex, signer }: { address: string; keyIndex: number; signer: Signer }) {
    this.address = address;
    this.keyIndex = keyIndex;
    this.signer = signer;
  }

  toFCLAuthorizationFunction() {
    return async (account = {}) => {
      return {
        ...account,
        tempId: 'SIGNER',
        addr: fcl.sansPrefix(this.address),
        keyId: this.keyIndex,
        signingFunction: (data: { message: string }) => ({
          addr: fcl.withPrefix(this.address),
          keyId: this.keyIndex,
          signature: toHex(this.signer.sign(fromHex(data.message))),
        }),
      };
    };
  }
}
