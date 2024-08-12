import * as dotenv from "dotenv"
import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "@nomicfoundation/hardhat-verify"
import "@nomicfoundation/hardhat-ethers"
import "@typechain/hardhat"
import "hardhat-gas-reporter"
import "hardhat-deploy"
// import "solidity-coverage"
import "./tasks/mastercopy-extract"
import "./tasks/mastercopy-deploy"
import "./tasks/mastercopy-verify"
import "./tasks/setup"
import type { HttpNetworkUserConfig } from "hardhat/types"

dotenv.config()

const sharedNetworkConfig: HttpNetworkUserConfig = {}
if (process.env.PRIVATE_KEY) {
  sharedNetworkConfig.accounts = [process.env.PRIVATE_KEY]
}

const config: HardhatUserConfig = {
  paths: {
    artifacts: "build/artifacts",
    cache: "build/cache",
    deploy: "deploy/raw", // normal deployment
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
    sepolia: {
      ...sharedNetworkConfig,
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
    },
  },
  namedAccounts: {
    deployer: 0,
    dependenciesDeployer: 1,
    tester: 2,
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
