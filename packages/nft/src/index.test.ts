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
    // console.log(await project.getContract());
  });

  it('should mint NFTs', async () => {
    // console.log(await project.contract());
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

    // const mintedNFTs = await project.mintNFTs(metadata, {
    //   payer: authorizer,
    //   proposer: authorizer,
    //   authorizers: [authorizer],
    // });

    // console.log(mintedNFTs);

    const nfts = [
      {
        id: '0',
        metadata: {
          name: 'NFT 1',
          description: 'NFT 1 is awesome.',
          image: '',
          foo: 'foo',
          bar: '42',
        },
        metadataHash: '1081704c34f5e14a0e48afa2bf3d17d5e4e7e52ac64ba58b74c6aefb76343104',
        metadataSalt: '7a3697425f97f19986f87c10f8c0bd27',
        transactionId: 'a6558e5704dc5a3f7155dd0bd04916a1f80dfe0065657e5efbf2c66102011a59',
      },
      {
        id: '1',
        metadata: {
          name: 'NFT 2',
          description: 'NFT 2 is awesome.',
          image: '',
          foo: 'foo',
          bar: '42',
        },
        metadataHash: '16f4d6db90c87f88d658918882c9de3650539f1a2688fc3b8e76181b24b5ee4e',
        metadataSalt: '57ec5cb1db6c98c298db63c3e2165291',
        transactionId: 'a6558e5704dc5a3f7155dd0bd04916a1f80dfe0065657e5efbf2c66102011a59',
      },
    ];

    const revealedNFTs = await project.revealNFTs(nfts, {
      payer: authorizer,
      proposer: authorizer,
      authorizers: [authorizer],
    });

    console.log(revealedNFTs);
  });
});
