/* global Java,itemRegistry,OnOffType,scriptExtension,SimpleRule,
  automationManager,load,TriggerBuilder,Configuration */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var Things = Java.type('org.openhab.core.model.script.actions.Things');
var CONF_DIR = Java.type('java.lang.System').getenv('OPENHAB_CONF');

function attach(context) {
  context.checkRequiredThings = function checkRequiredThings() {
    // TODO Since things don't have tags, check the underlying items by their tags.
    [
      'mqtt:topic:MQTTBroker:Climate_Control',
      'zigbee:device:984e3b3df4:60a423fffe98d376',
      'zigbee:device:984e3b3df4:60a423fffe98d486',
      'zigbee:device:984e3b3df4:60a423fffe98d399',
      'zigbee:device:984e3b3df4:60a423fffe98d318',
      'zigbee:device:984e3b3df4:086bd7fffe6e41c6'
    ].forEach(function iterator(name) {
      var isOnline = false;
      var status = Things.getThingStatusInfo(name);
      if (status) {
        isOnline = status.getStatus().toString() === 'ONLINE';
      }
      if (!isOnline) {
        logger.warn('Required Thing ' + name + ' is not online.');
      }
    });
  };

  context.adaptPropertyValue = function adaptPropertyValue(item) {
    var value = item.getState();
    if (value.toFullString() === 'NULL') {
      return null;
    }
    switch (item.getType()) {
      case 'Switch':
        return value === OnOffType.ON;
      case 'Number':
        return parseFloat(value);
      case 'String':
      default:
        return value.toFullString();
    }
  };

  context.addPropertiesToZone = function addPropertiesToZone(zone) {
    var items = itemRegistry.getItems(zone.zoneName + '_.*');
    var allZoneItems = itemRegistry.getItems('ZALL_.*');
    items.forEach(function iterator(item) {
      var prop = context.camelize(item.getName().substring(3));
      zone[prop] = context.adaptPropertyValue(item);
    });

    allZoneItems.forEach(function iterator(item) {
      var prop = context.camelize(item.getName().substring(5));
      zone[prop] = context.adaptPropertyValue(item);
    });
  };

  context.check = function check(zone) {
    context.checkRequiredThings();
    context.addPropertiesToZone(zone);
    logger.info('* * * Zone Check ' + zone.zoneName + ' * * *');
    logger.info(JSON.stringify(zone, null, 2));
    context.checkTemp(zone);
    context.checkHumidity(zone);
    context.checkPump();
  };

  context.runCycle = function runCycle(global) {
    global.zones = []; // reset

    global.zoneA = global.zoneA || {
      zoneName: 'ZA'
    };
    global.zones.push(global.zoneA);

    global.zoneB = global.zoneB || {
      zoneName: 'ZB'
    };
    global.zones.push(global.zoneB);

    global.zoneC = global.zoneC || {
      zoneName: 'ZC'
    };
    global.zones.push(global.zoneC);

    global.zoneD = global.zoneD || {
      zoneName: 'ZD'
    };
    global.zones.push(global.zoneD);

    global.zoneE = global.zoneE || {
      zoneName: 'ZE'
    };
    global.zones.push(global.zoneE);

    logger.info('Checking zones');
    global.zones.forEach(function eachZone(zone) {
      var enabled = itemRegistry.getItem(zone.zoneName + '_Enabled').getState()
        === OnOffType.ON;
      if (enabled) {
        context.check(zone);
      }
    });
  };
  return context;
}

/* istanbul ignore else  */
if (typeof module === 'object' && typeof module.exports === 'object') {
  /* eslint-disable vars-on-top,global-require */
  var attachHumidity = require('./checkHumidity').attach;
  var attachTemp = require('./checkTemp').attach;
  module.exports = {
    attach: function attachIndex(x) {
      attach(x);
      attachHumidity(x);
      attachTemp(x);
      return x;
    }
  };
  /* eslint-enable vars-on-top,global-require */
} else {
  var context = this; // eslint-disable-line vars-on-top
  context.com = context.com || {};
  context.com.adam = context.com.adam || {};
  context.com.adam.zoneCheck = context.com.adam.zoneCheck || {};
  attach(context.com.adam.zoneCheck);
  load(CONF_DIR + '/automation/jsr223/zonecheck/util.js');
  load(CONF_DIR + '/automation/jsr223/zonecheck/checkHumidity.js');
  load(CONF_DIR + '/automation/jsr223/zonecheck/checkTemp.js');

  scriptExtension.importPreset('RuleSupport');
  scriptExtension.importPreset('RuleSimple');
  // eslint-disable-next-line vars-on-top
  var simpleRuleRunCycle = new SimpleRule({
    execute: function execute() {
      context.com.adam.zoneCheck.runCycle(context);
    }
  });
  simpleRuleRunCycle.name = 'ZoneCheck Run Cycle';

  simpleRuleRunCycle.setTriggers([
    TriggerBuilder.create()
      .withId('aTimerTrigger')
      .withTypeUID('timer.GenericCronTrigger')
      .withConfiguration(
        new Configuration({
          cronExpression: '0 * * * * ?'
        })
      )
      .build()
  ]);

  automationManager.addRule(simpleRuleRunCycle);
}
