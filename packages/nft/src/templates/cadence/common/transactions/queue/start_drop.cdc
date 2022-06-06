import {{ contractName }} from {{ contractAddress }}

// TODO: use template variables rather than hardcoded testnet values
import NFTQueueDrop from 0x81bb4cd7789520d6
import NonFungibleToken from 0x631e88ae7f1d7c20
import FungibleToken from 0x9a0766d93b6608b7

transaction(price: UFix64) {

    prepare(signer: AuthAccount) {
        let admin = signer
            .borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")

        let collection = signer
            .getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>({{ contractName }}.CollectionPrivatePath)

        let paymentReceiver = signer
            .getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)!

        let drop <- NFTQueueDrop.createDrop(
            nftType: Type<@{{ contractName }}.NFT>(),
            collection: collection,
            paymentReceiver: paymentReceiver,
            paymentPrice: price,
        )

        signer.save(<- drop, to: NFTQueueDrop.DropStoragePath)

        signer.link<&NFTQueueDrop.Drop{NFTQueueDrop.DropPublic}>(
            NFTQueueDrop.DropPublicPath, 
            target: NFTQueueDrop.DropStoragePath
        )
    }
}
