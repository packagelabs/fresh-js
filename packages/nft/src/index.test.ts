import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from '@fresh-js/crypto';
import { OnChainMintRevealProject, Field, fieldTypes } from './index';
import { NetworkConfig, Authorizer } from '@fresh-js/core';

describe('OnChainMintRevealProject', () => {
  
  // Emulator configuration
  const networkConfig = new NetworkConfig({
    host: 'http://localhost:8888',
    contracts: {
      FungibleToken: '0xee82856bf20e2aa6',
      NonFungibleToken: '0xf8d6e0586b0a20c7',
      MetadataViews: '0xf8d6e0586b0a20c7',
    },
  });

  const project = new OnChainMintRevealProject({
    contractName: 'Foo',
    contractAddress: '0x01cf0e2f2f715450',
    fields: [new Field('foo', fieldTypes.String), new Field('bar', fieldTypes.Int)],
    networkConfig,
  });

  const PRIVATE_KEY_HEX = '4d9287571c8bff7482ffc27ef68d5b4990f9bd009a1e9fa812aae08ba167d57f';

  const privateKey = InMemoryECPrivateKey.fromHex(PRIVATE_KEY_HEX, SignatureAlgorithm.ECDSA_P256);
  const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

  const authorizer = new Authorizer({ address: '0xf8d6e0586b0a20c7', keyIndex: 0, signer });

  project.setDefaultAuthorizer(authorizer);

  it('should generate a contract', async () => {
    console.log(await project.getContract());
  });

  it('should deploy a contract', async () => {
    const publicKey = privateKey.getPublicKey();

    const contractAddress = await project.deployContract(publicKey, HashAlgorithm.SHA3_256, 'foo');

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

    const mintedNFTs = await project.mintNFTs(metadata);

    console.log(mintedNFTs);

    const revealedNFTs = await project.revealNFTs(mintedNFTs);

    console.log(revealedNFTs);
  });
});
