#!/bin/bash
dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
exclude="${dir}/rsync-exclude.txt"
src="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../src" && pwd )/"
dest="/etc/openhab"
touch "${src}automation/jsr223/zonecheck/rules.js"
rsync --archive --verbose --progress --stats --exclude-from=${exclude} $src $dest
sleep 3
curl -X PUT --header "Content-Type: text/plain" --header "Accept: application/json" -d "RUN" "http://127.0.0.1:8080/rest/items/Z_Trigger/state"
