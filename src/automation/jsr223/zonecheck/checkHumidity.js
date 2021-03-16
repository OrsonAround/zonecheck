/* global Java,OnOffType,events */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'com.adam.zoneCheck.checkHumidity  懲'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');

function needsCycle(zone) {
  return (
    !zone.cycleTimer && !zone.mistTimer && !zone.delayFanTimer && !zone.fanTimer
  );
}

function attach(context) {
  context.createCycleTimer = function createCycleTimer(zone) {
    zone.cycleTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(zone.cycleTime),
      function onTimeout() {
        zone.cycleTimer = null;
        logger.info(
          '* * * * *      Zone ' + zone.zoneName + '       * * * * *'
        );
        logger.info('Humidity cycle has ended for Zone ' + zone.zoneName);
      }
    );
  };

  context.createFanTimer = function createFanTimer(zone) {
    zone.fanTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(zone.fanTime),
      function onTimeout() {
        zone.fanTimer = null;
        events.sendCommand(zone.zoneName + '_FanSwitch', OnOffType.OFF);
        logger.info(
          '* * * * *      Zone ' + zone.zoneName + '       * * * * *'
        );
        logger.info('Fan cycle has ended for Zone ' + zone.zoneName);
      }
    );
  };

  context.createDelayFanTimer = function createDelayFanTimer(zone) {
    zone.delayFanTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(zone.fanDelayTime),
      function onTimeout() {
        zone.delayFanTimer = null;
        logger.info(
          '* * * * *      Zone ' + zone.zoneName + '       * * * * *'
        );
        logger.info('Turning on fans.');
        events.sendCommand(zone.zoneName + '_FanSwitch', OnOffType.ON);
        // Create a fan timer, turn off fans when it expires
        context.createFanTimer(zone);
      }
    );
  };

  context.createMistTimer = function createMistTimer(zone) {
    zone.mistTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(zone.mistTime),
      function onTimeout() {
        zone.mistTimer = null;
        events.sendCommand(zone.zoneName + '_Relay', OnOffType.OFF);
        logger.info(
          '* * * * *      Zone ' + zone.zoneName + '       * * * * *'
        );
        logger.info(
          'Mist cycle has ended for Zone'
            + zone.zoneName
            + '. Turning on fans in .'
            + zone.fanDelayTime
            + ' seconds.'
        );
        // Create a delay timer, when it expires turn on the fans
        context.createDelayFanTimer(zone);
      }
    );
  };

  context.onHumidityTooLow = function onHumidityTooLow(zone) {
    if (needsCycle(zone)) {
      logger.info('Starting Humidity Cycle.');

      logger.info('Water Pump: ' + zone.waterPump);
      logger.info('Turning on pump switch.');
      logger.info('Relay: ' + zone.realy);
      logger.info('Turning on Relay.');
      events.sendCommand(zone.zoneName + '_Relay', OnOffType.ON);
      events.sendCommand('ZALL_WaterPump', OnOffType.ON);

      // If fans are running for cooling, stop them and cancel that timer
      if (zone.coolFansTimer) {
        zone.coolFansTimer.cancel();
        zone.coolFansTimer = null;
        events.sendCommand(zone.zoneName + '_FanSwitch', OnOffType.OFF);
        logger.info('Cooling fans turned OFF.');
      }

      context.createCycleTimer(zone);
      context.createMistTimer(zone);
    } else {
      logger.info(
        'Low Humidity, but cycle is already running or has ran in the past '
          + zone.cycleTime
          + ' seconds'
      );
    }
  };

  context.checkHumidity = function checkHumidity(zone) {
    logger.info(
      'Humidity: ' + zone.humidity + ' % (' + zone.desiredHumid + ' %)'
    );

    logger.info('Dew Point: ' + zone.dewPoint + ' °F');

    if (zone.humidity < zone.desiredHumid) {
      logger.info('Humidity too low.');
      context.onHumidityTooLow(zone);
    } else if (zone.humidity > zone.desiredHumid) {
      if (zone.relay) {
        logger.info('Turning off Relay (' + zone.zoneName + ')');
        events.sendCommand(zone.zoneName + '_Relay', OnOffType.OFF);
      }
    } else {
      logger.info('Humidtiy in range.');
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
