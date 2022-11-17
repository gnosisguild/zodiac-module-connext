# Zodiac Connext Module

[![Build Status](https://github.com/gnosis/zodiac-module-connext/actions/workflows/ci.yml/badge.svg)](https://github.com/gnosis/zodiac-module-connext/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/gnosis/zodiac-module-connext/badge.svg?branch=main&cache_bust=1)](https://coveralls.io/github/gnosis/zodiac-module-connext?branch=main)
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

```sh
yarn install # install dependencies
yarn build # compiles contracts
yarn test # runs the tests
yarn deployMasterCopy # deploys the mastercopy of the Connext Module. Add the `--network` param to select a network.
yarn setup # deploys a instance of this module.
```

## License

Created under the [LGPL-3.0+ license](LICENSE).

## Audits

An audit has been performed by the [G0 group](https://github.com/g0-group).

All issues and notes of the audit have been addressed in commit [2341cf0375b8f78b0dc3bd4d0d7ee864e1a6f804](https://github.com/gnosis/zodiac-module-exit/commit/2341cf0375b8f78b0dc3bd4d0d7ee864e1a6f804).

The audit results are available as a pdf in [this repo](packages/contracts/audits/ZodiacExitModuleJan2022.pdf).

## Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.