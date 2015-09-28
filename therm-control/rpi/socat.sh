#!/bin/sh

# Opens a UNIX socket connection
# Useful to test the led-blink process
socat UNIX-CONNECT:./led-blink-control STDIN
