'use strict';

var ThermController = (function() {
  var gaugeOptions = {
    min: 0, max: 40, yellowFrom: 25, yellowTo: 35,
    redFrom: 35, redTo: 40, minorTicks: 0.1,
    yellowColor: 'yellow'
  };

  var gauge, gaugeData, customerId;

  // WS Connection from which to receive notifications
  var wsConnection;

  function drawGauge(currentValue, desiredValue) {
    gaugeData = new google.visualization.DataTable();
    gaugeData.addColumn('number', 'Current');
    gaugeData.addColumn('number', 'Desired');
    gaugeData.addRows(2);
    gaugeData.setCell(0, 0, currentValue);
    gaugeData.setCell(0, 1, desiredValue || 22);

    gauge = new google.visualization.Gauge(
                                        document.getElementById('gauge_div'));
    gauge.draw(gaugeData, gaugeOptions);

    document.getElementById('new-temp').value = desiredValue || 22;
  }

  function setTempChanged() {
    var newVal = document.getElementById('new-temp').value;

    gaugeData.setValue(0, 1, newVal);
    gauge.draw(gaugeData, gaugeOptions);

    var postData = new FormData();
    postData.append('temperature', newVal);
    Request({
      method: 'POST',
      url: '/my_house/' + customerId + '/set_temperature'
    }, postData).then(function(xhr) {
        console.log('New temp notified to the server')
    }).catch(function(err) {
      console.error('Error while posting data to server: ', err);
    });
  }

  function init(currentTemp, desiredTemp, boilerStatus) {
    if (currentTemp === Number.NEGATIVE_INFINITY) {
      document.querySelector('h1 span').textContent = 'Not found';
      return;
    }

    google.load('visualization', '1', { packages: ['gauge'] });
    google.setOnLoadCallback(drawGauge.bind(null, currentTemp, desiredTemp));

    document.getElementById('new-temp').addEventListener('change',
                                                         setTempChanged);

    var elem = document.querySelector('.js-switch');
    elem.value = boilerStatus;
    elem.checked = (boilerStatus === 'ON');

    var boilerSwitch = new Switchery(elem, {
      color: 'red',
      jackColor: '#fcf45e',
      jackSecondaryColor: '#c8ff77'
    });

    elem.addEventListener('click', function() {
      Request({
        method: 'POST',
        url: '/my_house/' + customerId + '/toggle_boiler'
      }).then(function(xhr) {
        console.log('Boiler Status Toggled');
      }).catch(function(err) {
        console.error('Error while posting data to server: ', err);
      });
    });

    customerId = getCustomerId();

    document.querySelector('h1 span').textContent = customerId;

    registerWs();
  }

  function onChange(e) {
    var data = JSON.parse(e.data);

    if (data.newTemperature) {
      console.log('New temperature: ', data.newTemperature);

      refreshTemperature(data.newTemperature);
    }
  }

  function refreshTemperature(newTemperature) {
    gaugeData.setCell(0, 0, newTemperature.value);
    gauge.draw(gaugeData, gaugeOptions);

    document.querySelector('time').textContent = newTemperature.timestamp;
  }

  function registerWs() {
    var location = window.location;
    var wsUrl = 'ws://' + location.host + '/' + 'ws_register';
    console.log('WS URL: ', wsUrl);
    wsConnection = new WebSocket(wsUrl);

    wsConnection.onerror = function(e) {
      console.log('Error: ', e);
    }
    wsConnection.onmessage = onChange;

    wsConnection.onopen = function() {
      wsConnection.send(JSON.stringify({
        'customerId': customerId
      }));
    }
  }

  function getCustomerId(args) {
    var location = window.location;
    var customerId = location.pathname.split('/')[2];

    return customerId;
  }

  function Request(options, data) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(options.method, options.url);
      xhr.responseType = 'json';

      xhr.onload = function() {
        resolve(xhr);
      }

      xhr.onerror = reject;

      xhr.send(data);
    });
  }

  console.log('Therm Controller!!!');

  return {
    'init': init
  }
})();
