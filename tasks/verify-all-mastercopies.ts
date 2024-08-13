import { task } from "hardhat/config"
import { verifyMastercopiesFromArtifact } from "@gnosis-guild/zodiac-core"
import createAdapter from "./createEIP1193"

const { ETHERSCAN_API_KEY } = process.env

task(
  "verify-all-mastercopies",
  "Verifies all mastercopies from the artifacts file, in the block explorer corresponding to the current network",
).setAction(async (_, hre) => {
  const [deployer] = await hre.ethers.getSigners()
  const eip1193Provider = createAdapter({
    provider: hre.network.provider,
    signer: deployer,
  })
  const provider = new hre.ethers.BrowserProvider(eip1193Provider)
  await verifyMastercopiesFromArtifact({
    apiUrlOrChainId: String((await provider.getNetwork()).chainId),
    apiKey: ETHERSCAN_API_KEY as string,
  })
})
