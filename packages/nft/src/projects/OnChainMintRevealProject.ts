// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { TransactionOptions, Event, Authorizer } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';
import { Field, fieldTypes, MetadataMap, hashMetadata } from '../metadata';
import OnChainMintRevealGenerator from '../generators/OnChainMintRevealGenerator';
import { NetworkConfig } from '..';
import { ProjectAuthorizers } from '.';

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
  contractAddress?: string;
  networkConfig: NetworkConfig;

  defaultAuthorizer?: Authorizer;
  admin?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;

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
    networkConfig,
    authorizers,
  }: {
    contractName: string;
    contractAddress?: string;
    fields: Field[];
    networkConfig: NetworkConfig;
    authorizers?: ProjectAuthorizers;
  }) {
    this.contractName = contractName;
    this.contractAddress = contractAddress;
    this.networkConfig = networkConfig;

    this.fields = [...OnChainMintRevealProject.defaultFields, ...fields];

    if (authorizers) {
      this.admin = authorizers.admin;
      this.payer = authorizers.payer;
      this.proposer = authorizers.proposer;
    }

    // TODO: find a better way to set this.
    //
    // Global config is messy but FCL requires it
    fcl.config().put('accessNode.api', this.networkConfig.host);
  }

  setDefaultAuthorizer(auth: Authorizer) {
    this.defaultAuthorizer = auth;
  }

  setAdmin(auth: Authorizer) {
    this.admin = auth;
  }

  setPayer(auth: Authorizer) {
    this.payer = auth;
  }

  setProposer(auth: Authorizer) {
    this.proposer = auth;
  }

  async getContract(): Promise<string> {
    return OnChainMintRevealGenerator.contract({
      contracts: this.networkConfig.contracts,
      contractName: this.contractName,
      fields: this.fields,
    });
  }

  async deployContract(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
    placeholderImage: string,
    authorizers?: ProjectAuthorizers,
  ): Promise<string> {
    const transaction = await OnChainMintRevealGenerator.deploy();

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
        fcl.arg(placeholderImage, t.String),
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

  private getAuthorizers(authorizers?: ProjectAuthorizers) {
    const adminAuth = authorizers?.admin ?? this.admin ?? this.defaultAuthorizer;
    if (!adminAuth) {
      // TODO: improve error message
      throw 'must specify admin account';
    }

    const payerAuth = authorizers?.payer ?? this.payer ?? this.defaultAuthorizer;
    if (!payerAuth) {
      // TODO: improve error message
      throw 'must specify payer account';
    }

    const proposerAuth = authorizers?.proposer ?? this.proposer ?? this.defaultAuthorizer;
    if (!proposerAuth) {
      // TODO: improve error message
      throw 'must specify proposer account';
    }

    return [
      fcl.payer(payerAuth.toFCLAuthorizationFunction()),
      fcl.proposer(proposerAuth.toFCLAuthorizationFunction()),
      fcl.authorizations([adminAuth.toFCLAuthorizationFunction()]),
    ];
  }

  async mintNFTs(metadata: MetadataMap[], options: TransactionOptions): Promise<NFTMintResult[]> {
    const hashedNFTs = this.hashNFTs(metadata);

    const hashes = hashedNFTs.map((nft) => nft.metadataHash);

    const transaction = await OnChainMintRevealGenerator.mint({
      contracts: this.networkConfig.contracts,
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
      contracts: this.networkConfig.contracts,
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
