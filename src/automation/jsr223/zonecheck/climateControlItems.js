/* global Java,automationManager,scriptExtension,SimpleRule,events,itemRegistry,OnOffType */
/* eslint-disable vars-on-top */

'use strict';

scriptExtension.importPreset('RuleSupport');
scriptExtension.importPreset('RuleSimple');

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'com.adam.zoneCheck.climateControlItems  '
);

var defaults = {
  DesiredTemp: 74,
  DesiredHumid: 90.999,
  Enabled: OnOffType.OFF,
  Time: 60,
  MaxTemp: 80.1,
  MinTemp: 70.2,
  Temperature: 99.9,
  SpaceHeater: OnOffType.OFF
};

var sRule = new SimpleRule({
  execute: function execute() {
    var items = itemRegistry.getItemsByTag('Settings');
    logger.warn('Resetting all Climate Control settings to default values.');
    logger.warn('All Zones will be Disabled');

    items.forEach(function iterator(item) {
      var itemName = item.getName();
      var found = false;
      Object.keys(defaults).forEach(function eachKey(key) {
        if (itemName.indexOf(key) !== -1) {
          events.postUpdate(item, defaults[key]);
          found = true;
        }
      });
      if (!found) {
        logger.warn('Unrecognized Settings Item: ' + itemName);
      }
    });
    events.postUpdate('ZA_Temperature', defaults.Temperature);
    events.postUpdate('ZALL_SpaceHeater', defaults.SpaceHeater);
    events.postUpdate('ZA_Enabled', OnOffType.ON);
  }
});

sRule.name = 'Climate Control - Initialize Items';
automationManager.addRule(sRule);

/* eslint-enable vars-on-top */
