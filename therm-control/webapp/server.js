'use strict';

var URL = require('url');
var QueryString = require('querystring');
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

var app = express();

app.use(morgan('dev',{
  stream: loggerStream
}));

app.use(express.static(__dirname + '/public'));

// Temporal hack, TODO: set this to a relative path
app.set('views', '/home/jmcf/hack4good/views');
app.set('view engine', 'ejs');

app.get('/my_house/:customerId', function(req, resp) {
  OrionClient.queryContext({
    id: 'Customer' + '-' + req.params.customerId,
    type: 'House'
  }).then(function(data) {
    resp.render('my_house', {
      'currentTemp': data.temperature,
    });
  }).catch(function(err) {
    console.error('Error: ', err);
    resp.sendStatus(500);
  });
});

app.listen(9002);
