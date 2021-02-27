var global = this;

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');

// Timer Lengths - minutes
var cycleTimerLen = 60;
var mistTimerLen = 2;
var fanTimerLen = 5;

global.zoneA = global.zoneA || {
  zoneName: 'A',
  desiredTemp: 75, // Need to get this from openhab item in the future
  desiredHumid: 90,
  currentTemp: itemRegistry
    .getItem('ClimateSHT10Array_TemperatureZoneA')
    .getState(),
  currentHumid: itemRegistry
    .getItem('ClimateSHT10Array_HumidityZoneA')
    .getState(),
  relay: itemRegistry.getItem('ClimateController_Relay1'),
  fans: itemRegistry.getItem('ZoneAFans_Switch'),
};

global.zoneB = global.zoneB || {
  zoneName: 'B',
  desiredTemp: 75,
  desiredHumid: 90,
  currentTemp: itemRegistry
    .getItem('ClimateSHT10Array_TemperatureZoneB')
    .getState(),
  currentHumid: itemRegistry
    .getItem('ClimateSHT10Array_HumidityZoneB')
    .getState(),
  relay: itemRegistry.getItem('ClimateController_Relay2'),
  fans: itemRegistry.getItem('ZoneBFans_Switch'),
};

global.zoneC = global.zoneC || {
  zoneName: 'C',
  desiredTemp: 75,
  desiredHumid: 90,
  currentTemp: itemRegistry
    .getItem('ClimateSHT10Array_TemperatureZoneC')
    .getState(),
  currentHumid: itemRegistry
    .getItem('ClimateSHT10Array_HumidityZoneC')
    .getState(),
  relay: itemRegistry.getItem('ClimateController_Relay9'),
  fans: itemRegistry.getItem('ZoneCFans_Switch'),
};

global.zoneD = global.zoneD || {
  zoneName: 'D',
  desiredTemp: 75,
  desiredHumid: 90,
  currentTemp: itemRegistry
    .getItem('ClimateSHT10Array_TemperatureZoneD')
    .getState(),
  currentHumid: itemRegistry
    .getItem('ClimateSHT10Array_HumidityZoneD')
    .getState(),
  relay: itemRegistry.getItem('ClimateController_Relay10'),
  fans: itemRegistry.getItem('ZoneDFans_Switch'),
};

// Run zoneCheck() for enabled zones
var enabledA =
  itemRegistry.getItem('ClimateSHT10Array_ZoneA').getState() === 'ON';
if (enabledA) {
  zoneCheck(global.zoneA);
}

var enabledB =
  itemRegistry.getItem('ClimateSHT10Array_ZoneB').getState() === 'ON';
if (enabledB) {
  zoneCheck(global.zoneB);
}

var enabledC =
  itemRegistry.getItem('ClimateSHT10Array_ZoneC').getState() === 'ON';
if (enabledC) {
  zoneCheck(global.zoneC);
}

var enabledD =
  itemRegistry.getItem('ClimateSHT10Array_ZoneD').getState() === 'ON';
if (enabledD) {
  zoneCheck(global.zoneD);
}

// Check state of relays, if none are ON turn OFF pump
// TODO: Make sure QOS is 2 on all these MQTT topics
var pumpSwitch = itemRegistry.getItem('Water_Pump_Switch');
if (
  pumpSwitch.getState() === 'ON' &&
  global.zoneA.relay === 'OFF' &&
  global.zoneB.relay === 'OFF' &&
  global.zoneC.relay === 'OFF' &&
  global.zoneD.relay === 'OFF'
) {
  events.sendCommand(pumpSwitch, 'OFF');
}

function zoneCheck(zone) {
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
      if (!zone.mistTimer && !zone.fanTimerr) {
        logger.info('Starting Humidity Cycle.');
        if (zone.relay.getState() === 'OFF') {
          // If the Pump Switch is OFF, turn it ON
          if (pumpSwitch.getState() === 'OFF') {
            events.sendCommand(pumpSwitch, 'ON');
          }
          events.sendCommand(zone.relay, 'ON');
          logger.info('turning on');
        }
        // Create cycle timer to prevent running humidity cycle more than once per hour
        zone.cycleTimer = ScriptExecution.createTimer(
          ZonedDateTime.now().plusMinutes(cycleTimerLen),
          function () {
            global.zone.cycleTimer = null;
          }
        );
        // Create mist timer - run mister for two minutes, then turn on fans and start fan timer
        zone.mistTimer = ScriptExecution.createTimer(
          ZonedDateTime.now().plusMinutes(mistTimerLen),
          function () {
            events.sendCommand(zone.relay, 'OFF');
            events.sendCommand(zone.fans, 'ON');
            global.zone.mistTimer = null;
            // Create fan timer when mist timer expires - run fans for 5 minutes, then turn them off
            zone.fanTimer = ScriptExecution.createTimer(
              ZonedDateTime.now().plusMinutes(fanTimerLen),
              function () {
                events.sendCommand(zone['fans'], 'OFF');
                global.zone.fanTimer = null;
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
    if (zone.relay.getState() === 'ON') {
      events.sendCommand(zone.relay, 'OFF');
    }
  } else {
    logger.info('Humidtiy in range.');
  }
}

module.exports = {
  zoneCheck,
};
