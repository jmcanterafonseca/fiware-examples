#!/usr/bin/python

import sys, json, led, socket, time, subprocess
from ws4py.client.threadedclient import WebSocketClient

default_agent_url = 'ws://130.206.83.68:9003/ws_measure'
server_address = './led-blink-control'

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

def run_blinker():
  try:
    client_sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client_sock.connect(server_address)
  except:
    subprocess.call(['./led-blink.py'])
    time.sleep(3)
    client_sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client_sock.connect(server_address)

  return client_sock

def send_blinker_cmd(client_sock, cmd):
  client_sock.send(cmd)
  client_sock.send('GB')
  client_sock.close()


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

  while 1:
    line = sys.stdin.readline()
    data = line.split(' ')
    sensor_id = data[0]
    measurement = data[1]
    post_data(ws, agent_url, sensor_id, measurement)

except:
  print('Cannot send data to IOT Agent: %s' % agent_url)
  pass
