import NFTClaimSale from {{ contracts.NFTClaimSale }}

transaction {
    
    prepare(signer: AuthAccount) {

        signer.unlink(NFTClaimSale.DropPublicPath)

        let sale <- signer.load<@NFTClaimSale.Sale>(from: NFTClaimSale.SaleStoragePath)

        destroy sale
    }
}
