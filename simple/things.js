'use strict';

// Server must be run with the -multiservice option (multitenant)
const ORION_SERVER = 'http://130.206.80.48:1026/v1';

const MY_THING = 'RSUBBY';

var thing = process.argv[2] || MY_THING;

var Orion = require('fiware-orion-client'),
    OrionClient = new Orion.Client({
      url: ORION_SERVER,
      service: 'smartGondor'
    });

var query = {
  id: '/gardens' + '/' + thing + ':' + 'ThinkingThing'
};

if (thing === 'Y75MZZ') {
  console.log('Here');
  OrionClient = new Orion.Client({
    url: 'http://hackathon.ttcloud.net:10026/v1',
    service: 'pruebasDani'
  });
  
  query.id = '/test1' + '/' + thing;
}

OrionClient.queryContext(query).then(function(data) {
  if (data) {
    console.log(data.type);
    console.log('Temperature reported by ', thing, 'is ', data.temperature);
  }
  else {
    console.log('No data found, please check thing ID: ', thing);
  }
}).catch(function(err) {
    console.error('Error while querying Thinking Things', err);
});