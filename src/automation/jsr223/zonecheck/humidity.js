(function (context) {
    'use strict';

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
  // e.g. reshi would have long fan cycle times (less offten to increase co2, decrease humidity), 
  //      shitake shorter cycle times (more often to decrease co2 or temp).
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

  /*
context.humidifyZone = function humidifyZone(zone) {
    var zoneName = zone.getName();
    context.getZoneItems(zoneName).forEach(function each(item) {
      if (item.getTags().contains('Dehumidification') && item.getType() === 'Switch') {
        events.sendCommand(item.getName(), OnOffType.OFF);
      }
      if (item.getTags().contains('Humidification') && item.getType() === 'Switch') {
        events.sendCommand(item.getName(), OnOffType.ON);
      }
    });
  }

  context.dehumidifyZone = function dehumidifyZone(zone) {
    var zoneName = zone.getName();
    context.getZoneItems(zoneName).forEach(function each(item) {
      if (item.getTags().contains('Dehumidification') && item.getType() === 'Switch') {
        events.sendCommand(item.getName(), OnOffType.ON);
      }
      if (item.getTags().contains('Humidification') && item.getType() === 'Switch') {
        events.sendCommand(item.getName(), OnOffType.OFF);
      }
    });
  }  
  */
})(this);