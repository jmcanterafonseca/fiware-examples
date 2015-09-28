## Web Application for the Therm Controller 

A simple Web App that displays the temperature and allows to control it.
Uses Google Charts.

It contains the following subdirectories:

+ `public` which contains the JS and style content
+ `views` which contains the view that displays the temperature charts
+ `server.js` which implements the front-end server using Express

The Web App implements the following behavior:

+ Connects to Orion Context Broker in order to obtain temperature measurements
+ Accepts Web socket client connections from the Web Page
+ Notifies of temperature changes to the Web Page through Web Sockets
+ Subscribes to context changes in order to get notified when new measurements arrive
+ Allows to control the temperature and decides when the actuator (boiler) has to be switched on
+ Actuation is commanded by means of an update over a context entity attribute

### How to run

node >= 0.12

```
node --harmony server.js
```

Point a browser to `http://<SERVER>/my_house/6790`

(The example assumes that the customer number which temperature is being managed is `6790`)

### Configuration

It needs an end point for Orion Context Broker.  It is needed as well to set the IP address of this server
in order to get subscribed to context changes. 