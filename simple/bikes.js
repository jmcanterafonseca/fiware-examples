'use strict';

const TEST_BED_SERVER = 'http://orion.lab.fiware.org:1026/v1'

var Orion = require('fiware-orion-client'),
    OrionTestBedClient = new Orion.Client({
      url: TEST_BED_SERVER,
      userAgent: 'Test',
      token: 'nwHIDJjDwKzM7bQMEUR1OiJCBckCAm'
    });

function getBikeRentingPosts() {
  var query = {
    type: 'bikerenting',
    id: 'Tusbic.17'
  };
  
  OrionTestBedClient.queryContext(query).then(function(result) {
    if (result !== null) {
      console.log(JSON.stringify(result));
    }
    else {
      console.log('No data found');
    }
  }).catch(function(err) {
      console.  error('Error while querying byclicle data: ', err);
  });
}

getBikeRentingPosts();