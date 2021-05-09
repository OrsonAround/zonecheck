(function (context) {
  'use strict';

  context.canHumidify = function canHumidify(zone) {
    var zoneName = zone.getName();
    return (
      ir.getItem(zoneName + '_HumidifierEnabled').getState() // TODO Other Checks? Water pump online?
    );
  };

  context.checkHumidity = function checkHumidity(zone) {
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

  context.humidify = function humidifyZone(zone) {
    if (context.canHumidify(zone)) {
      logger.info('Starting Humidity Cycle.');
      var zoneName = zone.getName();
      if (zoneName !== 'ZA') {
        var atomizer = ir.getItem(zoneName + '_HumidifierAtomizer');
        var fan = ir.getItem(zoneName + "_HumidifierFan")
        if(atomizer.getState() === OnOffType.OFF || atomizer.getState() === UNDEF || atomizer.getState() == 'NULL') {
          logger.info(
            'Turning on {}.',
            atomizer.getLabel()
          );
          events.sendCommand(atomizer.getName(), OnOffType.ON);
        }

        if(fan.getState() === OnOffType.OFF || fan.getState() === UNDEF) {
          logger.info(
            'Turning on {}.',
            fan.getLabel()
          );
          events.sendCommand(fan.getName(), OnOffType.ON);
        }
      }
      logger.info('Humidifer Atomizer: {}', atomizer.getState());
      logger.info('Humidifer Fan: {}', fan.getState());
    } else {
      logger.info('Humidity cycle is already running or disabled.'); //TODO
    }
  };
  
  context.dehumidify = function dehumidifyZone(zone) {    
    context.getZoneItems(zone).forEach(function each(item) {
      if (
        item.getTags().contains('Dehumidification') &&
        item.getType() === 'Switch' &&
        item.getState() === OnOffType.OFF
      ) {
        events.sendCommand(item.getName(), OnOffType.ON);
      }
      if (
        item.getTags().contains('Humidification') &&
        item.getType() === 'Switch' &&
        item.getState() === OnOffType.ON
      ) {
        events.sendCommand(item.getName(), OnOffType.OFF);
      }
    });    
  };

  context.stopHumidity = function stopHumidity(zone) {
    logger.debug('stopZone');
    context.getZoneItems(zone).forEach(function each(item) {
      if (
        (item.getType() === 'Switch' &&
          item.getTags().contains('Humidification')) ||
        item.getTags().contains('Dehumidification')
      ) {
        logger.debug(
          'stopZone turing ON {} ({})',
          item.getLabel(),
          item.getName()
        );
        events.sendCommand(item.getName(), OnOffType.ON);
      }
    });
  };

  // Run every 12 hours
  context.autoDecreaseHumidity = function autoDecreaseHumidity(zone) {
    var startDate; // Items or Metadata?
    var endDate;
    var startHumidity;
    var endHumidity;
  };
})(this);
