(function (context) {
  'use strict';

  context.canHumidify = function canHumidify(zone) {
    var zoneName = zone.getName();
    return (
      ir.getItem(zoneName + '_MistEnabled').getState() &&
      (!context.timers[zoneName].mistCycleTimer ||
      context.timers[zoneName].mistCycleTimer.hasTerminated()) // TODO Other Checks? Water pump online?
    );
  };

  context.checkHumidity = function checkHumidity(zone) {
    var zoneName = zone.getName();
    var currentHumid = ir.getItem(zoneName + '_Humidity').getState();
    var targetHumid = ir.getItem(zoneName + '_TargetHumid').getState();
    var relay = ir.getItem(zoneName + '_Relay');
    logger.info('Humidity: {} ({})', currentHumid, targetHumid);
    if (currentHumid < targetHumid) {
      context.humidify(zone);
    } else if (currentHumid > targetHumid && relay.getState === OnOffType.ON) {
      if (zoneName) {
        ///???what
        logger.info('Turning off Relay ({}}', zoneName);
        events.sendCommand(relay.getName(), OnOffType.OFF);
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

  // Length of time between misting.
  context.createMistCycleTimer = function createMistCycleTimer(zone) {
    context.timers[zone.getName()].mistCycleTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_MistCycleTime').getState()
      ),
      function onTimeout() {
        context.timers[zone.getName()].mistCycleTimer.cancel();
        context.timers[zone.getName()].mistCycleTimer = null;
        logger.info(zoneBanner, zone.getName());
        logger.info('Mist cycle has ended for Zone {}', zone.getName());
      }
    );
  };

  context.humidify = function humidifyZone(zone) {
    if (context.canHumidify(zone)) {
      logger.info('Starting Humidity Cycle.');
      var zoneName = zone.getName();
      if (zoneName !== 'ZA') {
        var relay = ir.getItem(zoneName + '_Relay');
        var waterPump = ir.getItem('ZA_WaterPump');
        logger.info(
          'Turning on {} and {}.',
          relay.getLabel(),
          waterPump.getLabel()
        );
        events.sendCommand(relay.getName(), OnOffType.ON);
        events.sendCommand(waterPump.getName(), OnOffType.ON);
        context.createMistCycleTimer(zone);
        context.createMistTimer(zone);
      }
    } else {
      logger.info('Humidity cycle is already running or disabled.'); //TODO
    }
    /*
    var zoneName = zone.getName();
    context.getZoneItems(zoneName).forEach(function each(item) {
      if (
        item.getTags().contains('Dehumidification') &&
        item.getType() === 'Switch'
      ) {
        logger.info('Humidity casdfsdfycle is already running or disabled')
        events.sendCommand(item.getName(), OnOffType.OFF);
      }
      if (
        item.getTags().contains('Humidification') &&
        item.getType() === 'Switch'
      ) {
        logger.info('Humidity cyclasdfasdfe is already running or disabled')
        events.sendCommand(item.getName(), OnOffType.ON);
      }
    });
    */
  };
  // Length of mist
  context.createMistTimer = function createMistTimer(zone) {
    context.timers[zone.getName()].mistTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_MistTime').getState()
      ),
      function onTimeout() {
        context.timers[zone.getName()].mistTimer.cancel();
        context.timers[zone.getName()].mistTimer = null; // Set null at end of cycleTimer?
        var zoneName = zone.getName();
        events.sendCommand(ir.getItem(zoneName + '_Relay'), OnOffType.OFF);
        logger.info(zoneBanner, zoneName);
        logger.info('Mist time has ended for Zone {}.', zoneName);
        context.checkPump();
      }
    );
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
