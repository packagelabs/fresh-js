import { Field } from '../metadata';
import TemplateGenerator from './TemplateGenerator';

export default class OnChainMintRevealGenerator extends TemplateGenerator {
  static async contract({ contractName, fields }: { contractName: string; fields: Field[] }): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/contracts/NFT.cdc', { contractName, fields });
  }

  static async mint({
    contractName,
    contractAddress,
  }: {
    contractName: string;
    contractAddress: string;
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/transactions/mint.cdc', {
      contractName,
      contractAddress,
    });
  }

  static async reveal({
    contractName,
    contractAddress,
    fields,
  }: {
    contractName: string;
    contractAddress: string;
    fields: Field[];
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/transactions/reveal.cdc', {
      contractName,
      contractAddress,
      fields,
    });
  }
}
