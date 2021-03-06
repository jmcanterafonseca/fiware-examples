'use strict';

/*
 *   FIWARE Examples
 *
 *   Implements the server front-end logic for the therm controller example
 *
 *   This server
 *
 *      - receives requests from the Web Browser to serve UI pages
 *      - obtains data by querying the Orion Context Broker
 *      - subscribes to changes in the corresponding entities
 *      - notifies the Web page of changes through a WebSocket
 *      - performs the temperature control by switching on the boiler actuator
 *
 *   Author: José Manuel Cantera (Telefónica I+D)
 *
 */

const PORT = 9002;        // Port on which the server will listen to
const ORION_URL = 'http://130.206.83.68:1026/v1';
const SERVER_ADDRESS = '130.206.83.68';     // Needed for subscriptions

var URL = require('url');
var QueryString = require('querystring');
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
var multer = require('multer');

var app = express();

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(multer());
app.use(bodyParser.json());

app.use(morgan('dev',{
  stream: loggerStream
}));

app.use(express.static(__dirname + '/public'));

// Temporal hack, TODO: set this to a relative path
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Support Web Sockets
var expressWs = require('express-ws')(app);

// It will store WS connections per client
var wsConnections = Object.create(null);

// To load the initial UI this resource is called
app.get('/my_house/:customerId', function(req, resp) {
  console.log('Request has come to my_house');
  // Query Context to obtain customer data
  OrionClient.queryContext({
    id: 'Customer' + '-' + req.params.customerId,
    type: 'House'
  }).then(function(data) {
    console.log('Data from the context broker');
    if (!data) {
      console.warn('No data found!!!');
      data = Object.create(null);
    }
    
    // Three data items are used by the page rendering
    resp.render('my_house', {
      'currentTemp': data.temperature || { value: Number.NEGATIVE_INFINITY },
      'desiredTemp': data.desiredTemperature || 22,
      'boilerStatus': data.boilerStatus || ''
    });
  }).catch(function(err) {
    console.error('Error while querying data: ', err);
    resp.sendStatus(500);
  });
});

// When a new desired temperature is set this method is invoked
app.post('/my_house/:customerId/set_temperature', function(req, resp) {
  var customerId = req.params.customerId;
  var entity = {
    id: 'Customer' + '-' + customerId,
    type: 'House'
  };

  var tempUpdate = Object.create(entity);

  tempUpdate.desiredTemperature = Number(req.body.temperature);

  OrionClient.updateContext(tempUpdate).then(function() {
    return checkTemperature(customerId);
  }).then(function() {
      console.log('Boiler Status updated');
      resp.sendStatus(200);
  }).catch(function(err) {
      console.error('Error while updating context: ', err);
      resp.sendStatus(500);
  });
});

// This resource allows to toggle the status of the boiler
app.post('/my_house/:customerId/toggle_boiler', function(req, resp) {
  var customerId = req.params.customerId;
  OrionClient.queryContext({
    type: 'House',
    id: 'Customer' + '-' + customerId,
    attributes: [ 'boilerStatus' ]
  }).then(function(data) {
      var newStatus = 'ON';
      if (data.boilerStatus === 'ON') {
        newStatus = 'OF';
      }
      return updateBoilerStatus(customerId, newStatus);
  }).then(function() {
      resp.sendStatus(200);
  }).catch(function(err) {
      console.error('Error while setting new boiler status', err);
      resp.sendStatus(500);
  });
});

// Sends a notification to the Web page through Web sockets
function sendNotification(customerId, data) {
  var connections = wsConnections[customerId];
  if (Array.isArray(connections)) {
    connections.forEach(function(aConnection, index) {
      try {
        aConnection.send(JSON.stringify(data));
      }
      catch(e) {
        console.warn('Not connected. Cannot notify');
        connections.splice(index, 1);
      }
    });
  }
  else {
    console.warn('No connection to which send the notification');
  }
}

