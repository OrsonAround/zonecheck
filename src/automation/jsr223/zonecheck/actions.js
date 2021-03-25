(function (context) {
  'use strict';

  context.runCycle = function runCycle() {
    context.counters = context.counters || {};
    context.timers = context.timers || {};

    //logger.info('State Description',context.get_metadata(zoneName, 'stateDescription'));
    var zones = context.getZones(true);
    logger.info('* * * * *   Zone Check    * * * * *            ');
    logger.info('Found {} enabled zone(s).', zones.length);
    zones.forEach(function each(zone) {
      var zoneName = zone.getName();
      logger.info(zoneBanner, zoneName);
      context.timers[zoneName] = context.timers[zoneName] || {};
      context.counters[zoneName] = context.counters[zoneName] || {};
      context.checkTemp(zone);
      context.checkHumidity(zone);
      context.displayTimers(zone);
    });
    checkPump();
  };

  context.needsCycle = function needsCycle(zone) {
    var zoneName = zone.getName();
    return (
      ir.getItem(zoneName + '_MistEnabled').getState() &&
      !context.timers[zoneName].cycleTimer ||
      (context.timers[zoneName].cycleTimer.hasTerminated()) // TODO Other Checks?
    );
  };
})(this);
