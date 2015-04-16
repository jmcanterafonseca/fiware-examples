#!/usr/bin/python

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
