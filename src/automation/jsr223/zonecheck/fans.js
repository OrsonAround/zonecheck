(function (context) {
  'use strict';

  context.checkFans = function checkFans(zone) {
    var zoneName = zone.getName();
    if (
      ir.getItem(zoneName + '_FanEnabled').getState() &&
      !context.timers[zoneName].fanCycleTimer &&
      !context.timers[zoneName].mistTimer
    ) {
      context.createFanCycleTimer(zone);
      context.createFanTimer(zone);
      events.sendCommand(
        ir.getItem(zone.getName() + '_FanSwitch'),
        OnOffType.ON
      );
    } else {
      logger.info('Fan cycle is already running or disabled.');
    }
  };

  // Length of time between running fans
  context.createFanCycleTimer = function createFanCycleTimer(zone) {
    context.timers[zone.getName()].fanCycleTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_FanCycleTime').getState()
      ),
      function onTimeout() {
        context.timers[zone.getName()].fanCycleTimer.cancel();
        context.timers[zone.getName()].fanCycleTimer = null;
        logger.info(zoneBanner, zone.getName());
        logger.info('Fan cycle has ended for Zone {}', zone.getName());
      }
    );
  };

  // Length of time fan runs
  context.createFanTimer = function createFanTimer(zone) {
    context.timers[zone.getName()].fanTimer = ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(
        ir.getItem(zone.getName() + '_FanTime').getState()
      ),
      function onTimeout() {
        context.timers[zone.getName()].fanTimer.cancel();
        context.timers[zone.getName()].fanTimer = null;
        logger.info(zoneBanner, zone.getName());
        logger.info('Fan time has ended for Zone {}', zone.getName());
        logger.debug('Turning off fans (fanTimer)');
        events.sendCommand(
          ir.getItem(zone.getName() + '_FanSwitch'),
          OnOffType.OFF
        );
      }
    );
  };
})(this);
