// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { TransactionOptions, Event } from '@fresh-js/core';
import { Field, fieldTypes, MetadataMap, hashMetadata } from '../metadata';
import OnChainMintRevealGenerator from '../generators/OnChainMintRevealGenerator';

type HashedNFT = {
  metadata: MetadataMap;
  metadataHash: string;
  metadataSalt: string;
};

type NFTMintResult = {
  id: string;
  metadata: MetadataMap;
  metadataHash: string;
  metadataSalt: string;
  transactionId: string;
};

interface NFTRevealInput {
  id: string;
  metadata: MetadataMap;
  metadataSalt: string;
}

type NFTRevealResult = {
  id: string;
  transactionId: string;
};

export default class OnChainMintRevealProject {
  contractName: string;
  contractAddress: string | null;

  static defaultFields: Field[] = [
    new Field('name', fieldTypes.String),
    new Field('description', fieldTypes.String),
    new Field('image', fieldTypes.IPFSImage),
  ];

  fields: Field[];

  constructor({
    contractName,
    contractAddress,
    fields,
  }: {
    contractName: string;
    contractAddress: string | null;
    fields: Field[];
  }) {
    this.contractName = contractName;
    this.contractAddress = contractAddress || null;
    this.fields = [...OnChainMintRevealProject.defaultFields, ...fields];
  }

  async getContract(): Promise<string> {
    return OnChainMintRevealGenerator.contract({
      contractName: this.contractName,
      fields: this.fields,
    });
  }

  async mintNFTs(metadata: MetadataMap[], options: TransactionOptions): Promise<NFTMintResult[]> {
    const hashedNFTs = this.hashNFTs(metadata);

    const hashes = hashedNFTs.map((nft) => nft.metadataHash);

    const transaction = await OnChainMintRevealGenerator.mint({
      contractName: this.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.contractAddress ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([fcl.arg(hashes, t.Array(t.String))]),
      fcl.limit(1000),

      // TODO: move these to standard helper function on TransactionOptions
      fcl.payer(options.payer.toFCLAuthorizationFunction()),
      fcl.proposer(options.proposer.toFCLAuthorizationFunction()),
      fcl.authorizations(options.authorizers.map((authorizer) => authorizer.toFCLAuthorizationFunction())),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { events } = await fcl.tx(response).onceSealed();

    return this.formatMintResults(transactionId, events, hashedNFTs);
  }

  private hashNFTs(metadata: MetadataMap[]): HashedNFT[] {
    return metadata.map((metadata) => {
      const { hash, salt } = hashMetadata(this.fields, metadata);

      return {
        metadata,
        metadataHash: hash.toString('hex'),
        metadataSalt: salt.toString('hex'),
      };
    });
  }

  private formatMintResults(transactionId: string, events: Event[], nfts: HashedNFT[]): NFTMintResult[] {
    const deposits = events.filter((event) => event.type.includes('.Minted'));

    return deposits.map((deposit, i) => {
      const { metadata, metadataHash, metadataSalt } = nfts[i];

      return {
        id: deposit.data.id,
        metadata,
        metadataHash,
        metadataSalt,
        transactionId,
      };
    });
  }

  async revealNFTs(nfts: NFTRevealInput[], options: TransactionOptions): Promise<NFTRevealResult[]> {
    const ids = nfts.map((nft) => nft.id);
    const salts = nfts.map((nft) => nft.metadataSalt);

    const transaction = await OnChainMintRevealGenerator.reveal({
      contractName: this.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.contractAddress ?? '',
      fields: this.fields,
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(ids, t.Array(t.UInt64)),
        fcl.arg(salts, t.Array(t.String)),
        ...this.fields.map((field) => {
          return fcl.arg(
            nfts.map((nft) => field.getValue(nft.metadata)),
            t.Array(field.type.cadenceType),
          );
        }),
      ]),
      fcl.limit(1000),

      // TODO: move these to standard helper function on TransactionOptions
      fcl.payer(options.payer.toFCLAuthorizationFunction()),
      fcl.proposer(options.proposer.toFCLAuthorizationFunction()),
      fcl.authorizations(options.authorizers.map((authorizer) => authorizer.toFCLAuthorizationFunction())),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { events } = await fcl.tx(response).onceSealed();

    return this.formatRevealtResults(transactionId, events);
  }

  private formatRevealtResults(transactionId: string, events: Event[]): NFTRevealResult[] {
    const deposits = events.filter((event) => event.type.includes('.Revealed'));

    return deposits.map((deposit) => {
      return {
        id: deposit.data.id,
        transactionId,
      };
    });
  }
}
