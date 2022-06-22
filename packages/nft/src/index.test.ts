import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from '@fresh-js/crypto';
import { Project, OnChainBlindMinter, schema } from './index';
import { Authorizer } from '@fresh-js/core';
import ClaimSale from './sales/ClaimSale';

describe('OnChainBlindMinter', () => {

  // Emulator configuration
  const config = {
    host: 'http://localhost:8888',
    contracts: {
      FungibleToken: '0xee82856bf20e2aa6',
      NonFungibleToken: '0xf8d6e0586b0a20c7',
      MetadataViews: '0xf8d6e0586b0a20c7',
    },
  };

  const PRIVATE_KEY_HEX = '4d9287571c8bff7482ffc27ef68d5b4990f9bd009a1e9fa812aae08ba167d57f';

  const privateKey = InMemoryECPrivateKey.fromHex(PRIVATE_KEY_HEX, SignatureAlgorithm.ECDSA_P256);
  const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

  const authorizer = new Authorizer({ address: '0xf8d6e0586b0a20c7', keyIndex: 0, signer });

  const project = new Project({
    config,
    contractName: 'Foo',
    contractAddress: '0x01cf0e2f2f715450',
    schema: [new schema.String('foo'), new schema.Int('bar')],
    authorizers: {
      default: authorizer,
    }
  });

  const minter = new OnChainBlindMinter(project);

  it('should generate a contract', async () => {
    console.log(await minter.getContract());
  });

  it('should deploy a contract', async () => {
    const publicKey = privateKey.getPublicKey();

    const contractAddress = await minter.deployContract(publicKey, HashAlgorithm.SHA3_256, 'foo');

    console.log(contractAddress);
  });

  it('should mint and reveal NFTs', async () => {
    const metadata = [
      {
        name: 'NFT 1',
        description: 'NFT 1 is awesome.',
        image: '',
        foo: 'foo',
        bar: '42',
      },
      {
        name: 'NFT 2',
        description: 'NFT 2 is awesome.',
        image: '',
        foo: 'foo',
        bar: '42',
      },
    ];

    const mintedNFTs = await minter.mintNFTs(metadata);

    console.log(mintedNFTs);

    const revealedNFTs = await minter.revealNFTs(mintedNFTs);

    console.log(revealedNFTs);
  });

  const sale = new ClaimSale(project);

  it('should start a claim sale', async () => {
    await sale.start("10.0");
  });

  it('should stop a claim sale', async () => {
    await sale.stop();
  });
});
