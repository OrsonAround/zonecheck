#!/bin/bash
src="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../src" && pwd )/"
touch "${src}automation/jsr223/zonecheck/rules.js"
curl -X PUT --header "Content-Type: text/plain" --header "Accept: application/json" -d "RUN" "http://127.0.0.1:8080/rest/items/Z_Trigger/state"
