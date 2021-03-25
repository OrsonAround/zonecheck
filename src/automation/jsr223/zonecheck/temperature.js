(function (context) {
  'use strict';

  // TODO IMPORTANT Potential flapping if two or more zones are on opposite sides of buffertemp??
  // Perhaps add a 'heatCycle' timer to prevent
  context.checkTemp = function checkTemp(zone) {
    var zoneName = zone.getName();
    var currentTemp = ir.getItem(zoneName + '_Temperature').getState();
    var targetTemp = ir.getItem(zoneName + '_TargetTemp').getState();
    var bufferedTemp = parseInt(targetTemp) + +0.5;
    if (currentTemp !== UNDEF && currentTemp !== null) {
      logger.info('Temperature: {} ({})', currentTemp, targetTemp);
      if (currentTemp > bufferedTemp) {
        logger.info('Temperature too high.');
        if (zoneName !== 'ZA' || (zoneName === 'ZA' && areZoneTempsInRange)) {
          // TODO Check Handling of ZA
          coolZone(zone);
        }
      } else if (currentTemp < bufferedTemp) {
        logger.info('Temperature too low.');
        if (zoneName !== 'ZA' || (zoneName === 'ZA' && areZoneTempsInRange)) {
          heatZone(zone);
        }
      } else {
        logger.info('Temperature in range.');
        stopZoneTemp(zone);
      }
    } else {
      logger.warn('Zone {} does not have a valid temperature.', zoneName);
    }
    context.getZoneItems(zone).forEach(function each(item) {
      if (
        item.getTags().contains('Heating') ||
        item.getTags().contains('Cooling')
      ) {
        logger.info('{}: {}', item.getLabel(), item.getState());
      }
    });
  };

  context.stopZoneTemp = function stopZoneTemp(zone) {
    logger.debug('stopZone');
    context.getZoneItems(zone).forEach(function each(item) {
      if (
        (item.getType() === 'Switch' && item.getTags().contains('Heating')) ||
        item.getTags().contains('Cooling')
      ) {
        logger.info('Turning OFF {}', item.getLabel());
        events.sendCommand(item.getName(), OnOffType.ON);
      }
    });
  };

  context.heatZone = function heatZone(zone) {
    logger.debug('heatZone');
    context.getZoneItems(zone).forEach(function each(item) {
      var itemName = item.getName();
      var itemLabel = item.getLabel();
      var itemType = item.getType();
      var itemState = item.getState();
      //TODO Detect an offline switch? or leave to systemCheck()
      if (
        item.getTags().contains('Heating') &&
        itemType === 'Switch' &&
        itemState === OnOffType.OFF
      ) {
        logger.info('Turning ON {}', itemLabel);
        events.sendCommand(itemName, OnOffType.ON);
      }
      if (
        item.getTags().contains('Cooling') &&
        itemType === 'Switch' &&
        itemState === OnOffType.ON
      ) {
        logger.info('Turning OFF {}', itemLabel);
        events.sendCommand(itemName, OnOffType.OFF);
      }
    });
  };

  context.coolZone = function coolZone(zone) {
    logger.debug('coolZone');
    context.getZoneItems(zone).forEach(function each(item) {
      var itemName = item.getName();
      var itemLabel = item.getLabel();
      var itemState = item.getState();
      if (
        item.getTags().contains('Heating') &&
        item.getType() === 'Switch' &&
        itemState === OnOffType.ON
      ) {
        logger.info('Turning OFF {}', itemLabel);
        events.sendCommand(itemName, OnOffType.OFF);
      }
      if (item.getTags().contains('Cooling') && item.getType() === 'Switch') {
        if (
          item.getTags().contains('Fan') &&
          !context.timers[zone.getName].fanTimer.isActive()
        ) {
          if (itemState === OnOffType.OFF) {
            logger.info('Turning ON {}', itemLabel);
            events.sendCommand(itemName, OnOffType.ON);
          }
        }
      }
    });
  };

  context.avgZoneTemps = function avgZonesTemp() {
    var zones = getZones(true);
    var sum = 0;
    zones.forEach(function each(zone) {
      sum + zone.getState();
    });
    return sum / zones.length;
  };

  context.areZoneTempsInRange = function areZoneTempsInRange() {
    var zones = getZones(true);
    zones.forEach(function each(zone) {
      var zoneName = zone.getName();
      var temp = ir.getItem(zoneName + '_Temp');
      var maxTemp = ir.getItem(zoneName + '_MaxTemp');
      var minTemp = ir.getItem(zoneName + '_MinTemp');
      return temp < maxTemp && temp > minTemp;
    });
  };
})(this);
