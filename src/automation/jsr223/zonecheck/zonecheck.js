/* global Java,itemRegistry,OnOffType,events */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');
var Things = Java.type('org.openhab.core.model.script.actions.Things');

// Timer Lengths - seconds
var cycleTimeLen = 600; // TODO: Should this be a per zone setting exposed in OpenHab,
var mistTimeLen = 150; // One species might require more/less water -- or just rely on humidity
var fanDelayTimeLen = 60;
var fanTimeLen = 150;

var context = this;
context.com = context.com || {};
context.com.adam = context.com.adam || {};
context.com.adam.zoneCheck = context.com.adam.zoneCheck || {};
var zoneCheck = context.com.adam.zoneCheck; // eslint-disable-line vars-on-top

zoneCheck.WATER_PUMP_SWITCH = 'Water_Pump_Switch';
zoneCheck.CLIMATE_CONTROLLER_RELAY_1 = 'Climate_Controller_Relay1';
zoneCheck.CLIMATE_CONTROLLER_RELAY_2 = 'Climate_Controller_Relay2';
zoneCheck.CLIMATE_CONTROLLER_RELAY_9 = 'Climate_Controller_Relay9';
zoneCheck.CLIMATE_CONTROLLER_RELAY_10 = 'Climate_Controller_Relay10';

zoneCheck.allRelaysAreOff = function allRelaysAreOff() {
  var registery = itemRegistry.getItems().toArray();
  var item;
  var i;
  var off;
  for (i = 0; i < registery.length; i += 1) {
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

zoneCheck.getPump = function getPump() {
  try {
    return itemRegistry.getItem(zoneCheck.WATER_PUMP_SWITCH);
  } catch (e) {
    logger.error(zoneCheck.WATER_PUMP_SWITCH + ' not found in registry');
  }
  return undefined;
};

zoneCheck.pumpCheck = function pumpCheck() {
  var pumpSwitch = zoneCheck.getPump();
  if (pumpSwitch.getState() === OnOffType.ON && zoneCheck.allRelaysAreOff()) {
    events.sendCommand(pumpSwitch.getName(), OnOffType.OFF);
    logger.info('Turning off Water Pump.');
  }
};

zoneCheck.check = function check(zone) {
  // Make sure SHT10 array & Relays are actually online -- zigbee switches too?
  // TODO Test that MQTT's LWT is actually working FOR BOTH DEVICES and ALL CHANNELS
  var sht10Status = Things.getThingStatusInfo(
    'mqtt:topic:49a597ce3e:1cc6ab4e6e'
  );
  var widgetLords = Things.getThingStatusInfo(
    'mqtt:topic:49a597ce3e:23f859d9dc'
  );
  var pumpSwitch = zoneCheck.getPump();

  if (sht10Status === 'OFFLINE') {
    logger.info('SHT10 Array is OFFLINE');
    return;
  }

  if (widgetLords === 'OFFLINE') {
    logger.info('Widget Lords Relays OFFLINE');
    return;
  }

  zone.currentTemp = itemRegistry
    .getItem('ClimateSHT10Array_TemperatureZone' + zone.zoneName)
    .getState();
  zone.currentHumid = itemRegistry
    .getItem('ClimateSHT10Array_HumidityZone' + zone.zoneName)
    .getState();
  zone.fans = itemRegistry.getItem('Zone' + zone.zoneName + 'Fans_Switch');
  zone.relay = itemRegistry.getItem(zone.relayName);

  logger.info('* * * Zone ' + zone.zoneName + ' * * *');
  logger.info(
    'Current Temperature: '
      + zone.currentTemp
      + ' Desired Temperature: '
      + zone.desiredTemp
  );
  logger.info(
    'Current Humidity: '
      + zone.currentHumid
      + ' Desired Humidty: '
      + zone.desiredHumid
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
  // Humidity
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
          zoneCheck.pumpCheck(); // TODO this doesn't always work, add few seconds delay?
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
                  logger.info('Fan cycle has ended for Zone ' + zone.zoneName);
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

zoneCheck.runCycle = function runCycle(global) {
  /* eslint-disable vars-on-top */
  global.zones = []; // reset

  global.zoneA = global.zoneA || {
    zoneName: 'A',
    relayName: 'ClimateController_Relay1',
    desiredTemp: 75, // Need to get this from openhab item in the future
    desiredHumid: 90
  };
  global.zones.push(global.zoneA);

  global.zoneB = global.zoneB || {
    zoneName: 'B',
    relayName: 'ClimateController_Relay2',
    desiredTemp: 75,
    desiredHumid: 90
  };
  global.zones.push(global.zoneB);

  global.zoneC = global.zoneC || {
    zoneName: 'C',
    relayName: 'ClimateController_Relay9',
    desiredTemp: 75,
    desiredHumid: 90
  };
  global.zones.push(global.zoneC);

  global.zoneD = global.zoneD || {
    zoneName: 'D',
    relayName: 'ClimateController_Relay10',
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
      zoneCheck.check(zone);
    }
  }

  // Doesn't fire reliably at the end of mistTimer so run it everytime.
  zoneCheck.pumpCheck(global);
  /* eslint-enable vars-on-top */
};
(function main(global) {
  // runCycle(global);
  // Doesn't fire reliably at the end of mistTimer so run it everytime.
  // pumpCheck(global);
}(this));

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = {
    zoneCheck: zoneCheck
  };
}
