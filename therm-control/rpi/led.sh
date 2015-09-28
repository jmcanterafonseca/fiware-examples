#!/bin/sh

# FIWARE Examples
# Simple script to switch on / off a LED connected to a Raspberry PI
# Use 1 1 for GPIO 18

gpio mode $1 out
gpio write $1 $2
