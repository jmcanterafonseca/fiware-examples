'use strict';

var URL = require('url');
var fs = require('fs');

var Orion = require('fiware-orion-client');
var OrionClient = new Orion.Client({
  url: 'http://130.206.83.68:1026/v1'
});
var OrionHelper = Orion.NgsiHelper;
var XmlBuilder = Orion.XmlBuilder;

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

app.use(bodyParser.text({
  type: 'application/xml'
}));

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

var expressWs = require('express-ws')(app);


var sensorDesc = {
  '28-0000056a1cc2' : {
    type: 'House',
    id: 'Customer-6790',
    't': 'temperature'
  }
};

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

function updateContext(msg) {
  var sensorId = msg.sensorId;
  var data = msg.data;

  var dataComps = data.split('=');
  var magnitude = dataComps[0];
  var value = Number(dataComps[1]);
  console.log('Variable: ', magnitude);

  var entityData = sensorDesc[sensorId];

  var contextData = {
    type: entityData.type,
    id: entityData.id
  };
  contextData[entityData[magnitude]] = new Orion.Attribute(value, {
    timestamp: new Date()
  });

  return OrionClient.updateContext(contextData);
}

app.post('/measure', function(req, resp) {
  console.log('Post is here!', req.body.sensorId);

  updateContext(req.body).then(function(result) {
    console.log('Context data updated!!!');
  }).catch(function(err) {
      console.error('Error while updating context: ', err);
  });

  resp.sendStatus(200);
});

// Context Provider entry point
app.post('/ngsi10/boiler/:operation', function(req, resp) {
  var operation = req.params.operation;

  if (operation === 'updateContext') {
    console.log('Update Context!!!: ', req.body);

    var data = OrionHelper.parse(req.body);
    var customerId = data.id;
    var newStatus = data.boilerStatus;

    var response = new XmlBuilder('updateContextResponse');
    var responseData = data;
    if (newStatus) {
      var boilerId = customerConfig[customerId].actuators.boiler.id;
      var connection = customerConfig[customerId].connection;

      connection.send(JSON.stringify({
        type: 'command',
        command: 'setStatus',
        actuatorId: boilerId,
        data: newStatus
      }));
    }
    else {
      console.warn('New status not found. Doing nothing');
    }

    response.child(OrionHelper.buildNgsiResponse(responseData).toXMLTree());
    var payload = response.build(true);
    resp.send(payload);
  }
  else if (operation === 'queryContext') {
    console.log(req.body);
    var ngsiRequest = OrionHelper.parseNgsiRequest(req.body);
    var customerId = ngsiRequest.entities[0].id;
    console.log('Query Customer Id: ', customerId);

    var connection = customerConfig[customerId].connection;

    var msgCallback = function(msg) {
      var msgData = JSON.parse(msg);

      if (msgData.type === 'commandResponse') {
        var responseData = {
          type: 'House',
          id: customerId,
          boilerStatus: msgData.data
        };

        var response = new XmlBuilder('queryContextResponse');
        response.child(OrionHelper.buildNgsiResponse(responseData).toXMLTree());
        var payload = response.build(true);

        resp.send(payload);
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
      callback: 'http://130.206.83.68:9003/ngsi10/boiler'
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
  console.log('IOT Agent up and running');
  app.listen(9003);
}

function onRegisteredError(err) {
  if (err && err.code == 404) {
    console.warn('Cannot update existing subscription');
    registerProvider(true).then(onRegistered);
    return;
  }
  console.error('Cannot subscribe to context changes: ', err);
}

registerProvider().then(onRegistered).
            catch(onRegisteredError).catch(onRegisteredError);


