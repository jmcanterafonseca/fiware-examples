#!/usr/bin/python
# -*- coding: utf-8 -*-

"""
   FIWARE Examples

   This is an auxiliary module to switch on / off a LED
   LED is connected to one GPIO of a Raspberry PI

  Current implementation is a wrapper over a led.sh script
  which uses wgpio utilities that should be installed on the Raspberry PI

  Author: José Manuel Cantera (Telefónica I+D)
"""

import subprocess

# GPIO 1 == GPIO 18
default_gpio = 1

def led_on(gpio_num=default_gpio):
  subprocess.call(['./led.sh', str(gpio_num), '1'])

def led_off(gpio_num=default_gpio):
  subprocess.call(['./led.sh', str(gpio_num), '0'])
