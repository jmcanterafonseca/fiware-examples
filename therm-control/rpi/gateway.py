#!/usr/bin/python

import sys, httplib, json

default_agent_url = '192.168.242.47:9001'

def post_data(agent_url, sensor_id, measurement):
  headers = { "Content-type": "application/json" }
  data = { 'sensorId': sensor_id, 'data': measurement }

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
