# Zodiac Mod Starter Kit

[![Build Status](https://github.com/gnosis/zodiac-mod-starter-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/gnosis/zodiac-mod-starter-kit/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/gnosis/zodiac-mod-starter-kit/badge.svg?branch=main&cache_bust=1)](https://coveralls.io/github/gnosis/zodiac-module-bridge?branch=main)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://github.com/gnosis/CODE_OF_CONDUCT)

A starter kit for creating Zodiac Modules and Modifiers.

The repo contains a sample based on the "Zodiac: build your own module" tutorial found [here](https://gnosis.github.io/zodiac/docs/tutorial-build-a-module/setup).

This starter kit is set up to be used with **Hardhat**. A starter kit using Foundry is available [here](https://github.com/gnosis/zodiac-mod-starter-kit/tree/foundry).

## Commands

To see available commands run `yarn hardhat`.

Some helpful commands:

```
yarn install # install dependencies
yarn build # compiles contracts
yarn test # runs the tests
yarn deploy # deploys the contracts add the `--network` param to select a network
```

## Deployment

This project is set up to support both a "normal deployment" where the module is deployed directly, along with deployment via the Mastercopy / Minimal Proxy pattern (using our ModuleProxyFactory).

Currently, it is set up to deploy via the Mastercopy / Minimal Proxy pattern on Rinkeby and as a "normal deployment" on other networks. You can easily modify this behavior for your own module.

```
yarn deploy # "normal deployment"
yarn  deploy --network rinkeby # deploys a mastercopy and a minimal proxy for the module
```

The "normal deployment" can be useful for easily deploying and testing your module locally (for instance, the Hardhat Network).

The "normal deployment" deploys the MyModule contract and the test contracts (`contracts/test/Button.sol` and `contracts/test/TestAvatar.sol`), then sets the TestAvatar as the Button owner, and enables MyModule on the TestAvatar.

The Mastercopy / Minimal Proxy deployment deploys the MyModule mastercopy, a MyModule proxy, and the test contracts (contracts/test/Button.sol and contracts/test/TestAvatar.sol), then sets the TestAvatar as the Button owner and enables the MyModule proxy on the TestAvatar.

### Mastercopy and minimal proxys

When deploying modules that are going to be used for multiple avatars, it can make sense to use our Mastercopy/Proxy pattern. This deployment uses the Singleton Factory contract (EIP-2470). See a list of supported networks [here](https://blockscan.com/address/0xce0042B868300000d44A59004Da54A005ffdcf9f). For adding support to other chains, check out the documentation [here](https://github.com/gnosis/zodiac/tree/master/src/factory#deployments) and [here](https://eips.ethereum.org/EIPS/eip-2470).

## Attache your module to a Gnosis Safe

Once you have created a module and want to add it to a Gnosis Safe:

1. In the Gnosis Safe app, navigate to the "apps" tab and select the Zodiac Safe App.
2. Select "custom module", enter the address of your newly deployed module, and hit "Add Module".

It will then show up under Modules and Modifiers in the Gnosis Safe's Zodiac app.

## Helpful links

- [Zodiac Documentation](https://gnosis.github.io/zodiac/docs/intro)
- [Hardhat](https://hardhat.org/getting-started/)
- [Hardhat Deploy](https://github.com/wighawag/hardhat-deploy)
