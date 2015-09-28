## Therm Controller
This example shows how to implement a *temperature controller* with FIWARE

It contains three components:

* A **Custom IoT Agent** capable of receiving measurements through HTTP or Web Sockets
* A **Web Application** which is able to perform temperature control
* A set of **Python** components (for *Raspberry PI*) that implement sensor reading,
actuator management and gateway functionalities

The example consists of:

+ A Raspberry PI connected to a **DS18B20** digital temperature sensor
+ A Raspberry PI connected to a **LED** which simulates a boiler actuator
+ A **Gateway** process capable of providing data from the Raspberry PI to a custom IoT Agent
+ An **IoT Agent** capable of talking to the gateway through HTTP or through Web Sockets
+ The IoT Agent publishes measurements to a **Context Broker**
+ A temperature management *Web application* which reads temperature measurements from the Context Broker
and displays it in a Web Page.
+ The Web Application allows to set a desired temperature. Depending on the desired temperature and
the current temperature the Web Application reacts and switches on or off an actuator (boiler)
+ When the boiler is ON a LED connected to the Raspberry PI starts *blinking*. 
