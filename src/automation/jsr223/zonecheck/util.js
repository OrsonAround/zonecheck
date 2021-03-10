/* global Java,itemRegistry,OnOffType,events */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);

function attach(context) {
  context.allRelaysAreOff = function allRelaysAreOff() {
    var registery = itemRegistry.getItems().toArray();
    var item;
    var i;
    var ii = registery.length;
    var off;
    for (i = 0; i < ii; i += 1) {
      item = registery[i];
      if (item.getName().match(/Climate_Controller_Relay/gi)) {
        off = item.getState() === OnOffType.OFF;
        if (!off) {
          return false;
        }
      }
    }
    return true;
  };

  context.getPump = function getPump() {
    try {
      return itemRegistry.getItem(context.WATER_PUMP_SWITCH);
    } catch (e) {
      logger.error(context.WATER_PUMP_SWITCH + ' not found in registry');
    }
    return undefined;
  };

  context.pumpCheck = function pumpCheck() {
    var pumpSwitch = context.getPump();
    if (pumpSwitch.getState() === OnOffType.ON && context.allRelaysAreOff()) {
      events.sendCommand(pumpSwitch, OnOffType.OFF);
      logger.info('Turning off Water Pump.');
    }
  };

  return context;
}

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = {
    attach: attach
  };
} else {
  var context = this; // eslint-disable-line vars-on-top
  context.com = context.com || {};
  context.com.adam = context.com.adam || {};
  context.com.adam.zoneCheck = context.com.adam.zoneCheck || {};
  attach(context.com.adam.zoneCheck);
}
