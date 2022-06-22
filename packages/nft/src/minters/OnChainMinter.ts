// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';
import { MetadataMap } from '../metadata';
import OnChainGenerator from '../generators/OnChainGenerator';
import Minter from './Minter';

type NFTMintResult = {
  id: string;
  metadata: MetadataMap;
  transactionId: string;
};

export default class OnChainMinter extends Minter {

  async getContract(): Promise<string> {
    return OnChainGenerator.contract({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      schema: this.project.schema,
    });
  }

  async deployContract(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
  ): Promise<string> {
    const transaction = await OnChainGenerator.deploy();

    const contractCode = await this.getContract();
    const contractCodeHex = Buffer.from(contractCode, 'utf-8').toString('hex');

    const sigAlgo = publicKey.signatureAlgorithm();

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(this.project.contractName, t.String),
        fcl.arg(contractCodeHex, t.String),
        fcl.arg(publicKey.toHex(), t.String),
        fcl.arg(SignatureAlgorithm.toCadence(sigAlgo), t.UInt8),
        fcl.arg(HashAlgorithm.toCadence(hashAlgo), t.UInt8),
      ]),
      fcl.limit(1000),

      ...this.project.getAuthorizers(),
    ]);

    // TODO: handle error
    const { events } = await fcl.tx(response).onceSealed();

    const accountCreatedEvent: Event = events.find((event: Event) => event.type === 'flow.AccountCreated');

    const contractAddress = accountCreatedEvent.data['address'];

    this.project.setContractAddress(contractAddress);

    return contractAddress;
  }

  async mintNFTs(metadata: MetadataMap[]): Promise<NFTMintResult[]> {
    const transaction = await OnChainGenerator.mint({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.project.contractAddress ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        ...this.project.schema.map((field) => {
          return fcl.arg(
            metadata.map((values) => field.getValue(values)),
            t.Array(field.asCadenceTypeObject()),
          );
        }),
      ]),
      fcl.limit(1000),

      ...this.project.getAuthorizers(),
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
