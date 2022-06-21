import { Field } from '../metadata';
import TemplateGenerator, { Contracts } from './TemplateGenerator';

export default class OnChainGenerator extends TemplateGenerator {
  static async contract({
    contracts,
    contractName,
    fields,
  }: {
    contracts: Contracts;
    contractName: string;
    fields: Field[];
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain/contracts/NFT.cdc', {
      contracts,
      contractName,
      fields,
    });
  }

  static async deploy(): Promise<string> {
    return this.generate('../templates/cadence/on-chain/transactions/deploy.cdc', {});
  }

  static async mint({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain/transactions/mint.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }
}
