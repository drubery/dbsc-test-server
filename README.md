# Device Bound Session Credentials Test Server

This is a simple example server for the Device Bound Session Credentials
protocol
([explainer](https://github.com/w3c/webappsec-dbsc/blob/main/README.md),
[spec](https://w3c.github.io/webappsec-dbsc/)). It's deployed on Deno
Deploy at https://serve.dbsc-test-server.deno.net/.

## Development

Deployments are managed with `deno`. For example:
```
deno deploy --prod
```
will push the existing code to prod.
