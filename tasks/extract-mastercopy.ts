import { task } from "hardhat/config"

import { writeMastercopyFromBuild } from "@gnosis-guild/zodiac-core"

import packageJson from "../package.json"
import { ZeroAddress } from "ethers"

const AddressOne = "0x0000000000000000000000000000000000000001"

task("extract:mastercopy", "Extracts and persists current mastercopy build artifacts").setAction(async (_, hre) => {
  writeMastercopyFromBuild({
    contractVersion: packageJson.version,
    contractName: "ConnextModule",
    compilerInput: await hre.run("verify:etherscan-get-minimal-input", {
      sourceName: "contracts/ConnextModule.sol",
    }),
    constructorArgs: {
      types: ["address", "address", "address", "address", "uint32", "address"],
      values: [AddressOne, AddressOne, AddressOne, AddressOne, ZeroAddress, AddressOne],
    },
    salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
  })
})
