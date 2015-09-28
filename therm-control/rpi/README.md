## Raspberry PI Modules for the Therm Controller

Here you can find different Python scripts:

- `therm-driver.py`. A driver to obtain current temperature coming from a DSB18B20+ digital sensor
- `gateway.py`. A simple sensor gateway which posts sensor measurements to an IoT Agent
- `gateway-ws.py`. A sensor gateway based on WebSockets. It can receive actuation commands as well
- `led-blink.py`. A process which allows to put a LED on blink mode
- `led.py`. A module to switch on / off LEDs connected to RPI GPIOs
- `led.sh`. An auxiliary shell script used by led.py
- `socat.sh`. A script to send commands to the led-blink script.

### therm-driver.py

The output of the therm driver is a line like 

```
28-0000056a1cc2 t=23.187000
```

First field is the serial number of the sensor and second field the temperature

Data is provided in intervals of 5 seconds by default. An optional argument can be provided
indicating the time which ellapses between two measurements

### gateway-ws.py

The gateway opens a `Web Socket` connection to the IoT Agent in order to send measurements
The gateway is capable as well to receive messages (commands) in order to
obtain or toggle the status of an actuator (boiler).

As it happens with the HTTP POST gateway it receives measurements as lines of text received under the `stdin`

### led-blink.py

This programme exports a server which is able to control a LED  connected to a Raspberry PI 

The server listens to a UNIX Socket called 'led-blink-control' 

The server accepts a series of commands, namely:

- `ON` --> Switches on the LED and makes it blink forever
- `OF` --> Switches off the LED and stops any ongoing blinking
- `PG` --> Pings the server
- `GB` --> Ends the session
- `KO` --> Kills the server

## How to run

```
therm-driver.py <interval> | gateway-ws.py <IoT Agent URL>
```