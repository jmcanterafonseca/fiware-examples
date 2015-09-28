#!/usr/bin/python
# -*- coding: utf-8 -*-

"""
  FIWARE Examples

  This module implements a simple gateway which sends data to 
  a FIWARE IoT Agent by means of HTTP POST Requests. 

  The gateway expects input in the form of lines of text
  with a line containing a sensor id and a measurement. Input is taken
  from the stdin
  
  First parameter is the end point of the IoT Agent to be used

 Author: José Manuel Cantera (Telefónica I+D)
"""


import sys, httplib, json

# IoT Agent end point
default_agent_url = '130.206.83.68:9003'

def post_data(agent_url, sensor_id, measurement):
  headers = { "Content-type": "application/json" }
  data = { 'sensorId': sensor_id, 'data': measurement }

  print json.dumps(data)
  conn = httplib.HTTPConnection(agent_url)

  conn.request("POST", "/measure", body=json.dumps(data), headers=headers)

  response = conn.getresponse()
  print response.status, response.reason


agent_url = default_agent_url
if len(sys.argv) > 1:
  agent_url = sys.argv[1]

while 1:
  line = sys.stdin.readline()
  data = line.split(' ')
  sensor_id = data[0]
  measurement = data[1]

  try:
    post_data(agent_url, sensor_id, measurement)

  except:
    print('Cannot send data to IOT Agent: %s' % agent_url)
    pass
