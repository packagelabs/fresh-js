// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Signer } from '@fresh-js/crypto';

export type Event = {
  type: string;
  data: { [key: string]: string };
};

export interface TransactionOptions {
  payer: Authorizer;
  proposer: Authorizer;
  authorizers: [Authorizer];
}

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
