#!/bin/bash
docker exec -it zonecheck_openhab_1 bash -c '/openhab/runtime/bin/client -u openhab -p habopen log:tail'
