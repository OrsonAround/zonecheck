'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');

// Timer Lengths - seconds
var cycleTimerLen = 600;
var mistTimerLen = 150;
var fanTimerLen = 150;

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


function pumpCheck() {
  var pumpSwitch = itemRegistry.getItem('Water_Pump_Switch');
  if(pumpSwitch.getState() === OnOffType.ON &&
    itemRegistry.getItem('ClimateController_Relay1').getState() === OnOffType.OFF &&
    itemRegistry.getItem('ClimateController_Relay2').getState() === OnOffType.OFF &&
    itemRegistry.getItem('ClimateController_Relay9').getState() === OnOffType.OFF &&
    itemRegistry.getItem('ClimateController_Relay10').getState() === OnOffType.OFF) {
      events.sendCommand(pumpSwitch, OnOffType.OFF);
      logger.info("Turning off Water Pump.");
  }
}

// Doesn't fire reliably at the end of mistTimer so run it everytime. 
pumpCheck();

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
  
  var pumpSwitch = itemRegistry.getItem('Water_Pump_Switch');
    
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
    if (!zone.cycleTimer && !zone.mistTimer && !zone.fanTimer) {
      logger.info('Starting Humidity Cycle.');
     // If the Pump Switch is OFF, turn it ON
      if (pumpSwitch.getState() === OnOffType.OFF) {
        logger.info("Turning on pump switch");
        events.sendCommand(pumpSwitch, 'ON');
      } else {
        logger.info("Pump switch already on");
      }      
      if (zone.relay.getState() === OnOffType.OFF) {
       
        events.sendCommand(zone.relay, 'ON');
        logger.info('Turning on Relay.');
      }      
      // Create cycle timer to prevent running humidity cycle more than once in a specified time period
      zone.cycleTimer = ScriptExecution.createTimer(
        ZonedDateTime.now().plusSeconds(cycleTimerLen),
        function () {
          zone.cycleTimer = null;
          logger.info("Humidity cycle has ended for Zone " + zone.zoneName);
        }
      );
      // Create mist timer - run mister, then turn on fans and start fanTimer
      zone.mistTimer = ScriptExecution.createTimer(
        ZonedDateTime.now().plusSeconds(mistTimerLen),
        function () {
          logger.info("Mist cycle has ended for Zone" + zone.zoneName + ". Turning on fans.");
          events.sendCommand(zone.relay, 'OFF');
          events.sendCommand(zone.fans, 'ON');
          // See if any other relays are ON if not shut OFF pump
          pumpCheck();
          zone.mistTimer = null;
          // Create fan timer when mist timer expires - run fans for 5 minutes, then turn them off
          zone.fanTimer = ScriptExecution.createTimer(
            ZonedDateTime.now().plusSeconds(fanTimerLen),
            function () {
              logger.info("Fan cycle has ended for Zone " + zone.zoneName);
              events.sendCommand(zone.fans, 'OFF');
              zone.fanTimer = null;
            }
          );
        }
      );
    } else {
      logger.info('Low Humidity, but cycle is already running or has ran in the past ' + cycleTimerLen + ' seconds');
    }
  } else if (zone.currentHumid > zone.desiredHumid) {
    if (zone.relay.getState() === OnOffType.ON) {
      events.sendCommand(zone.relay, 'OFF');
    }
  } else {
    logger.info('Humidtiy in range.');
  }