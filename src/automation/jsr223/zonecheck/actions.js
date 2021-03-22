(function (context) {
  'use strict';

  context.runCycle = function runCycle() {
    context.startup(); // load & return zones?
    var zones = context.getZones();
    logger.info('* * * * *   Zone Check    * * * * *            ');
    logger.info('Found {} enabled zone(s).', zones.length);
    zones.forEach(function each(zone) {
      var zoneName = zone.getName();
      logger.info(zoneBanner, zoneName);
      //context.timers[zoneName] = context.timers[zoneName] || {};
      var timers = context.timers[zoneName];
      for (var timer in timers) {
        if (timers.hasOwnProperty(timer)) {
          if (timers[timer].isActive()) {
            logger.info(
              '{} has {} seconds remaing.',
              timer,
              context.timeRemaining(timers[timer]).getSeconds()
            );
          } else {
            logger.info('{} has compelted.', timer);
          }
        }
      }
      if (zoneName !== 'ZA' && zoneName !== 'Z5') {
        // TODO Display Enviroment Data before Timers
        context.checkTemp(zone);
        context.checkHumidity(zone);
      }
    });
    checkPump();
  };

  context.needsCycle = function needsCycle(zone) {
    var zoneName = zone.getName();
    return (
      !context.timers[zoneName].cycleTimer ||
      (context.timers[zoneName].cycleTimer.hasTerminated() &&
        ir.getItem(zoneName + '_MistEnabled').getState()) // TODO Other Checks?
    );
  };

  // TODO This does nothing (devices not tagged yet) errors etc
  // Prevent fans from running if misting - or find a way via metadata(?) to
  // prevent a command from running on an item if some other item has a certain state
  // Average all zones and compare with Zone ZA as means to control space heater.
  context.checkTemp = function checkTemp(zone) {
    var zoneName = zone.getName();
    var currentTemp = ir.getItem(zoneName + '_Temperature').getState();
    var targetTemp = ir.getItem(zoneName + '_TargetTemp').getState();
    var bufferedTemp = parseInt(targetTemp) + +0.5;
    logger.info('Temperature: {} ({})', currentTemp, targetTemp);
    if (currentTemp > bufferedTemp) {
      logger.info('Temperature too high.');
      /*
      context.getZoneItems(zoneName).forEach(function each(item) {
        if (item.getTags().contains('Heating') && item.getType() === 'Switch') {
          events.sendCommand(item.getName(), OnOffType.OFF);
        }
        if (item.getTags().contains('Cooling') && item.getType() === 'Switch') {
          events.sendCommand(item.getName(), OnOffType.ON);
        }
      });
      */
    } else if (currentTemp < bufferedTemp) {
      /*
      context.getZoneItems(zoneName).forEach(function each(item) {
        if (item.getTags().contains('Heating') && item.getType() === 'Switch') {
          events.sendCommand(item.getName(), OnOffType.ON);
        }
        if (item.getTags().contains('Cooling') && item.getType() === 'Switch') {
          events.sendCommand(item.getName(), OnOffType.OFF);
        }
      });
      */
    } else {
      logger.info('Temperature in range.');
    }
  };

  context.checkHumidity = function checkHumidity(zone) {
    var zoneName = zone.getName();
    var currentHumid = ir.getItem(zoneName + '_Humidity').getState();
    var dewPoint = ir.getItem(zoneName + '_DewPoint').getState();
    var targetHumid = ir.getItem(zoneName + '_TargetHumid').getState();
    logger.info('Humidity: {} ({})', currentHumid, targetHumid);
    logger.info('Dew Point: {}', dewPoint);
    if (currentHumid < targetHumid) {
      context.onHumidityTooLow(zone);
    } else if (currentHumid > targetHumid) {
      if (zoneName) {
        logger.info('Turning off Relay ({}}', zoneName);
        events.sendCommand(ir.getItem(zoneName + '_Relay'), OnOffType.OFF);
        context.checkPump();
      }
    } else {
      logger.info('Humidity in range.');
    }
  };

  /* TODO - DO NOT USE - until systemCheck() is more robust and well-tested.
  // Relay/Pump function, or some other "paired function" also needed
  // Look at item profiles again as a possible solution.

  context.checkHumidityNoCycle = function checkHumidityNoCycle(zone) {
    var zoneName = zone.getName();
    var currentHumid = ir.getItem(zoneName + '_Humidity').getState();
    var targetHumid = ir.getItem(zoneName + '_TargetHumid').getState();
    var bufferedHumid = parseInt(targetHumid) + +0.5;
    logger.info('Humidity: {} ({})', currentHumid, targetHumid);
    if (currentHumid > bufferedHumid) {
      logger.info('Humidity too high.');
      if (item.getTags().contains('Dehumidification') && item.getType() === 'Switch') {
        events.sendCommand(item.getName(), OnOffType.ON);
      }
      if (item.getTags().contains('Humidification') && item.getType() === 'Switch') {
        events.sendCommand(item.getName(), OnOffType.OFF);
      }
    } else if (currentHumid < bufferedHumid) {
      logger.info('Humidity too low.');
      context.getZoneItems(zoneName).forEach(function each(item) {
        if (item.getTags().contains('Humidification') && item.getType() === 'Switch') {
          events.sendCommand(item.getName(), OnOffType.ON);
        }
        if (item.getTags().contains('Dehumidification') && item.getType() === 'Switch') {
          events.sendCommand(item.getName(), OnOffType.OFF);
        }
      });
    } else {
      logger.info('Humidity in range.');
    }
  };
  */

  // TODO Experiment with 'as needed' misting, regardless of cycleTime(s)? see above function.
  // TODO Implement Mist/FanCycleTime to limit number of cycles for either/or
  // e.g. reshi would have long fan cycle times (to increase co2, decrease humidity), 
  //      shitake shorter cycle times (to decrease co2 or temp).
  context.onHumidityTooLow = function onHumidityTooLow(zone) {
    var zoneName = zone.getName();
    var waterPump = ir.getItem('ZA_WaterPump');
    var relay = ir.getItem(zoneName + '_Relay');
    var fanSwitch = ir.getItem(zoneName + '_FanSwitch');
    if (context.needsCycle(zone)) {
      logger.info('Starting Humidity Cycle.');
      // Get water pump dynamically
      logger.info('Fans: {}', fanSwitch.getState());
      logger.info('Water Pump: {}', waterPump.getState());
      logger.info('Relay: {}', relay.getState());
      // If fans are running for cooling, stop them and cancel that timer
      events.sendCommand(relay.getName(), OnOffType.ON);
      events.sendCommand(waterPump.getName(), OnOffType.ON);
      context.createCycleTimer(zone);
      context.createMistTimer(zone);
    } else {
      logger.info('Humidity cycle is disabled or has already run recently.');
    }
  };

  context.createCycleTimer = function createCycleTimer(zone) {
    context.timers[zone.getName()].cycleTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_CycleTime').getState()
      ),
      function onTimeout() {
        context.timers[zone.getName()].cycleTimer.cancel();
        logger.info(zoneBanner, zone.getName());
        logger.info('Humidity cycle has ended for Zone {}', zone.getName());
      }
    );
  };

  context.createMistCycleTimer = function createMistCycleTimer(zone) {
    context.timers[zone.getName()].mistCycleTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_MistTime').getState()
      ),
      function onTimeout() {
        context.zoneTimers[zone.getName()].mistCycleTimer.cancel();
        logger.info(zoneBanner, zone.getName());
        logger.info('Mist cycle has ended for Zone {}', zone.getName());
      }
    );
  };

  context.createMistTimer = function createMistTimer(zone) {
    context.timers[zone.getName()].mistTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_MistTime').getState()
      ),
      function onTimeout() {
        context.timers[zone.getName()].mistTimer.cancel();
        var zoneName = zone.getName();
        events.sendCommand(ir.getItem(zoneName + '_Relay'), OnOffType.OFF);
        logger.info(zoneBanner, zoneName);
        logger.info('Mist cycle has ended for Zone {}.', zoneName);
        logger.info(
          'Turning on fans in {} seconds, for {} seconds.',
          ir.getItem(zoneName + '_FanTime').getState(),
          ir.getItem(zoneName + '_FanDelayTime').getState()
        );
        context.checkPump();
        context.createDelayFanTimer(zone);
      }
    );
  };

  context.createFanCycleTimer = function createFanCycleTimer(zone) {
    context.zoneTimers[
      zone.getName()
    ].fanCycleTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_FanCycleTime')
      ),
      function onTimeout() {
        context.zoneTimers[zone.getName()].fanCycleTimer.cancel();
        logger.info(zoneBanner, zone.getName());
        logger.info('Fan cycle has ended for Zone {}', zone.getName());
      }
    );
  };

  context.createFanTimer = function createFanTimer(zone) {
    context.timers[zone.getName()].fanTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(ir.getItem(zone.getName() + '_FanTime')),
      function onTimeout() {
        context.timers[zone.getName()].fanTimer.cancel();
        events.sendCommand(
          ir.getItem(zone.getName() + '_FanSwitch'),
          OnOffType.OFF
        );
        logger.info(zoneBanner, zone.getName());
        logger.info('Fan cycle has ended for Zone {}', zone.getName());
      }
    );
  };

  context.createDelayFanTimer = function createDelayFanTimer(zone) {
    context.timers[zone.getName()].delayFanTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_FanDelayTime')
      ),
      function onTimeout() {
        context.timers[zone.getName()].delayFanTimer.cancel();
        logger.info(zoneBanner, zone.getName());
        logger.info('Turning on fans.');
        events.sendCommand(
          ir.getItem(zone.getName() + '_FanSwitch'),
          OnOffType.ON
        );
        // Create a fan timer, turn off fans when it expires
        context.createFanTimer(zone);
      }
    );
  };
})(this);
