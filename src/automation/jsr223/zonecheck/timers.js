(function (context) {
    'use strict';

  context.displayTimers = function displayTimers(zone) {
    var timers = context.timers[zone.getName()];
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
  }

  context.timeRemaining = function timeRemaining(timer) {
    if (timer.isActive()) {
      var executionTime = timer.getExecutionTime() || ZonedDateTime.now();
      var timeRemaining = Duration.between(ZonedDateTime.now(), executionTime);
      return timeRemaining;
    } else {
      return Duration.between(ZonedDateTime.now(), ZonedDateTime.now());
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
