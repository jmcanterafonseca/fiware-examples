'use strict';

/*
 *  FIWARE Examples
 *  
 *  Custom IoT Agent for the Therm Controller Example 
 *
 *  Measurements can be provided from a Gateway through
 *  HTTP POST Requests or through Web Sockets
 *
 *  This IoT Agent can play the role of context provider in order
 *  to interact with an actuator (a boiler simulated by a LED on a Raspberry Pi)
 *
 *  This example is provided to understand what an IoT Agent is
 *  and different architectural alternatives to implement them
 *
 *  Author: José Manuel Cantera Fonseca (Telefónica I+D)
 *
 */

const PORT = 9003;    // Port on which the IoT Agent will be listening to

const ORION_URL = 'http://130.206.83.68:1026/v1';
const SERVER_ADDRESS = '130.206.83.68';     // Needed for providing data

var URL = require('url');
var fs = require('fs');

var Orion = require('fiware-orion-client');
var OrionClient = new Orion.Client({
  url: ORION_URL
});
var OrionHelper = Orion.NgsiHelper;

var loggerStream = fs.createWriteStream('./log.txt', {
  flags: 'a',
  encoding: 'utf-8',
  mode: '0666'
});

var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');

var app = express();

app.use(morgan('dev',{
  stream: loggerStream
}));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

var expressWs = require('express-ws')(app);

// Mapping between a device and a Customer
var sensorDesc = {
  '28-0000056a1cc2' : {
    type: 'House',
    id: 'Customer-6790',
    't': 'temperature'
  }
};

// Mapping between a customer and her devices
var customerConfig = {
  'Customer-6790' : {
    sensors: [
      {
        'temperature': [
          {
           '28-0000056a1cc2' : {
              model: 'DS18B20+'
           }
          }
        ]
      }
    ],
    actuators: {
      'boiler': {
        id: 'r123456'
      }
    },
    connection: null
  }
};

// Updates Customer entity and its corresponding measurements
function updateContext(msg) {
  var sensorId = msg.sensorId;
  var data = msg.data;

  var dataComps = data.split('=');
  var magnitude = dataComps[0];
  var value = Number(dataComps[1]);

  var entityData = sensorDesc[sensorId];

  var contextData = {
    type: entityData.type,
    id: entityData.id
  };
  contextData[entityData[magnitude]] = new Orion.Attribute(value, null, {
    timestamp: new Date()
  });

  return OrionClient.updateContext(contextData);
}

// This is one mechanism for receiving measurements from the gateway
app.post('/measure', function(req, resp) {
  console.log('Post is here!', req.body.sensorId);

  updateContext(req.body).then(function(result) {
    console.log('Context data updated with measurements!!!');
  }).catch(function(err) {
      console.error('Error while updating context: ', err);
  });

  resp.sendStatus(200);
});

// Context Provider entry point
app.post('/ngsi10/boiler/:operation', function(req, resp) {
  var operation = req.params.operation;

  // Update context operations correspond to changing the boiler status
  if (operation === 'updateContext') {
    console.log('Update Context!!!: ', JSON.stringify(req.body));
    
    var data = OrionHelper.parseNgsiRequest(req.body);
    console.log('Data for updating context: ', JSON.stringify(data));
    
    var customerId = data.entities[0].id;
    var newStatus = data.entities[0].boilerStatus;

    var responseData = {
      id: customerId,
      type: data.entities[0].type,
      boilerStatus: newStatus
    };
    
    if (newStatus) {
      var boilerId = customerConfig[customerId].actuators.boiler.id;
      var connection = customerConfig[customerId].connection;

      connection && connection.send(JSON.stringify({
        type: 'command',
        command: 'setStatus',
        actuatorId: boilerId,
        data: newStatus
      }));
    }
    else {
      console.warn('New status not found. Doing nothing');
    }

    var response = OrionHelper.buildNgsiResponse(responseData);
    resp.json(response);
  }
  // Query context operations correspond to obtaining boiler status
  else if (operation === 'queryContext') {
    console.log('Query Context:', JSON.stringify(req.body));
    var ngsiRequest = OrionHelper.parseNgsiRequest(req.body);
    var customerId = ngsiRequest.entities[0].id;
    console.log('Query Customer Id: ', customerId);
    
    var connection = customerConfig[customerId].connection;

    var msgCallback = function(msg) {
      console.log('Message Response received!!! ', msg);
      
      var msgData = JSON.parse(msg);

      if (msgData.type === 'commandResponse') {
        var responseData = {
          type: 'House',
          id: customerId,
          boilerStatus: msgData.data
        };

        resp.json(OrionHelper.buildNgsiResponse(responseData));
      }

      connection.removeListener('message', msgCallback);
    };

    if (connection) {
      connection.on('message', msgCallback);

      var boilerId = customerConfig[customerId].actuators.boiler.id;

      connection.send(JSON.stringify({
        type: 'command',
        command: 'getStatus',
        actuatorId: boilerId
      }));
    }
    else {
      console.log('WS Connection not available');
      resp.sendStatus(500);
    }
  }
});

// Web socket connection to the gateway (alternative to POST)
app.ws('/ws_measure', function(ws, req) {
  console.log('Measure!');
  
  ws.on('message', function(msg) {
    console.log('Msg: ', msg);
    var dataMsg = JSON.parse(msg);

    if (dataMsg.type === 'observation') {
      var customerId = sensorDesc[dataMsg.sensorId].id;
      console.log(customerId);
      customerConfig[customerId].connection = ws;

      updateContext(dataMsg).then(function() {
        console.log('Context data updated!!!');
      }).catch(function(err) {
        console.error('Error while updating context: ', err);
      });
    }
  });
});

// Provider registration for the 'boilerStatus' attribute
function registerProvider(forceCreate) {
  return new Promise(function (resolve, reject) {
    var FILE_REGISTRATION = 'registration.id';
    var registrationId;
    try {
      registrationId = fs.readFileSync(__dirname + '/' + FILE_REGISTRATION,
                                       'UTF-8');
    }
    catch(e) {
      console.log('Registration id not present');
    }

    var registration = {
      type: 'House',
      id: 'Customer-6790',
      attributes: ['boilerStatus']
    };

    var options = {
      callback: 'http://' + SERVER_ADDRESS + ':' + PORT + '/ngsi10/boiler'
    };

    if (registrationId && !forceCreate) {
      console.log('Using existing registration id: ', registrationId);
      options.registrationId = registrationId;
    }

    OrionClient.registerContext(registration,
                                              options).then(function(data) {
      if (!data) {
        reject({
          code: 404
        });
        return;
      }

      fs.writeFileSync(__dirname + '/' + FILE_REGISTRATION,
                       data.registrationId);
      resolve(data.registrationId);

    }).catch(function(err) {
      reject(err);
    });
  });
}

function onRegistered(registrationId) {
  console.log('Context provider properly registered: ', registrationId);
  console.log('IOT Agent up and running on port: ', PORT);
  app.listen(PORT);
}

function onRegisteredError(err) {
  if (err && err.code == 404) {
    console.warn('Cannot update existing subscription');
    registerProvider(true).then(onRegistered);
    return;
  }
  console.error('Cannot subscribe to context changes: ', err);
}

// Entry point, once registration happens the server starts listening
registerProvider().then(onRegistered).
            catch(onRegisteredError).catch(onRegisteredError);
