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
      if (zoneName !== 'ZA' && zoneName !== 'Z5') {
        context.checkTemp(zone);
        context.checkHumidity(zone);
        context.displayTimers(zone);
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
  }

})(this);