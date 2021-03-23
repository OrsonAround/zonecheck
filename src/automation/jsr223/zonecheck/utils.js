'use strict';

load(
  Java.type('java.lang.System').getenv('OPENHAB_CONF') +
    '/automation/lib/javascript/core/metadata.js'
);

var masterGroup = 'Zones';

var Duration = Java.type('java.time.Duration');
var ZonedDateTime = Java.type('java.time.ZonedDateTime');

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

  context.zoneBanner = '* * * * *     Zone {}     * * * * *            ';

  context.startup = function startUp() {
    
    //context.setDefaultItemValues(true, true);
    //context.systemCheck();

    context.counters = context.counters || {};  
    context.timers = context.timers || {};
    context.getZones().forEach(function each(zone) { 
      var zoneName = zone.getName();
      context.timers[zoneName] = context.timers[zoneName] || {};
      context.counters[zoneName] = context.counters[zoneName] || {};
    });

    // logger.info(context.get_metadata(zoneName, 'stateDescription'));
    //var map = new Map();
    //map.set('pattern', '%s');
    // logger.info(context.set_metadata(zoneName, 'stateDescription', map, 'Errored', true));
  };

  // TODO  re-enable ERRORED zones if devices/sensors return
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

  context.onZoneDisabled = function onZoneDisabled(zone) {
    try {
      var items = zone.members;
      items.forEach(function each(item) {
        logger.info(item.getName());
        // TODO Don't touch Zone ZA items unless it's zone ZA that's been disabled
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
        logger.info(relay.getName() + ' is ON, leaving the pump ON');
        return false;
      } else {
        logger.info(relay.getName() + ' is OFF ');
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

  // BROKEN + it will overwrite 0 values?
  context.setDefaultItemValues = function setDefaultItemValues(
    overwrite,
    zonesEnabled
  ) {
    var items = ir.getItemsByTag('Settings');
    items.forEach(function (item) {
      var name = item.getName();
      //var state = item.getState();
      if (overwrite || (!item.getState() && name.indexOf('_TargetTemp') >= 0)) {
        events.postUpdate(name, '74');
      } else if (overwrite || (!item.getState() && name.indexOf('_TargetHumid') >= 0)) {
        events.postUpdate(name, '90');
      } else if (overwrite || (!item.getState() && name.indexOf('Enabled') >= 0)) {
        if (overwrite || (!item.getState() && zonesEnabled)) {
          events.postUpdate(name, OnOffType.ON);
        } else {
          events.postUpdate(name, OnOffType.OFF);
        }
      } else if (overwrite || (!item.getState() && name.indexOf('_FanCycleTime') >= 0)) {
        events.postUpdate(name, '10');
      } else if (overwrite || (!item.getState() && name.indexOf('_FanTime') >= 0)) {
        events.postUpdate(name, '10');
      } else if (overwrite || (!item.getState() && name.indexOf('DelayTime') >= 0)) {
        events.postUpdate(name, '10');
      } else if (overwrite || (!item.getState() && name.indexOf('_MistCycleTime') >= 0)) {
        events.postUpdate(name, '10');
      } else if (overwrite || (!item.getState() && name.indexOf('_MistTime') >= 0)) {
        events.postUpdate(name, '10');
      } else if (overwrite || (!item.getState() && name.indexOf('_CycleTime') >= 0)) {
        events.postUpdate(name, '120');
      } else if (overwrite || (!item.getState() && name.indexOf('_MaxTemp') >= 0)) {
        events.postUpdate(name, '80');
      } else if (overwrite || (!item.getState() && name.indexOf('_MinTemp') >= 0)) {
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
