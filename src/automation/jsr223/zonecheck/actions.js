'use strict';

(function (context) {
  'use strict';
  context.runCycle = function runCycle() {    
    var zones = context.getZones();
    logger.info('Found {} enabled zone(s).', zones.length);
    zones.forEach(function each(zone) {
      var zoneName = zone.getName();
      logger.info(zoneBanner, zoneName);
      
      context.timers[zoneName] = context.timers[zoneName] || {};      

      try {
        var tm = context.timers[zoneName].cycleTimer;        
        logger.info('');
        logger.info('* * * * *      Timer      * * * * *            ');
        logger.info('');
        logger.info(tm);

        if (!tm) {
          logger.info('timer: !tm');
        } else {
          logger.info('timer: tm');
        }
        if (tm.isActive()) {
          logger.info('is active.');
        } else {
          logger.info('is not active.');
        }
        if (tm.isRunning()) {
          logger.info('is running');
        } else {
          logger.info('is not running');
        }
        if (tm.hasTerminated()) {
          logger.info('has terminated');
        } else {
          logger.info('has not terminated');
        }

        var executionTime = contex.timers[zoneName].getExecutionTime() || ZonedDateTime.now();
        logger.info(Duration.between(executionTime, ZonedDateTime.now()).toString());

      } catch (e) {
        logger.info(e);
      }

      logger.info('');

      if (zone.getName() !== 'ZA' && zone.getName() !== 'Z5') {
        logger.info(context.zoneBanner, zone.getName());
        context.checkTemp(zone);
        context.checkHumidity(zone);
      }
    });
    checkPump();
  };

  context.needsCycle = function needsCycle(zone) {
    var zoneName = zone.getName();
    var cycleTimer = context.timers[zoneName].cycleTimer;
    return (
      !cycleTimer &&
      //!context.zoneTimers[zoneName].fanCycleTimer &&
      //!context.zoneTimers[zoneName].mistCycleTimer &&
      ir.getItem(zoneName + '_MistEnabled').getState() // TODO Other Checks
    );
  };

  context.checkTemp = function checkTemp(zone) {
    var currentTemp = ir.getItem(zone.getName() + '_Temperature').getState();
    var targetTemp = ir.getItem(zone.getName() + '_TargetTemp').getState();
    var bufferedTemp = parseInt(targetTemp) + +0.5;
    logger.info('Temperature: {} ({})', currentTemp, targetTemp);
    if (currentTemp > bufferedTemp) {
      logger.info('Temperature too high.');
      context.getZoneItems(zone.getName());
    } else if (currentTemp < bufferedTemp) {
      zone.allMembers.forEach(function (item) {
        //
      });
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
      events.sendCommand(waterPump.getName(), OnOffType.ON);
      events.sendCommand(relay.getName(), OnOffType.ON);
      context.createCycleTimer(zone);
      //context.createMistTimer(zone);
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
        //context.timers[zone.getName()].cycleTimer = null;
        context.timers[zone.getName()].cycleTimer.cancel();
        logger.info(zoneBanner, zone.getName());
        logger.info('Humidity cycle has ended for Zone {}', zone.getName());
      }
    );

    logger.info('Timer created ({}): {} ', context.timers[zone.getName()].cycleTimer);

  };

  context.createFanCycleTimer = function createFanCycleTimer(zone) {
    var fanCycleTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_FanCycleTime')
      ),
      function onTimeout() {
        context.zoneTimers[zone.getName()].fanCycleTimer = null;
        logger.info(zoneBanner, zone.getName());
        logger.info('Fan cycle has ended for Zone {}', zone.getName());
      }
    );
    context.zoneTimers[zone.getName()].fanCycleTimer = fanCycleTimer;
  };

  context.createFanTimer = function createFanTimer(zone) {
    var fanTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(ir.getItem(zone.getName() + '_FanTime')),
      function onTimeout() {
        fanTimer = null;
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
    var delayFanTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_FanDelayTime')
      ),
      function onTimeout() {
        delayFanTimer = null;
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

  context.createMistCycleTimer = function createMistCycleTimer(zone) {
    var mistCycleTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_MistTime').getState()
      ),
      function onTimeout() {
        context.zoneTimers[zone.getName()].mistCycleTimer = null;
        logger.info(zoneBanner, zone.getName());
        logger.info('Mist cycle has ended for Zone {}', zone.getName());
      }
    );
    context.timers[zone.getName()].mistCycleTimer = mistCycleTimer;
  };

  context.createMistTimer = function createMistTimer(zone) {
    var mistTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_MistTime').getState()
      ),
      function onTimeout() {
        mistTimer = null;
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
})(this);
