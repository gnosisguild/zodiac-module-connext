import { deployMastercopy } from "zodiac-core"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import createAdapter from "./createEIP1193"
import "@nomicfoundation/hardhat-ethers"

const FirstAddress = "0x0000000000000000000000000000000000000001"
const SaltZero = "0x0000000000000000000000000000000000000000000000000000000000000000"

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { deployer: deployerAddress } = await getNamedAccounts()
  const [signer] = await hre.ethers.getSigners()
  const eip1193Provider = createAdapter({
    provider: hre.network.provider,
    signer: signer,
  })
  const provider = new hre.ethers.BrowserProvider(eip1193Provider)
  const deployer = await provider.getSigner(deployerAddress)
  const ConnextModule = await hre.ethers.getContractFactory("ConnextModule")
  const args = [FirstAddress, FirstAddress, FirstAddress, FirstAddress, 0, FirstAddress]

  const { noop, address } = await deployMastercopy({
    bytecode: ConnextModule.bytecode,
    constructorArgs: {
      types: ["address", "address", "address", "address", "uint32", "address"],
      values: args,
    },
    salt: SaltZero,
    provider: eip1193Provider,
  })

  if (noop) {
    console.log("ConnextModule already deployed to:", address)
  } else {
    console.log("ConnextModule was deployed to:", address)
  }
}

deploy.tags = ["connect-module"]
export default deploy
