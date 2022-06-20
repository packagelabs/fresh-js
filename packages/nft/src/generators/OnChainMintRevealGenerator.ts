import { Field } from '../metadata';
import TemplateGenerator, { Contracts } from './TemplateGenerator';

export default class OnChainMintRevealGenerator extends TemplateGenerator {
  static async contract({
    contracts,
    contractName,
    fields,
  }: {
    contracts: Contracts;
    contractName: string;
    fields: Field[];
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/contracts/NFT.cdc', {
      contracts,
      contractName,
      fields,
    });
  }

  static async deploy(): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/transactions/deploy.cdc', {});
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
    return this.generate('../templates/cadence/on-chain-mint-reveal/transactions/mint.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }

  static async reveal({
    contracts,
    contractName,
    contractAddress,
    fields,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
    fields: Field[];
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/transactions/reveal.cdc', {
      contracts,
      contractName,
      contractAddress,
      fields,
    });
  }
}
