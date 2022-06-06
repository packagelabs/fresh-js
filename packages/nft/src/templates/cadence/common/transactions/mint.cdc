// TODO: use template variables rather than hardcoded testnet values
// 0x631e88ae7f1d7c20 is the address from the testnet nft interface contract
import NonFungibleToken from 0x631e88ae7f1d7c20
import {{ contractName }} from {{ contractAddress }}

transaction(
    {{#each fields}}
    {{ this.name }}: [{{ this.type.toCadence }}],
    {{/each}}
) {
    
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
        var i = 0
        
        while i < {{ fields.[0].name }}.length {

            let token <- self.admin.mintNFT(
                {{#each fields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
            )
        
            self.receiver.deposit(token: <- token)

            i = i +1
        }
    }
}
