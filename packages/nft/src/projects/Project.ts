// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Authorizer, NetworkConfig } from '@fresh-js/core';
import { Field, fieldTypes } from '../metadata';

export type ProjectAuthorizers = {
  minter?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;
};

export default class Project {
  contractName: string;
  contractAddress?: string;
  networkConfig: NetworkConfig;

  defaultAuthorizer?: Authorizer;
  minter?: Authorizer;
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

    this.fields = [...Project.defaultFields, ...fields];

    if (authorizers) {
      this.minter = authorizers.minter;
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

  setMinter(auth: Authorizer) {
    this.minter = auth;
  }

  setPayer(auth: Authorizer) {
    this.payer = auth;
  }

  setProposer(auth: Authorizer) {
    this.proposer = auth;
  }

  protected getAuthorizers(authorizers?: ProjectAuthorizers) {
    const minterAuth = authorizers?.minter ?? this.minter ?? this.defaultAuthorizer;
    if (!minterAuth) {
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
      fcl.authorizations([minterAuth.toFCLAuthorizationFunction()]),
    ];
  }
}
