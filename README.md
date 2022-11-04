# Zodiac Connext Module

[![Build Status](https://github.com/gnosis/zodiac-mod-starter-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/gnosis/zodiac-mod-starter-kit/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/gnosis/zodiac-mod-starter-kit/badge.svg?branch=main&cache_bust=1)](https://coveralls.io/github/gnosis/zodiac-module-bridge?branch=main)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://github.com/gnosis/CODE_OF_CONDUCT)

The Connext Module belongs to the [Zodiac](https://github.com/gnosis/zodiac) collection of tools, which can be accessed through the Zodiac App available on [Gnosis Safe](https://gnosis-safe.io/).

If you have any questions about Zodiac, join the [Gnosis Guild Discord](https://discord.gg/wwmBWTgyEq). Follow [@GnosisGuild](https://twitter.com/gnosisguild) on Twitter for updates.

## About the Connext Module

⚠️ Warning: Audits for this module are currently underway. **DO NOT USE THIS CODE IN PRODUCTION UNTIL THEY ARE COMPLETE**. ⚠️

This module allows an Avatar to be the target of any arbitrary function call originiating from a Gnosis Safe on another domain (chain or rollup) using [Connext](https://connext.network).

Connext is a modular protocol for cross-domain communication. It piggybacks on the most secure Arbitrary Messaging Bridge available for a given ecosystem (e.g. the Optimism rollup bridge, or the Gnosischain AMB) to relay data and funds asynchronously between contracts on different chains.

The module implements Connext's [IXReceiver](https://github.com/connext/zodiac-module-connext/blob/main/contracts/interfaces/IXReceiver.sol) interface, which receives an encoded payload from across domains and uses it to call a target contract specified as part of the payload. The module restricts the cross-domain call to originate *only* from a prespecified `_origin` ([domain](https://docs.connext.network/resources/supported-chains#domain-ids) identifier of the origin domain) `_originAddress` (address of the source Safe or other contract initiating the cross-domain call). Both `_origin` and `_originAddress` may be updated by the module owner.

## Flow

A DAO or Gnosis Safe on the origin domain wants to call `restrictedFunction()` on the destination domain:
1. The DAO or Gnosis Safe prepares the calldata for `restrictedFunction()`, by ABI encoding:
    - `_to`: target contract address, 
    - `_value`: native assets to be passed into the function, 
    - `_data`: the function signature of `restrictedFunction()`,
    - `_operation`: the type of operation
2. The DAO or Gnosis Safe calls `xcall` on the Connext contract on the origin domain, passing in the above `_calldata` and the `target` Connext Module. See the [Connext Quickstart](https://docs.connext.network/developers/quickstart#source-contract) for more info.
3. Connext's protocol posts your payload to the Connext Module on the destination domain, which in turn calls `restrictedFunction()`.

## Attaching your module to a Gnosis Safe

To add this module to your Gnosis Safe:

1. Deploy the module (see instructions below), passing in the relevant `_origin` and `_originAddress` that you expect messages to come from.
2. In the Gnosis Safe app, navigate to the "apps" tab and select the Zodiac Safe App.
3. Select "custom module", enter the address of your newly deployed module, and hit "Add Module".

It will then show up under Modules and Modifiers in the Gnosis Safe's Zodiac app. You can now interact with this Safe from `_originAddress` on `_origin`!

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

## Helpful links

- [Zodiac Documentation](https://gnosis.github.io/zodiac/docs/intro)
- [Connext Documentation](https://docs.connext.network)
