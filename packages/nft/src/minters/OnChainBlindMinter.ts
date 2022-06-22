// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';
import { MetadataMap, hashMetadata } from '../metadata';
import OnChainMintRevealGenerator from '../generators/OnChainMintRevealGenerator';
import Minter from './Minter';

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

export default class OnChainMintRevealProject extends Minter {
  async getContract(): Promise<string> {
    return OnChainMintRevealGenerator.contract({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      schema: this.project.schema,
    });
  }

  async deployContract(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
    placeholderImage: string
  ): Promise<string> {
    const transaction = await OnChainMintRevealGenerator.deploy();

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
        fcl.arg(placeholderImage, t.String),
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
    const hashedNFTs = this.hashNFTs(metadata);

    const hashes = hashedNFTs.map((nft) => nft.metadataHash);

    const transaction = await OnChainMintRevealGenerator.mint({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.project.contractAddress ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([fcl.arg(hashes, t.Array(t.String))]),
      fcl.limit(1000),

      ...this.project.getAuthorizers(),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { events } = await fcl.tx(response).onceSealed();

    return this.formatMintResults(transactionId, events, hashedNFTs);
  }

  private hashNFTs(metadata: MetadataMap[]): HashedNFT[] {
    return metadata.map((metadata) => {
      const { hash, salt } = hashMetadata(this.project.schema, metadata);

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

  async revealNFTs(nfts: NFTRevealInput[]): Promise<NFTRevealResult[]> {
    const ids = nfts.map((nft) => nft.id);
    const salts = nfts.map((nft) => nft.metadataSalt);

    const transaction = await OnChainMintRevealGenerator.reveal({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.project.contractAddress ?? '',
      schema: this.project.schema,
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(ids, t.Array(t.UInt64)),
        fcl.arg(salts, t.Array(t.String)),
        ...this.project.schema.map((field) => {
          return fcl.arg(
            nfts.map((nft) => field.getValue(nft.metadata)),
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