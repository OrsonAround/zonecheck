'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');

// Timer Lengths 
var cycleTimerLen = 2;
var mistTimerLen = 1;
var fanTimerLen = 1;

(function (global) {
  global.zoneA = global.zoneA || {
    zoneName: 'A',
    desiredTemp: 75, // Need to get this from openhab item in the future
    desiredHumid: 90,
  };

  global.zoneB = global.zoneB || {
    zoneName: 'B',
    desiredTemp: 75,
    desiredHumid: 90,
  };

  global.zoneC = global.zoneC || {
    zoneName: 'C',
    desiredTemp: 75,
    desiredHumid: 90,
  };

  global.zoneD = global.zoneD || {
    zoneName: 'D',
    desiredTemp: 75,
    desiredHumid: 90,
  };

  // Run zoneCheck() for enabled zones
  var enabledA =
    itemRegistry.getItem('ClimateSHT10Array_ZoneA').getState() === OnOffType.ON;
  if (enabledA) {
    zoneCheck(global.zoneA);
  }

  var enabledB =
    itemRegistry.getItem('ClimateSHT10Array_ZoneB').getState() === OnOffType.ON;
  if (enabledB) {
    zoneCheck(global.zoneB);
  }

  var enabledC =
    itemRegistry.getItem('ClimateSHT10Array_ZoneC').getState() === OnOffType.ON;
  if (enabledC) {
    zoneCheck(global.zoneC);
  }

  var enabledD =
    itemRegistry.getItem('ClimateSHT10Array_ZoneD').getState() === OnOffType.ON;
  if (enabledD) {
    zoneCheck(global.zoneD);
  }

})(this);

function zoneCheck(zone) {
  
  zone.currentTemp = itemRegistry.getItem('ClimateSHT10Array_TemperatureZone' + zone.zoneName).getState();
  zone.currentHumid = itemRegistry.getItem('ClimateSHT10Array_HumidityZone' + zone.zoneName).getState();
  if(zone.zoneName === 'A') {
    zone.relay = itemRegistry.getItem('ClimateController_Relay1');
  } else if (zone.zoneName === 'B') {
    zone.relay = itemRegistry.getItem('ClimateController_Relay2');
  } else if (zone.zoneName === 'C') {
    zone.relay = itemRegistry.getItem('ClimateController_Relay9');
  } else if (zone.zoneName === 'D') {
    zone.relay = itemRegistry.getItem('ClimateController_Relay10');
  }
  zone.fans = itemRegistry.getItem('Zone' + zone.zoneName + 'Fans_Switch');
  
    
  logger.info('* * * Zone ' + zone.zoneName + ' * * *');
  logger.info(
    'Current Temperature: ' +
      zone.currentTemp +
      ' Desired Temperature: ' +
      zone.desiredTemp
  );
  logger.info(
    'Current Humidity: ' +
      zone.currentHumid +
      ' Desired Humidty: ' +
      zone.desiredHumid
  );

  // Temperature
  // Average temps?
  // TODO Turn on fans when temperature is too high / mister isn't on and humiditiy is in range
  if (zone.currentTemp < zone.desiredTemp) {
    logger.info(
      'Temperature too low. TODO: Integrate with Space Heater Script to adjust temperature.'
    );
  } else if (zone.currentTemp > zone.desiredTemp) {
    logger.info('Temperature too high.');
  } else {
    logger.info('Temperature in range.');
  }

  // Humidity
  if (zone.currentHumid < zone.desiredHumid) {
    logger.info('Humidity too low.');
    // Check to see if cycle timer is running, if so skip this cycle.
    if (!zone.cycleTimer) {
      // See if mistTimer or fanTimer is already running, is so skip this cycle.
      if (!zone.mistTimer && !zone.fanTimer) {
        logger.info('Starting Humidity Cycle.');
        if (zone.relay.getState() === OnOffType.OFF) {
          // If the Pump Switch is OFF, turn it ON
          var pumpSwitch = itemRegistry.getItem('Water_Pump_Switch');
          if (pumpSwitch.getState() === OnOffType.OFF) {
            events.sendCommand(pumpSwitch, 'ON');
          }
          events.sendCommand(zone.relay, 'ON');
          logger.info('turning on');
        }
        // Create cycle timer to prevent running humidity cycle more than once per hour
        zone.cycleTimer = ScriptExecution.createTimer(
          ZonedDateTime.now().plusMinutes(cycleTimerLen),
          function () {
            zone.cycleTimer = null;
          }
        );
        // Create mist timer - run mister for two minutes, then turn on fans and start fan timer
        zone.mistTimer = ScriptExecution.createTimer(
          ZonedDateTime.now().plusMinutes(mistTimerLen),
          function () {
            events.sendCommand(zone.relay, 'OFF');
            events.sendCommand(zone.fans, 'ON');
            // See if any other relays are ON if not shut offer pump
            if(itemRegistry.getItem('ClimateController_Relay1').getState() === OnOffType.OFF &&
               itemRegistry.getItem('ClimateController_Relay2').getState() === OnOffType.OFF &&
               itemRegistry.getItem('ClimateController_Relay9').getState() === OnOffType.OFF &&
               itemRegistry.getItem('ClimateController_Relay10').getState() === OnOffType.OFF) {
              events.SendCommand(itemRegistry.getItem('Water_Pump_Switch'), OnOffType.OFF);
            }
            zone.mistTimer = null;
            // Create fan timer when mist timer expires - run fans for 5 minutes, then turn them off
            zone.fanTimer = ScriptExecution.createTimer(
              ZonedDateTime.now().plusMinutes(fanTimerLen),
              function () {
                events.sendCommand(zone.fans, 'OFF');
                zone.fanTimer = null;
              }
            );
          }
        );
      } else {
        logger.info('Humidity cycle is already running.');
      }
    } else {
      logger.info(
        'Humidity cycle has already ran in the past ' +
          cycleTimerLen +
          ' minutes.'
      );
    }
  } else if (zone.currentHumid > zone.desiredHumid) {
    if (zone.relay.getState() === OnOffType.ON) {
      events.sendCommand(zone.relay, 'OFF');
    }
  } else {
    logger.info('Humidtiy in range.');
  }
}