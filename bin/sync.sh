#!/bin/bash
dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
exclude="${dir}/rsync-exclude.txt"
src="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../dist" && pwd )/"
dest="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../hab/openhab_conf" && pwd )"
rsync --archive --verbose --progress --stats --checksum --exclude-from=${exclude} $src $dest
