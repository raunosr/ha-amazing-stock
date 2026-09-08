# Security policy

Security fixes target the latest release. Report vulnerabilities using the repository's **Security → Report a vulnerability** page. Do not include HA access tokens, account credentials, or private sensor dumps in public issues.

The distributed card is a self-contained frontend module. It reads existing HA states and recorder history using the current user's session, and opens standard entity details on request. It contains no credentials, trading operations, direct provider connections, analytics, or runtime code evaluation. Attribute mappings select property names only; dynamic text is HTML-escaped.

The public repository uses a protected `main` branch, pull requests and required checks, disabled force pushes/deletion, restricted workflow tokens, secret scanning and push protection. Repository settings are enforced on GitHub; policy files alone are not security controls. Dependency updates are proposed by Dependabot. GitHub Actions entry points are pinned to commit SHAs.

For a sole maintainer, PR approval count is zero because the author cannot approve their own PR. Automated checks and resolved conversations remain mandatory, including for administrators. Adding a second maintainer should be accompanied by a required independent approval.
