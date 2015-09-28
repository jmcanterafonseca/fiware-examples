## IoT Agent for the Therm Controller Example

Here you can find a simple IoT Agent which gets the data from the gateway and
transforms it to update context data in Orion.

The IoT Agent receives measurements from the gateway and updates context conveniently.
It also registers as a Context Provider in order to interact with actuators managed by the gateway. 

Please take into account that FIWARE provides many IoT Agents off-the-shelf.
This IoT Agent is here for learning purposes and in production you should consider using those
already provided by FIWARE.

### How to run

Use Node.js >= 0.12

node --harmony iot-agent.js


### Configuration

The end point of a Orion Context Broker must be specified, together with the IP address of the agent itself as it
needs to register in Orion as provider. 