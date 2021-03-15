# ZoneCheck

OpenHAB project to check zones for temperature and humidity.

## Start

This version is intended to be run via `docker-compose up`. Once started create
an account on http://localhost:8080 and install the MQTT Binding in the Things
tab.

## Development

The usuals: `npm install` `npm test`

`node ./bin/template.js` will convert `things/netatmo.tmpl` into
`dist/things/netatmo.things` and copy all non template files to `dist`.

You will probably have to `+x` the `.sh` listed below.

`./bin/sync.sh` will copy files with a differing checksum into the proper
`openHAB` directories.

`./bin/logs.sh` will connect to the running openHAB server and `log:tail`

Edit some js → `node ./bin/template.js && ./bin/sync.sh` → OpenHAB web/Rules →
Run Now 𝄇

Add `REAL="YES"` or `REAL="NO"` to your .env to disable item channels for easier
testing.

## Rules

`Climate Control - Initialize Items` : Initialize items so the functional tests
can be run.

`ZoneCheck Fuctional Test`: Run the functional tests.

`ZoneCheck Run Cycle`: Run the zone check cycle for temperature and humidity.

## Netatmo

Some unnecessary Netatmo items require the Netatmo Binding. These also require a
.env file with:

```
NETATMO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxx"
NETATMO_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NETATMO_USER_NAME="user@email.com"
NETATMO_PASSWORD="xxxxxxxxx"
NETATMO_MAIN_MAC="a0:e0:a0:a0:a0:a0"
```
