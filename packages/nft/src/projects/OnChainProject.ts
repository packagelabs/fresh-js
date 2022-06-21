// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';
import { MetadataMap } from '../metadata';
import Project, { ProjectAuthorizers } from './Project';
import OnChainGenerator from '../generators/OnChainGenerator';

type NFTMintResult = {
  id: string;
  metadata: MetadataMap;
  transactionId: string;
};

export default class OnChainProject extends Project {
  async getContract(): Promise<string> {
    return OnChainGenerator.contract({
      contracts: this.config.contracts,
      contractName: this.contractName,
      schema: this.schema,
    });
  }

  async deployContract(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
    authorizers?: ProjectAuthorizers,
  ): Promise<string> {
    const transaction = await OnChainGenerator.deploy();

    const contractCode = await this.getContract();
    const contractCodeHex = Buffer.from(contractCode, 'utf-8').toString('hex');

    const sigAlgo = publicKey.signatureAlgorithm();

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(this.contractName, t.String),
        fcl.arg(contractCodeHex, t.String),
        fcl.arg(publicKey.toHex(), t.String),
        fcl.arg(SignatureAlgorithm.toCadence(sigAlgo), t.UInt8),
        fcl.arg(HashAlgorithm.toCadence(hashAlgo), t.UInt8),
      ]),
      fcl.limit(1000),

      ...this.getAuthorizers(authorizers),
    ]);

    // TODO: handle error
    const { events } = await fcl.tx(response).onceSealed();

    const accountCreatedEvent: Event = events.find((event: Event) => event.type === 'flow.AccountCreated');

    const contractAddress = accountCreatedEvent.data['address'];

    this.contractAddress = contractAddress;

    return contractAddress;
  }

  async mintNFTs(metadata: MetadataMap[], authorizers?: ProjectAuthorizers): Promise<NFTMintResult[]> {
    const transaction = await OnChainGenerator.mint({
      contracts: this.config.contracts,
      contractName: this.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.contractAddress ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        ...this.schema.map((field) => {
          return fcl.arg(
            metadata.map((values) => field.getValue(values)),
            t.Array(field.asCadenceTypeObject()),
          );
        }),
      ]),
      fcl.limit(1000),

      ...this.getAuthorizers(authorizers),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { events } = await fcl.tx(response).onceSealed();

    return this.formatMintResults(transactionId, events, metadata);
  }

  private formatMintResults(transactionId: string, events: Event[], metadata: MetadataMap[]): NFTMintResult[] {
    const deposits = events.filter((event) => event.type.includes('.Minted'));

    return deposits.map((deposit, i) => {
      return {
        id: deposit.data.id,
        metadata: metadata[i],
        transactionId,
      };
    });
  }
}
