# Device Bound Session Credentials Test Server

This is a simple example server for the Device Bound Session Credentials
protocol
([explainer](https://github.com/w3c/webappsec-dbsc/blob/main/README.md),
[spec](https://w3c.github.io/webappsec-dbsc/)). It's deployed on Deno
Deploy at https://drubery-dbsc-test-server.deno.dev/.

## Development

The server has a valid Origin Trial token for
https://drubery-dbsc-test-server.deno.dev/. Pre-prod deployments will
only work if Chrome is running with
`--enable-features=DeviceBoundSessions:ForceEnableForTesting/true` (or
the equivalent in chrome://flags).

Deployments are managed with `deployctcl`. For example:
```
deployctl deploy --prod
```
will push the existing code to prod.
