#!/bin/sh

gpio mode $1 out
gpio write $1 $2
