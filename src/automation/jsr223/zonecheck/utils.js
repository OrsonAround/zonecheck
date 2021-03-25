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

  context.zoneBanner = '* * * * *     Zone {}     * * * * *';

  // TODO  re-enable ERRORED zones if devices/sensors return, metadata not tested
  // TODO  Currently only checks for recent sensor data, add check for device states
  context.systemCheck = function systemCheck() {
    logger.info('* * * * *  SYSTEM CHECK   * * * * *');                
    context.getZones(true).forEach(function each(zone) {
      var zoneName = zone.getName();
      zone.allMembers.forEach(function (member) {
        var tags = member.getTags();
        var itemState = member.getState();
        if (tags.contains('Required') && tags.contains('Sensor')) {
          var passed =
            context.pe.updatedSince(
              member,
              ZonedDateTime.now().minusMinutes(5)
            ) &&
            context.pe.changedSince(
              member,
              ZonedDateTime.now().minusMinutes(5)
            ) &&
            itemState !== UNDEF &&
            itemState !== null;
          if (!passed) {
            logger.warn(
              'FAILED: {} has not changed or updated in the last 5 minutes.',
              member.getName()
            );
            if (zone.getState() === OnOffType.ON) {
              events.sendCommand(zoneName + '_Enabled', OnOffType.OFF);
              context.set_metadata(
                zoneName,
                'stateDescription',
                null,
                'Errored',
                false
              );
              logger.warn('Zone {} disabled.', zoneName);
            }
          }
        }
      });
    });
    return true;
  };

  // Not tested
  context.checkSensors = function checkSensors(zone) {
    zone.allMembers.forEach(function (member) {
      var tags = member.getTags();
      var itemState = member.getState();
      if (tags.contains('Required') && tags.contains('Sensor')) {
        var passed =
          context.pe.updatedSince(
            member,
            ZonedDateTime.now().minusMinutes(5)
          ) &&
          context.pe.changedSince(
            member,
            ZonedDateTime.now().minusMinutes(5)
          ) &&
          itemState !== UNDEF &&
          itemState !== null;
      }
      if (!passed) {
        return false;
      }
    });
    return true;
  };

  context.checkHardware = function checkHardware(zone) {};

  context.getZones = function getZones(enabled) {
    var zones = ir.getItem(masterGroup).getMembers(function (z) {
      if (enabled) {
        return (
          z.getType() === 'Group' &&
          z.hasTag('Zone') &&
          ir.getItem(z.getName() + '_Enabled').getState() === OnOffType.ON
        );
      } else {
        return z.getType() === 'Group' && z.hasTag('Zone');
      }
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
        logger.debug(relay.getName() + ' is ON, leaving the pump ON');
        return false;
      } else {
        logger.debug(relay.getName() + ' is OFF ');
      }
    });
    return true;
  };

  context.checkPump = function checkPump() {
    var pumpSwitch = ir.getItem('ZA_WaterPump');
    if (pumpSwitch.getState() === OnOffType.ON && context.allRelaysAreOff()) {
      events.sendCommand(pumpSwitch, OnOffType.OFF);
      logger.info('Pump Check: Turning off Water Pump');
    } 
  };

  // BROKEN + it will overwrite 0 values
  context.setDefaultItemValues = function setDefaultItemValues(
    zonesEnabled,
    overwrite
  ) {
    var items = ir.getItemsByTag('Settings');
    items.forEach(function (item) {
      var name = item.getName();
      var state = item.getState();
      //logger.info('Item {} State {}', name, state);
      if (name.indexOf('_TargetTemp') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '78');
      } else if (name.indexOf('_TargetHumid') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '90');
      } else if (name.indexOf('Enabled') >= 0 && (!state || overwrite)) {
        if (zonesEnabled) {
          events.postUpdate(name, OnOffType.ON);
        } else {
          events.postUpdate(name, OnOffType.OFF);
        }
      } else if (name.indexOf('_FanCycleTime') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '10');
      } else if (name.indexOf('_FanTime') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '120');
      } else if (name.indexOf('DelayTime') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '10');
      } else if (name.indexOf('_MistCycleTime') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '30');
      } else if (name.indexOf('_MistTime') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '30');
      } else if (name.indexOf('_CycleTime') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '300');
      } else if (name.indexOf('_MaxTemp') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '80');
      } else if (name.indexOf('_MinTemp') >= 0 && (!state || overwrite)) {
        events.postUpdate(name, '70');
      } else {
        //logger.warn('Unrecognized Settings Item: ' + name);
      }
    });
  };

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
})(this);
