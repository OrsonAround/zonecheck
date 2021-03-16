/* global Java,itemRegistry,OnOffType,events */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'com.adam.zoneCheck.checkTemp      '
);

/*
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');
*/

function attach(context) {
  context.checkTemp = function checkTemp(zone) {
    var bufferedTemp = zone.desiredTemp + 0.5;

    logger.info(
      'Temperature: ' + zone.temperature + ' °F (' + zone.desiredTemp + ' °F)'
    );
    logger.info(
      'EnviroPlus Temperature: '
        + itemRegistry.getItem('EnviroPlus_Temperature').getState()
        + ' °F'
    );
    logger.info('Space Heater: ' + zone.spaceHeater);

    if (zone.temperature < zone.desiredTemp) {
      logger.info('Temperature too low.');
      if (zone.zoneName === 'ZE') {
        logger.info('Turning on Space Heater.');
        events.sendCommand('ZALL_SpaceHeater', OnOffType.ON);
      }
    } else if (zone.temperature > bufferedTemp) {
      logger.info('Temperature too high.');
      // Turn on fans then turn off using a different fan timer
      /*
      events.sendCommand(zone.fans, OnOffType.ON);
      zone.coolFansTimer = ScriptExecution.createTimer(
        ZonedDateTime.now().plusSeconds(coolFansTimeLen),
        function () {
          zone.coolFansTimer = null;
          events.sendCommand(zone.fans, OnOffType.OFF);
        }
      );
      */
      if (zone.zoneName === 'ZE') {
        logger.info('Turing off Space Heater.');
        events.sendCommand('ZALL_SpaceHeater', OnOffType.OFF);
      }
    } else {
      logger.info('Temperature in range.');
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
