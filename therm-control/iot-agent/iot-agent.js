'use strict';

var URL = require('url');
var fs = require('fs');

var Orion = require('fiware-orion-client');
var OrionClient = new Orion.Client({
  url: 'http://130.206.83.68:1026/v1'
});

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

var sensorDesc = {
  '28-0000056a1cc2' : {
    type: 'House',
    id: 'Customer-6790',
    't': 'temperature'
  }
};

app.post('/measure', function(req, resp) {
  console.log('Post is here!', req.body.sensorId);

  var sensorId = req.body.sensorId;
  var data = req.body.data;

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

  OrionClient.updateContext(contextData).then(function(result) {
    console.log('Context data updated!!!');
  }).catch(function(err) {
      console.error('Error while updating context: ', err);
  });

  resp.sendStatus(200);
});


app.listen(9001);
console.log('IOT Agent up and running');
