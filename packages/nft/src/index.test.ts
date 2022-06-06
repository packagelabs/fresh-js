import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from '@fresh-js/crypto';
import { Authorizer, OnChainMintRevealProject } from './index';
import { Field, fieldTypes } from './metadata/fields';

describe('OnChainMintRevealProject', () => {
  const project = new OnChainMintRevealProject({
    contractName: 'Foo',
    contractAddress: '0xf8d6e0586b0a20c7',
    fields: [
      new Field('foo', fieldTypes.String),
      new Field('bar', fieldTypes.Int),
    ],
  });

  it('should generate a contract', async () => {
    // console.log(await project.contract());
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

    const authorizer = new Authorizer({ address: "0xf8d6e0586b0a20c7", keyIndex: 0, signer });

    const results = await project.reveal(
      ['0', '1'],
      metadata, 
      { 
        payer: authorizer,
        proposer: authorizer, 
        authorizers: [authorizer] 
      }
    );

    console.log(results);
  });
});
