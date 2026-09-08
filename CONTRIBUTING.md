# Contributing

Keep the package a provider-independent **dashboard card**. Backend integrations and data-provider credentials are out of scope. Maintain the sensor contract and document new mappings.

Create a branch and pull request. Before submitting, run the commands in the README and rebuild the root bundle. Add focused tests for data normalization, history correctness or interactive behavior that changes. Do not check in real HA configurations, tokens, `.storage`, user entity exports, or market account information. Demo and test data must be synthetic.

Use HA theme variables and responsive layouts; verify Finnish and English labels and keyboard controls. No runtime dependencies or external network services should be necessary to render the card.

To release, update `package.json` and its lockfile version, rebuild the bundle, and merge a passing pull request. Create a version tag from the verified `main` commit and publish a GitHub release with `ha-amazing-stock.js` and `SHA256SUMS.txt` attached. This release asset is the HACS distribution. Do not publish an unchecked working-tree bundle.
