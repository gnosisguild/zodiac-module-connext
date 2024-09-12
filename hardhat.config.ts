
import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "@nomicfoundation/hardhat-verify"
import "@nomicfoundation/hardhat-ethers"
import 'hardhat-gas-reporter'

import dotenv from 'dotenv'
import { HttpNetworkUserConfig } from 'hardhat/types'

dotenv.config()

import "./tasks/extract-mastercopy"
import "./tasks/deploy-mastercopies"
import "./tasks/deploy-mastercopy"
import "./tasks/verify-mastercopies"
import "./tasks/verify-mastercopy"

const { MNEMONIC } = process.env

const sharedNetworkConfig: HttpNetworkUserConfig = {
  accounts: {
    mnemonic: MNEMONIC || "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
  },
}

const config: HardhatUserConfig = {
  paths: {
    artifacts: "build/artifacts",
    cache: "build/cache",
    sources: "contracts",
  },
  solidity: {
    compilers: [{ version: "0.8.20" }, { version: "0.8.15" }, { version: "0.8.0" }],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000,
      gas: 100000000,
    },
    mainnet: {
      ...sharedNetworkConfig,
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
    },
    sepolia: {
      ...sharedNetworkConfig,
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}

export default config
