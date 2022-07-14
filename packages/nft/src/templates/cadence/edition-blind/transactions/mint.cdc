import NonFungibleToken from {{ contracts.NonFungibleToken }}
import {{ contractName }} from {{ contractAddress }}

transaction(editionHashes: [String]) {
    
    let admin: &{{ contractName }}.Admin
    let receiver: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.receiver = signer
            .getCapability({{ contractName }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")
    }

    execute {
        for editionHash in editionHashes {
            let token <- self.admin.mintNFT(editionHash: editionHash)

            self.receiver.deposit(token: <- token)
        }
    }
}
