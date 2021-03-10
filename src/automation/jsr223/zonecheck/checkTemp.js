/* global itemRegistry,Java,ZonedDateTime */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');

function attach(context) {
  context.checkTemp = function checkHumidity(zone) {
    zone.currentTemp = itemRegistry
      .getItem('ClimateSHT10Array_TemperatureZone' + zone.zoneName)
      .getState();

    logger.info(
      'Current Temperature: '
        + zone.currentTemp
        + ' Desired Temperature: '
        + zone.desiredTemp
    );
    // Temperature
    // What about Zone E - Average with EnviroPlus readings?
    // TODO Turn on fans when temperature is too high / mister isn't on and humiditiy is in range
    if (zone.currentTemp < zone.desiredTemp) {
      logger.info(
        'Temperature too low. TODO: Integrate with Space Heater Script to adjust temperature.'
      );
    } else if (zone.currentTemp > zone.desiredTemp) {
      logger.info('Temperature too high.');
      // Turn on fans then turn off using a different fan timer
      // events.sendCommand(zone.fans, OnOffType.ON);
      // zone.coolFansTimer = ScriptExecution.createTimer(
      //  ZonedDateTime.now().plusSeconds(coolFansTimeLen),
      //  function() {
      //    zone.coolFansTimer = null;
      //    events.sendCommand(zone.fans, OnOffType.OFF);
      //  }
      // );
    } else {
      logger.info('Temperature in range.');
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