// Checks temperature and sets a new state for the boiler
function checkTemperature(customerId) {
  return new Promise(function(resolve, reject) {
    var entity = {
      id: 'Customer' + '-' + customerId,
      type: 'House'
    };

    var currentBoilerStatus, newBoilerStatus;

    OrionClient.queryContext(entity).then(function(data) {
      console.log('Data from the customer: ', JSON.stringify(data));
      
      if (!data) {
        console.warn('Cannot query data of customer: ', customerId);
        resolve();
        return;
      }
      currentBoilerStatus = data.boilerStatus;

      var desiredTemp = data.desiredTemperature;
      if (typeof desiredTemp !== 'number') {
        desiredTemp = 22;
      }

      console.log('Status: ', currentBoilerStatus, data.temperature.value,
                  desiredTemp);

      if (data.temperature.value >= desiredTemp) {
        newBoilerStatus = 'OF';
      }
      else {
        newBoilerStatus = 'ON';
      }

      if (currentBoilerStatus !== newBoilerStatus) {
        console.log('Boiler Status must change');
        updateBoilerStatus(customerId, newBoilerStatus).then(function(updated) {
          sendNotification(customerId, {
            'newBoilerStatus': newBoilerStatus
          });
          resolve(updated);
        }).catch(reject);
      }
      else {
        console.info('Boiler status not changed!!');
        resolve();
      }
    }).catch(function(err) {
      reject(err);
    })
  });
}

function updateBoilerStatus(customerId, newStatus) {
  var boilerUpdate = {
    id: 'Customer' + '-' + customerId,
    type: 'House',
    boilerStatus: newStatus
  };

  return OrionClient.updateContext(boilerUpdate, {
    updateAction: 'UPDATE'
  });
}

// Invoked when a change in context happens (a notification is received)
app.post('/on_context_change', function(req, resp) {
  console.log('on context change!!!');
  var ngsiData = OrionHelper.parse(req.body);

  var customerId = ngsiData.id.split('-')[1];
  console.log('Customer Id: ', customerId);

  var newTemp = ngsiData.temperature;
  var newBoilerStatus = ngsiData.boilerStatus;

  if (newTemp) {
    console.log('New temperature!');
    sendNotification(customerId, {
      newTemperature: {
        value: newTemp.value,
        timestamp: newTemp.metadata.timestamp.toLocaleString('es-ES')
      }
    });

    checkTemperature(customerId).then(function() {
      console.log('Temperature checked');
    }).catch(function(err) {
      console.error('Error while checking temperature: ', err);
    });
  }

  if (newBoilerStatus) {
    console.log('New boiler status!');
    sendNotification(customerId, {
      newBoilerStatus: newBoilerStatus
    });
  }

  resp.sendStatus(200);
});

// The Web Client registers in order to obtain notification changes
app.ws('/ws_register', function(ws, req) {
  console.log('WS Register');
  ws.on('message', function(msg, theWs) {
    console.log(msg);
    var msgData = JSON.parse(msg);

    wsConnections[msgData.customerId] = wsConnections[msgData.customerId] || [];
    wsConnections[msgData.customerId].push(ws);

  }).bind(null, ws);  // TODO: Revise this code
});

// Subscribes to context changes creating or renewing a subscription
function registerSubscription(forceCreate) {
  return new Promise(function (resolve, reject) {
    var FILE_SUBSCRIPTION = 'subscription.id';
    var subscriptionId;
    try {
      subscriptionId = fs.readFileSync(__dirname + '/' + FILE_SUBSCRIPTION,
                                       'UTF-8');
    }
    catch(e) {
      console.log('Subscription id not present');
    }

    var subscription = {
      type: 'House',
      id: 'Customer-6790'
    };

    var options = {
      callback: 'http://' + SERVER_ADDRESS + ':' + PORT + '/on_context_change',
      attributes: ['temperature'],
      // Every 20 seconds
      throttling: 'PT15S'
    };

    if (subscriptionId && !forceCreate) {
      console.log('Using existing subscription id: ', subscriptionId);
      options.subscriptionId = subscriptionId;
    }

    OrionClient.subscribeContext(subscription,
                                              options).then(function(data) {
      if (!data) {
        reject({
          code: 404
        });
        return;
      }

      fs.writeFileSync(__dirname + '/' + FILE_SUBSCRIPTION,
                       data.subscriptionId);
      resolve(data.subscriptionId);

    }).catch(function(err) {
      reject(err);
    });
  });
}

function onSubscribed(subscriptionId) {
  console.log('Subscribed to context changes: ', subscriptionId);
  console.log('App Web Server up and running on port: ', PORT);
  app.listen(PORT);
}

function onSubscribedError(err) {
  if (err && err.code == 404) {
    console.warn('Cannot update existing subscription');
    registerSubscription(true).then(onSubscribed);
    return;
  }
  console.error('Cannot subscribe to context changes: ', err);
}

// Subscribe and then starts the server
registerSubscription().then(onSubscribed).
            catch(onSubscribedError).catch(onSubscribedError);

