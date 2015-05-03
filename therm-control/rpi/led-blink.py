#!/usr/bin/python

import sys, traceback, time, led, socket, os, threading

# 1 sec
default_sleep_time = 1
server_address = './led-blink-control'
blink_thread = None

class StoppableThread(threading.Thread):
  """Thread class with a stop() method. The thread itself has to check
  regularly for the stopped() condition."""

  def __init__(self, ptarget):
      super(StoppableThread, self).__init__(target=ptarget)
      self._stop = threading.Event()

  def stop(self):
      self._stop.set()

  def stopped(self):
      return self._stop.isSet()


def sleep():
  sleep_time = default_sleep_time
  if len(sys.argv) > 1:
    sleep_time = float(sys.argv[1])
  time.sleep(sleep_time)

def controller():
  current_status = 'OFF'
  sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
  print >>sys.stderr, 'starting up on %s' % server_address
  try:
    sock.bind(server_address)
    sock.listen(1)
  except:
    print >>sys.stderr, 'another process is listening!!'
    sys.exit()

  while True:
    # Wait for a connection
    print >>sys.stderr, 'waiting for a connection'
    connection, client_address = sock.accept()
    try:
      while True:
        data = connection.recv(2)
        print >>sys.stderr, 'received "%s"' % data
        # Blink ON
        if data == 'ON':
          print 'blinking on'
          blink_thread = StoppableThread(ptarget=blink)
          blink_thread.start()
          current_status = 'ON'
        # Blink OFF
        elif data == 'OF':
          if blink_thread != None:
            print 'blinking off'
            blink_thread.stop()
            current_status = 'OFF'
        # kill
        elif data == 'KO':
          print 'killing'
          sock.close()
          sys.exit()
        # Good Bye
        elif data == 'GB':
          break
        # ping
        elif data == 'PG':
          connection.send('hi')
        # status
        elif data == 'ST':
          connection.send(current_status)
    except:
      # print "Unexpected error:", sys.exc_info()[0]
      traceback.print_exc(file=sys.stdout)
      sys.exit()
    finally:
        # Clean up the connection
        connection.close()

def blink():
  try:
    while True:
      if threading.currentThread().stopped():
        break
      led.led_on()

      sleep()

      if threading.currentThread().stopped():
        break
      led.led_off()

      sleep()
  finally:
    led.led_off()

def startup():
  # Make sure the socket does not already exist
  try:
    os.unlink(server_address)
  except OSError:
    if os.path.exists(server_address):
      raise

  t = threading.Thread(target=controller)
  t.setDaemon(True)
  t.start()
  t.join()

try:
  client_sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
  client_sock.connect(server_address)
  client_sock.send('KO')
  time.sleep(3)
  startup()
except socket.error:
  startup()
