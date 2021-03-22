'use strict';

var masterGroup = 'Zones';

var Duration = Java.type('java.time.Duration');
var ZonedDateTime = Java.type('java.time.ZonedDateTime');
var uuid = Java.type('java.util.UUID');

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'com.openhab.core.model.script.rule.zonecheck'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var PersistenceExtensions = Java.type(
  'org.openhab.core.persistence.extensions.PersistenceExtensions'
);

scriptExtension.importPreset('RuleSupport');
scriptExtension.importPreset('RuleSimple');
scriptExtension.importPreset('RuleFactories');
scriptExtension.importPreset('default'); // ?

(function (context) {
  'use strict';

  context.PersistenceExtensions = PersistenceExtensions;
  context.pe = PersistenceExtensions;
  context.uuid = uuid.randomUUID();
  context.zoneBanner = '* * * * *     Zone {}     * * * * *            ';  

  context.logInfo = function (type, value) {
    logger.info(args(arguments));
  };
  context.logWarn = function (type, value) {
    logger.warn(args(arguments));
  };
  context.logDebug = function (type, value) {
    logger.debug(args(arguments));
  };
  context.logError = function (type, value) {
    logger.error(args(arguments));
  };
  context.logTrace = function (type, value) {
    logger.trace(args(arguments));
  };

  context.startup = function startUp() {
    //
    context.setDefaultItemValues(false, false);
    //context.systemCheck();
    context.timers = context.timers || {}; 
    context.getZones().forEach(function each(zone) {
      var zoneName = zone.getName();
      context.timers[zoneName] = context.timers[zoneName] || {};
    });
  }

  // TODO Take zone as an argument, re-enable zones if devices/sensors return
  context.systemCheck = function systemCheck() {
    logger.info('* * * * *  SYSTEM CHECK   * * * * *');
    context.getZones().forEach(function each(zone) {
      zone.allMembers.forEach(function (member) {
        var tags = member.getTags();
        if (tags.contains('Required') && tags.contains('Sensor')) {
          var passed =
            context.pe.updatedSince(
              member,
              ZonedDateTime.now().minusMinutes(5)
            ) &&
            context.pe.changedSince(
              member,
              ZonedDateTime.now().minusMinutes(5)
            );
          if (!passed) {
            logger.warn(
              'FAILED: {} has not changed or updated in the last 5 minutes.',
              member.getName()
            );
            if (zone.getState() === OnOffType.ON) {
              events.sendCommand(zone.getName() + '_Enabled', OnOffType.OFF);
              logger.warn('Zone {} disabled.', zone.getName());
            }
          }
        }
      });
    });
    return true;
  };

  context.getZones = function getZones() {
    var zones = ir.getItem(masterGroup).getMembers(function (z) {
      return (
        z.getType() === 'Group' &&
        z.hasTag('Zone') &&
        ir.getItem(z.getName() + '_Enabled').getState() === OnOffType.ON
      );
    });
    return zones;
  };

  context.getZoneItems = function getZoneItems(zone) {
    var items = zone.getMembers(function (i) {
      return i.getType() !== 'Group';
    });
    return items;
  };

  context.timeRemaining = function timeRemaining(timer) {
    if (timer.isActive()) {
      var executionTime =
              timer.getExecutionTime() || ZonedDateTime.now();
      var timeRemaining = Duration.between(
        ZonedDateTime.now(),
        executionTime
      );
      return timeRemaining;
    } else {
      return 0; // TODO this should probably be a duration of 0 or .getSeconds will fail 
    }
  };

  context.onZoneDisabled = function onZoneDisabled(zone) {
    try {
      var items = zone.members;
      items.forEach(function each(item) {
        logger.info(item.getName());
        // TODO Don't touch Zone ZA Devices unless it's zone ZA that's been disabled
        if (item.getType() === 'Switch' && !item.hasOwnProperty('ZA')) {
          logger.info(
            'Zone {} disabled. Turning off {}',
            zone.name,
            item.getName()
          );
          events.sendCommand(item.getName(), OnOffType.OFF);
        }
      });
    } catch (e) {
      logger.error(e);
    }
  };

  context.allRelaysAreOff = function allRelaysAreOff() {
    var relays = ir.getItemsByTagAndType('Switch', 'Relay');
    relays.forEach(function each(relay) {
      var off =
        relay.getState() === OnOffType.OFF || relay.getState() == 'NULL';
      if (!off) {
        logDebug(relay.getName() + ' is ON, leaving the pump ON');
        return false;
      } else {
        logDebug(relay.getName() + ' is OFF ');
      }
    });
    return true;
  };

  context.relay = function relay(master, slave, state) {
    if (state === OnOffType.ON) {
    }
  };

  context.getPump = function getPump() {
    try {
      return ir.getItem('ZA_WaterPump');
    } catch (e) {
      logger.error('ZA_WaterPump not found in registry');
    }
    return undefined;
  };

  context.checkPump = function checkPump() {
    var pumpSwitch = context.getPump();
    if (pumpSwitch.getState() === OnOffType.ON && context.allRelaysAreOff()) {
      events.sendCommand(pumpSwitch, OnOffType.OFF);
      logger.info('Pump Check: Turning off Water Pump');
    } else {
      logger.info('Pump Check: The water pump is OFF');
    }
  };

  context.setDefaultItemValues = function setDefaultItemValues(
    overwrite,
    zonesEnabled
  ) {
    var items = ir.getItemsByTag('Settings');
    items.forEach(function (item) {
      var name = item.getName();
      var state = item.getState();
      if (overwrite || !state && name.indexOf('_TargetTemp') >= 0) {
        events.postUpdate(name, '74');
      } else if (overwrite || !state && name.indexOf('_TargetHumid') >= 0) {
        events.postUpdate(name, '90');
      } else if (overwrite || !state && name.indexOf('Enabled') >= 0) {
        if (overwrite || !state && zonesEnabled) {
          events.postUpdate(name, OnOffType.ON);
        } else {
          events.postUpdate(name, OnOffType.OFF);
        }
      } else if (overwrite || !state && name.indexOf('_FanCycleTime') >= 0) {
        events.postUpdate(name, '10');
      } else if (overwrite || !state && name.indexOf('_FanTime') >= 0) {
        events.postUpdate(name, '10');
      } else if (overwrite || !state && name.indexOf('DelayTime') >= 0) {
        events.postUpdate(name, '10');
      } else if (overwrite || !state && name.indexOf('_MistCycleTime') >= 0) {
        events.postUpdate(name, '10');
      } else if (overwrite || !state && name.indexOf('_MistTime') >= 0) {
        events.postUpdate(name, '10');
      } else if (overwrite || !state && name.indexOf('_CycleTime') >= 0) {
        events.postUpdate(name, '120');
      } else if (overwrite || !state && name.indexOf('_MaxTemp') >= 0) {
        events.postUpdate(name, '80');
      } else if (overwrite || !state && name.indexOf('_MinTemp') >= 0) {
        events.postUpdate(name, '70');
      } else {
        //logger.warn('Unrecognized Settings Item: ' + name);
      }
    });
  };

  // Local Functions

  var args = function (a) {
    var um = a.length > 1 ? '\n' : '';
    var s1 = '';
    for (var i in a) {
      if (i == 0) {
        s1 = '|' + a[i] + '| ';
      } else {
        s1 += um + i + ":'" + a[i] + "' ";
      }
    }
    return s1 + um;
  };

  // Not used
  //Boolean updatedSince(Item item, AbstractInstant timestamp)
  //Boolean updatedSince(Item item, AbstractInstant timestamp, String serviceId)
  context.updatedSince = function (it, timestamp, serviceId) {
    try {
      var item = context.getItem(it);
      return serviceId == undefined
        ? context.pe.updatedSince(item, timestamp)
        : context.pe.updatedSince(item, timestamp, serviceId);
    } catch (err) {
      context.logError('updatedSince ' + __LINE__, err);
    }
    return null;
  };

  context.getItem = function (it) {
    try {
      return typeof it === 'string' || it instanceof String
        ? itemRegistry.getItem(it)
        : it;
    } catch (err) {
      context.logError('getItem ' + __LINE__, err);
    }
    return null;
  };

  /**
   * Filters the members of the passed in group and generates a comma separated list of
   * the item names (based on metadata if available).
   * @param {string} groupName name of the group to generate the list of names from
   * @param {function} filterFunc filtering function that takes one Item as an argument
   */
  context.getNames = function (groupName, filterFunc) {
    var Collectors = Java.type('java.util.stream.Collectors');
    return context.ir
      .getItem(groupName)
      .members.stream()
      .filter(filterFunc)
      .map(function (i) {
        return context.getName(i.name);
      })
      .collect(Collectors.joining(', '));
  };
})(this);
