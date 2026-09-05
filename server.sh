#!/bin/bash
cd "$(dirname "$0")"
case "$1" in
  stop)
    pkill -f '[n]ode server/index' 2>/dev/null
    echo "stopped"
    ;;
  restart)
    pkill -f '[n]ode server/index' 2>/dev/null
    sleep 1
    nohup node server/index.js > /tmp/sosisbakar-server.log 2>&1 &
    echo "restarted"
    ;;
  *)
    nohup node server/index.js > /tmp/sosisbakar-server.log 2>&1 &
    echo "started, log: /tmp/sosisbakar-server.log"
    ;;
esac