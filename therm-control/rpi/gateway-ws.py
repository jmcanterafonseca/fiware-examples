#!/usr/bin/python
# -*- coding: utf-8 -*-

"""
   FIWARE Examples

   This module implements a Gateway which communicates to a IoT Agent
   The gateway opens a Web Socket connection to the IoT Agent in order to send measurements
   The gateway is capable as well to receive messages (commands) in order to
   obtain or toggle the status of an actuator (boiler)

   As it happens with the HTTP POST gateway it receives measurements
   as lines of text received under the stdin
   
   First parameter is the end point of the IoT Agent to be used

   Author: José Manuel Cantera (Telefónica I+D)
"""

import sys, json, led, socket, time, subprocess
from ws4py.client.threadedclient import WebSocketClient

# here it can be change the IOT Agent end point
default_agent_url = 'ws://130.206.83.68:9003/ws_measure'
server_address = './led-blink-control'

# To receive commands through a Web Socket
class WsClient(WebSocketClient):
  
  def received_message(self, msg):
    print ('Msg Received: %s' % msg)
    msg_data = json.loads(str(msg))
    client_socket = run_blinker()

    msg_type = msg_data['type']
    command = msg_data['command']
    if msg_type == 'command':
      if command == 'setStatus':
        send_blinker_cmd(client_socket, msg_data['data'])
      elif command == 'getStatus':
        actuator_id = msg_data['actuatorId']
        status = get_blinker_status(client_socket)

        data = { 'type': 'commandResponse', 'actuatorId': actuator_id,
                'data': status }
        self.send(json.dumps(data))

  def closed(self, code, reason=None):
    print 'Closed'

# Post the data to a WebSocket
def post_data(ws, agent_url, sensor_id, measurement):
  data = { 'type': 'observation', 'sensorId': sensor_id, 'data': measurement }
  try:
    ws.send(json.dumps(data))
  except:
    if ws.server_terminated:
      try:
        print "Retrying..."
        ws = WsClient(agent_url, protocols=['http-only'])
        ws.connect()
        ws.send(json.dumps(data))
      except:
        print "Cannot send data. IoT Agent down?"

# Commands to the blinker are sent through a UNIX socket connection
def run_blinker():
  try:
    client_sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client_sock.connect(server_address)
  except:
    # Starting the blinker if it was not
    subprocess.call(['./led-blink.py'])
    time.sleep(3)
    client_sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client_sock.connect(server_address)

  return client_sock

def send_blinker_cmd(client_sock, cmd):
  client_sock.send(cmd)
  client_sock.send('GB')
  client_sock.close()

# obtains blinker status
def get_blinker_status(client_sock):
  client_sock.send('ST')
  status = client_sock.recv(2)
  client_sock.send('GB')
  client_sock.close()

  return status

try:
  agent_url = default_agent_url
  if len(sys.argv) > 1:
    agent_url = sys.argv[1]

  ws = WsClient(agent_url, protocols=['http-only'])
  ws.connect()

# data is read from the stdin
  while 1:
    line = sys.stdin.readline()
    data = line.split(' ')
    sensor_id = data[0]
    measurement = data[1]
    post_data(ws, agent_url, sensor_id, measurement)

except:
  print('Cannot send data to IOT Agent: %s' % agent_url)
  pass
