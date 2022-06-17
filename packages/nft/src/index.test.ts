import * as fcl from '@onflow/fcl';
import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from '@fresh-js/crypto';
import { OnChainMintRevealProject, Field, fieldTypes } from './index';
import { Authorizer } from '@fresh-js/core';

describe('OnChainMintRevealProject', () => {
  fcl.config().put('accessNode.api', 'http://localhost:8888');

  const project = new OnChainMintRevealProject({
    contractName: 'Foo',
    contractAddress: '0xf8d6e0586b0a20c7',
    fields: [new Field('foo', fieldTypes.String), new Field('bar', fieldTypes.Int)],
  });

  it('should generate a contract', async () => {
    console.log(await project.getContract());
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

    const PRIVATE_KEY_HEX = '4d9287571c8bff7482ffc27ef68d5b4990f9bd009a1e9fa812aae08ba167d57f';

    const privateKey = InMemoryECPrivateKey.fromHex(PRIVATE_KEY_HEX, SignatureAlgorithm.ECDSA_P256);
    const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

    const authorizer = new Authorizer({ address: '0xf8d6e0586b0a20c7', keyIndex: 0, signer });

    const mintedNFTs = await project.mintNFTs(metadata, {
      payer: authorizer,
      proposer: authorizer,
      authorizers: [authorizer],
    });

    const revealedNFTs = await project.revealNFTs(mintedNFTs, {
      payer: authorizer,
      proposer: authorizer,
      authorizers: [authorizer],
    });

    console.log(revealedNFTs);
  });
});
