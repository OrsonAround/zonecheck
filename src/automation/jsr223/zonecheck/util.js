/* global Java,itemRegistry,OnOffType,events */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'com.adam.zoneCheck.utils          ﳹ'
);

function attach(context) {
  context.camelize = function camelize(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, function replacer(word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  };

  context.allRelaysAreOff = function allRelaysAreOff() {
    var registery = itemRegistry
      .getItemsByTagAndType('Switch', 'Relay')
      .toArray();
    if (registery.length === 0) {
      throw new Error('no registry items matched');
    }
    return [].every.call(registery, function cb(x) {
      return x.getState() === OnOffType.OFF;
    });
  };

  context.getPump = function getPump() {
    try {
      return itemRegistry.getItem('ZALL_WaterPump');
    } catch (e) {
      logger.error('ZALL_WaterPump not found in registry');
    }
    return undefined;
  };

  context.checkPump = function checkPump() {
    var pumpSwitch = context.getPump();
    if (pumpSwitch.getState() === OnOffType.ON && context.allRelaysAreOff()) {
      events.sendCommand(pumpSwitch, OnOffType.OFF);
    }
  };

  return context;
}

/* istanbul ignore else  */
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
