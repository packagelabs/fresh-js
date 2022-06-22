// @ts-ignore
import * as fcl from '@onflow/fcl';

// @ts-ignore
import * as t from '@onflow/types';

import Project from "../Project";
import ClaimSaleGenerator from '../generators/ClaimSaleGenerator';
import { Authorizer, Event } from '@fresh-js/core';

export default class ClaimSale {

  project: Project;

  constructor(project: Project) {
    this.project = project;
  }

  async getContract(): Promise<string> {
    return ClaimSaleGenerator.contract({
      contracts: this.project.config.contracts,
    });
  }

  async start(price: string) {
    const transaction = await ClaimSaleGenerator.startSale({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.project.contractAddress ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(price, t.UFix64)
      ]),
      fcl.limit(1000),

      ...this.project.getAuthorizers(),
    ]);

    // TODO: handle error
    const { error } = await fcl.tx(response).onceSealed();
  }

  async stop() {
    const transaction = await ClaimSaleGenerator.stopSale({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.project.contractAddress ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.limit(1000),

      ...this.project.getAuthorizers(),
    ]);

    // TODO: handle error
    const { error } = await fcl.tx(response).onceSealed();
  }

  // TODO: move this function and/or refactor this class
  //
  // This is a transaction that is only executed by client, who does not need
  // access to the "admin" settings of a project.
  //
  // What is the best way to separate the two? 
  async claimNFT(saleAddress: string, authorizer: Authorizer): Promise<string> {
    const transaction = await ClaimSaleGenerator.claimNFT({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.project.contractAddress ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(saleAddress, t.Address)
      ]),
      fcl.limit(1000),

      fcl.payer(authorizer.toFCLAuthorizationFunction()),
      fcl.proposer(authorizer.toFCLAuthorizationFunction()),
      fcl.authorizations([authorizer.toFCLAuthorizationFunction()]),
    ]);

    // TODO: handle error
    const { error, events } = await fcl.tx(response).onceSealed();

    const claimedEvent: Event = events.find((event: Event) => event.type.includes('.Claimed'));

    const nftId = claimedEvent.data['nftID'];
    
    return nftId
  }
}
