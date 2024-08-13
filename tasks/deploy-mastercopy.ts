import { deployMastercopy } from "zodiac-core"
import { task } from "hardhat/config"
import createAdapter from "./createEIP1193"

const FirstAddress = "0x0000000000000000000000000000000000000001"
const SaltZero = "0x0000000000000000000000000000000000000000000000000000000000000000"

task("deploy-mastercopy", "Deploys current state as mastercopy").setAction(async (hre) => {
  const [signer] = await hre.ethers.getSigners()
  const eip1193Provider = createAdapter({
    provider: hre.network.provider,
    signer: signer,
  })

  const ConnextModule = await hre.ethers.getContractFactory("ConnextModule")

  const { noop, address } = await deployMastercopy({
    bytecode: ConnextModule.bytecode,
    constructorArgs: {
      types: ["address", "address", "address", "address", "uint32", "address"],
      values: [FirstAddress, FirstAddress, FirstAddress, FirstAddress, 0, FirstAddress],
    },
    salt: SaltZero,
    provider: eip1193Provider,
  })

  if (noop) {
    console.log("ConnextModule already deployed to:", address)
  } else {
    console.log("ConnextModule was deployed to:", address)
  }
})
