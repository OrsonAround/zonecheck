(function (context) {
  'use strict';

  context.checkTemp = function checkTemp(zone) {
    var zoneName = zone.getName();
    var currentTemp = ir.getItem(zoneName + '_Temperature').getState();
    var targetTemp = ir.getItem(zoneName + '_TargetTemp').getState();
    var bufferedTemp = parseInt(targetTemp) + +0.5;
    logger.info('Temperature: {} ({})', currentTemp, targetTemp);
    if (currentTemp > bufferedTemp) {
      logger.info('Temperature too high.');
      if (zoneName !== 'ZA' || (zoneName === 'ZA' && areZoneTempsInRange)) {
        coolZone(zone);
      }
    } else if (currentTemp < bufferedTemp) {
      logger.info('Temperature too low.');
      if (zoneName !== 'ZA' || (zoneName === 'ZA' && areZoneTempsInRange)) {
        heatZone(zone);
      }
    } else {
      logger.info('Temperature in range.');
      stopZone(zone);
    }
  };

  context.stopZone = function stopZone(zone) {
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

  context.heatZone = function heatZone(zone) {
    logger.debug('heatZone');
    context.getZoneItems(zone).forEach(function each(item) {
      if (item.getTags().contains('Heating') && item.getType() === 'Switch') {
        events.sendCommand(item.getName(), OnOffType.ON);
      }
      if (item.getTags().contains('Cooling') && item.getType() === 'Switch') {
        events.sendCommand(item.getName(), OnOffType.OFF);
      }
    });
  };

  context.coolZone = function coolZone(zone) {
    logger.debug('coolZone');
    context.getZoneItems(zone).forEach(function each(item) {
      if (
        item.getTags().contains('Heating') &&
        item.getType() === 'Switch' &&
        item.getState() === OnOffType.ON
      ) {
        events.sendCommand(item.getName(), OnOffType.OFF);
      }
      if (item.getTags().contains('Cooling') && item.getType() === 'Switch') {
        if (item.getTags().contains('Fan') && !context.timers[zone.getName].mistTimer.isActive()) { 
          if (item.getState() === OnOffType.OFF) {
            events.sendCommand(item.getName(), OnOffType.ON);
          }
        }
      }
    });
  };

  context.avgZoneTemps = function avgZonesTemp() {
    var zones = getZones();
    var sum = 0;
    zones.forEach(function each(zone) {
      sum + zone.getState();
    });
    return sum / zones.length;
  };

  context.areZoneTempsInRange = function areZoneTempsInRange() {
    var zones = getZones();
    zones.forEach(function each(zone) {
      var zoneName = zone.getName();
      var temp = ir.getItem(zoneName + '_Temp');
      var maxTemp = ir.getItem(zoneName + '_MaxTemp');
      var minTemp = ir.getItem(zoneName + '_MinTemp');
      return temp < maxTemp && temp > minTemp;
    });
  };
})(this);
