/* global Java,itemRegistry,OnOffType,events,load */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var Things = Java.type('org.openhab.core.model.script.actions.Things');
var CONF_DIR = Java.type('java.lang.System').getenv('OPENHAB_CONF');

function attach(context) {
  context.WATER_PUMP_SWITCH = 'Water_Pump_Switch';
  context.CLIMATE_CONTROLLER_RELAY_1 = 'Climate_Controller_Relay1';
  context.CLIMATE_CONTROLLER_RELAY_2 = 'Climate_Controller_Relay2';
  context.CLIMATE_CONTROLLER_RELAY_9 = 'Climate_Controller_Relay9';
  context.CLIMATE_CONTROLLER_RELAY_10 = 'Climate_Controller_Relay10';

  context.check = function check(zone) {
    // Make sure SHT10 array & Relays are actually online -- zigbee switches too?
    // TODO Test that MQTT's LWT is actually working FOR BOTH DEVICES and ALL CHANNELS
    var sht10Status = Things.getThingStatusInfo(
      'mqtt:topic:49a597ce3e:1cc6ab4e6e'
    );
    var widgetLords = Things.getThingStatusInfo(
      'mqtt:topic:49a597ce3e:23f859d9dc'
    );

    if (sht10Status === 'OFFLINE') {
      logger.info('SHT10 Array is OFFLINE');
      return;
    }

    if (widgetLords === 'OFFLINE') {
      logger.info('Widget Lords Relays OFFLINE');
      return;
    }

    zone.fans = itemRegistry.getItem('Zone' + zone.zoneName + 'Fans_Switch');
    zone.relay = itemRegistry.getItem(zone.relayName);

    logger.info('* * * Zone ' + zone.zoneName + ' * * *');
    context.checkHumidity(zone);
    context.checkHumidity(zone);
  };

  context.runCycle = function runCycle(global) {
    /* eslint-disable vars-on-top */
    global.zones = []; // reset

    global.zoneA = global.zoneA || {
      zoneName: 'A',
      relayName: 'Climate_Controller_Relay1',
      desiredTemp: 75, // Need to get this from openhab item in the future
      desiredHumid: 90
    };
    global.zones.push(global.zoneA);

    global.zoneB = global.zoneB || {
      zoneName: 'B',
      relayName: 'Climate_Controller_Relay2',
      desiredTemp: 75,
      desiredHumid: 90
    };
    global.zones.push(global.zoneB);

    global.zoneC = global.zoneC || {
      zoneName: 'C',
      relayName: 'Climate_Controller_Relay9',
      desiredTemp: 75,
      desiredHumid: 90
    };
    global.zones.push(global.zoneC);

    global.zoneD = global.zoneD || {
      zoneName: 'D',
      relayName: 'Climate_Controller_Relay10',
      desiredTemp: 75,
      desiredHumid: 90
    };
    global.zones.push(global.zoneD);

    var ii = global.zones.length;
    var zone;
    var enabled;

    for (var i = 0; i < ii; i += 1) {
      zone = global.zones[i];
      enabled = itemRegistry.getItem(zone.relayName).getState() === OnOffType.ON;
      if (enabled) {
        context.check(zone);
      }
    }

    // Doesn't fire reliably at the end of mistTimer so run it everytime.
    context.pumpCheck(global);
    /* eslint-enable vars-on-top */
  };
  return context;
}

(function main(global) {
  // runCycle(global);
  // Doesn't fire reliably at the end of mistTimer so run it everytime.
  // pumpCheck(global);
}(this));

/* istanbul ignore else  */
if (typeof module === 'object' && typeof module.exports === 'object') {
  /* eslint-disable vars-on-top,global-require */
  var attachHumidity = require('./checkHumidity').attach;
  var attachTemp = require('./checkTemp').attach;
  module.exports = {
    attach: function attachIndex(x) {
      attach(x);
      attachHumidity(x);
      attachTemp(x);
      return x;
    }
  };
  /* eslint-enable vars-on-top,global-require */
} else {
  var context = this; // eslint-disable-line vars-on-top
  context.com = context.com || {};
  context.com.adam = context.com.adam || {};
  context.com.adam.zoneCheck = context.com.adam.zoneCheck || {};
  attach(context.com.adam.zoneCheck);
  load(CONF_DIR + '/automation/jsr223/zonecheck/util.js');
  load(CONF_DIR + '/automation/jsr223/zonecheck/checkHumidity.js');
  load(CONF_DIR + '/automation/jsr223/zonecheck/checkTemp.js');
}
