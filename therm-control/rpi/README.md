== Therm Controller ==

Here you can find different Python scripts:

- therm-driver.py a driver to obtain current temperature coming from a DSB18B20+ digital sensor
- gateway.py. A simple sensor gateway which posts sensor measurements to an IoT Agent

to run them:

therm-driver.py <interval> | gateway.py <IoT Agent URL>
