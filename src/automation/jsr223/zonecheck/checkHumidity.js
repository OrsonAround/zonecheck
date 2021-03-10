/* global Java,itemRegistry,OnOffType,events */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');

// Timer Lengths - seconds
var cycleTimeLen = 600; // TODO: Should this be a per zone setting exposed in OpenHab,
var mistTimeLen = 150; // One species might require more/less water -- or just rely on humidity
var fanDelayTimeLen = 60;
var fanTimeLen = 150;

function attach(context) {
  context.checkHumidity = function checkHumidity(zone) {
    var pumpSwitch = context.getPump();

    zone.currentHumid = itemRegistry
      .getItem('ClimateSHT10Array_HumidityZone' + zone.zoneName)
      .getState();
    logger.info(
      'Current Humidity: '
        + zone.currentHumid
        + ' Desired Humidty: '
        + zone.desiredHumid
    );
    if (zone.currentHumid < zone.desiredHumid) {
      if (
        !zone.cycleTimer
        && !zone.mistTimer
        && !zone.delayFanTimer
        && !zone.fanTimer
      ) {
        logger.info('Starting Humidity Cycle.');
        // If fans are running for cooling, stop them and cancel that timer
        if (zone.coolFansTimer) {
          zone.coolFansTimer = null; // Does this actually kill the timer?
          events.sendCommand(zone.fans, OnOffType.OFF);
        }
        // If the Pump Switch is OFF, turn it ON
        if (pumpSwitch.getState() === OnOffType.OFF) {
          logger.info('Turning on pump switch.');
          events.sendCommand(pumpSwitch, OnOffType.ON);
        } else {
          logger.info('Pump switch already on.');
        }
        if (zone.relay.getState() === OnOffType.OFF) {
          events.sendCommand(zone.relay, OnOffType.ON);
          logger.info('Turning on Relay.');
        }
        // Create cycle timer to prevent running humidity cycle more than
        // once in a specified time period
        zone.cycleTimer = ScriptExecution.createTimer(
          ZonedDateTime.now().plusSeconds(cycleTimeLen),
          function removeCycleTimer() {
            zone.cycleTimer = null;
            logger.info('Humidity cycle has ended for Zone ' + zone.zoneName);
          }
        );
        // Create mist timer - run mister cycle for specified time,
        // turn off mister and create a fan delay timer
        zone.mistTimer = ScriptExecution.createTimer(
          ZonedDateTime.now().plusSeconds(mistTimeLen),
          function removeMistTimer() {
            zone.mistTimer = null;
            events.sendCommand(zone.relay, OnOffType.OFF);
            context.pumpCheck(); // TODO this doesn't always work, add few seconds delay?
            logger.info(
              'Mist cycle has ended for Zone'
                + zone.zoneName
                + '. Turning on fans.'
            );
            // Create a delay timer, when it expires turn on the fans
            zone.delayFanTimer = ScriptExecution.createTimer(
              ZonedDateTime.now().plusSeconds(fanDelayTimeLen),
              function removeFanTimer() {
                zone.delayFanTimer = null;
                events.sendCommand(zone.fans, OnOffType.ON);
                // Create a fan timer, turn off fans when it expires
                zone.fanTimer = ScriptExecution.createTimer(
                  ZonedDateTime.now().plusSeconds(fanTimeLen),
                  function afterFansOn() {
                    zone.fanTimer = null;
                    events.sendCommand(zone.fans, OnOffType.OFF);
                    logger.info(
                      'Fan cycle has ended for Zone ' + zone.zoneName
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        logger.info(
          'Low Humidity, but cycle is already running or has ran in the past '
            + cycleTimeLen
            + ' seconds'
        );
      }
    } else if (zone.currentHumid > zone.desiredHumid) {
      if (zone.relay.getState() === OnOffType.ON) {
        events.sendCommand(zone.relay, OnOffType.OFF);
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
