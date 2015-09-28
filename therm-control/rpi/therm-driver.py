#!/usr/bin/python
# -*- coding: utf-8 -*-

"""
FIWARE Examples

This is a therm driver which reads temperature data provided by a
DS18B20 digital temperature sensor connected to a Raspberry Pi 

The output of the therm driver is a line like 

28-0000056a1cc2 t=23.187000

First field is the serial number of the sensor and second field the temperature

Data is provided in intervals of 5 seconds by default. An optional argument can be provided
indicating the time which ellapses between two measurements

Author: José Manuel Cantera (Telefónica I+D)
"""

import sys, glob, time

base_dir = '/sys/bus/w1/devices/'
device_folder = glob.glob(base_dir + '28*')[0]
device_file = device_folder + '/w1_slave'

sensor_id = device_folder.split('/')[-1]

default_sleep_time = 5

def read_temp_raw():
  f = open(device_file, 'r')
  lines = f.readlines()
  f.close()
  return lines

# Algorithm for reading the temp is described on
# Raspberry PI Cookbook
def read_temp():
  lines = read_temp_raw()
  while lines[0].strip()[-3:] != 'YES':
    time.sleep(0.2)
    lines = read_temp_raw()

  sensor_data_pos = lines[1].find('t=')
  if sensor_data_pos != -1:
    temp_string = lines[1][sensor_data_pos + 2:]
    temp_c = float(temp_string) / 1000.0
    return temp_c

def sleep():
  sleep_time = default_sleep_time
  if len(sys.argv) > 1:
    sleep_time = float(sys.argv[1])
  time.sleep(sleep_time)

while True:
  temperature = read_temp()
  print "%s t=%f" % (sensor_id, temperature)
  sys.stdout.flush()
  sleep()
