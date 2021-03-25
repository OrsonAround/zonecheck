(function (context) {
  'use strict';

  context.checkHumidity = function checkHumidity(zone) {
    var zoneName = zone.getName();
    var currentHumid = ir.getItem(zoneName + '_Humidity').getState();
    var targetHumid = ir.getItem(zoneName + '_TargetHumid').getState();
    logger.info('Humidity: {} ({})', currentHumid, targetHumid);
    if (currentHumid < targetHumid) {
      context.humidify(zone);
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

  context.checkHumidityNoCycle = function checkHumidityNoCycle(zone) {
    var zoneName = zone.getName();
    var currentHumid = ir.getItem(zoneName + '_Humidity').getState();
    var targetHumid = ir.getItem(zoneName + '_TargetHumid').getState();
    var bufferedHumid = parseInt(targetHumid) + +0.5;
    if (currentHumid !== UNDEF && currentHumid !== null) {
      logger.info('Humidity: {} ({})', currentHumid, targetHumid);
      if (currentHumid > bufferedHumid) {
        logger.info('Humidity too high.');
        dehumidify(zone);
      } else if (currentHumid < bufferedHumid) {
        logger.info('Humidity too low.');
        humidify(zone);
      } else {
        logger.info('Humidity in range.');
        stopHumidity(zone);
      }
    } else {
      logger.warn('Zone {} does not have a vaild humidity.', zoneName);
    }
  };

  context.stopHumidity = function stopHumidity(zone) {
    logger.debug('stopZone');
    context.getZoneItems(zone).forEach(function each(item) {
      if (
        (item.getType() === 'Switch' && item.getTags().contains('Heating')) ||
        item.getTags().contains('Cooling')
      ) {
        events.sendCommand(item.getName(), OnOffType.ON);
      }
    });
  };

  context.humidify = function humidifyZone(zone) {
    if (context.needsCycle(zone)) {
      logger.info('Starting Humidity Cycle.');
      var zoneName = zone.getName();
      var cycleTimer = context.timers[zoneName].cycleTimer;
      // Get water pump dynamically
      // If fans are running for cooling, stop them and cancel that timer
      if (zoneName !== 'ZA') {
        var relay = ir.getItem(zoneName + '_Relay');
        var waterPump = ir.getItem('ZA_WaterPump');
        events.sendCommand(relay.getName(), OnOffType.ON);
        events.sendCommand(waterPump.getName(), OnOffType.ON);
        context.createCycleTimer(zone);
        context.createMistTimer(zone);
      }
    } else {
      logger.info('Humidity cycle is already running or disabled'); //TODO
    }
    /*
    var zoneName = zone.getName();
    context.getZoneItems(zoneName).forEach(function each(item) {
      if (
        item.getTags().contains('Dehumidification') &&
        item.getType() === 'Switch'
      ) {
        events.sendCommand(item.getName(), OnOffType.OFF);
      }
      if (
        item.getTags().contains('Humidification') &&
        item.getType() === 'Switch'
      ) {
        events.sendCommand(item.getName(), OnOffType.ON);
      }
    });
    */
  };

  context.dehumidify = function dehumidifyZone(zone) {
    /*
    var zoneName = zone.getName();
    context.getZoneItems(zoneName).forEach(function each(item) {
      if (
        item.getTags().contains('Dehumidification') &&
        item.getType() === 'Switch'
      ) {
        events.sendCommand(item.getName(), OnOffType.ON);
      }
      if (
        item.getTags().contains('Humidification') &&
        item.getType() === 'Switch'
      ) {
        events.sendCommand(item.getName(), OnOffType.OFF);
      }
    });
    */
  };

  // Run every 12 hours
  context.autoDecreaseHumidity = function autoDecreaseHumidity(zone) {
    var startDate; // Items or Metadata?
    var endDate;
    var startHumidity;
    var endHumidity;
  };
})(this);
