'use strict';

var CONF_DIR = Java.type('java.lang.System').getenv('OPENHAB_CONF');
load(CONF_DIR + '/automation/jsr223/zonecheck/utils.js');
load(CONF_DIR + '/automation/jsr223/zonecheck/actions.js');

// TODO Change these to use RuleBuilder
// Rule for runCycle()
var sRule = new SimpleRule({
  execute: function execute(module, input) {
    runCycle();
  },
});
sRule.name = 'Zone Check';
sRule.setTriggers([
  // Trigger once per minute
  TriggerBuilder.create()
    .withId('aTimerTrigger')
    .withTypeUID('timer.GenericCronTrigger')
    .withConfiguration(
      new Configuration({
        cronExpression: '0/5 * * * * ? *',
      })
    )
    .build(),
  // Trigger on State Event (for REST API)
  TriggerBuilder.create()
    .withId('genericTrigger')
    .withTypeUID('core.GenericEventTrigger')
    .withConfiguration(
      new Configuration({
        eventTopic: 'openhab/*',
        eventSource: 'Z_Trigger',
        eventTypes: 'ItemStateEvent',
      })
    )
    .build(),
]);
automationManager.addRule(sRule);

// Rule for onZoneDisabled()
var zDisabled = new SimpleRule({
  execute: function execute(module, input) {
    onZoneDisabled(ir.getItem(input.event.itemName.substring(0, 2)));
  },
});
zDisabled.name = 'On Zone Disabled';
var triggers = [];
var zones = ir.getItem(masterGroup).members;
zones.forEach(function each(zone) {
  var trigger = TriggerBuilder.create()
    .withId('aItemStateChangeTrigger')
    .withTypeUID('core.ItemStateChangeTrigger')
    .withConfiguration(
      new Configuration({
        itemName: zone.getName() + '_Enabled',
        previousState: 'ON',
        state: 'OFF',
      })
    )
    .build();
  triggers.push(trigger);
});
zDisabled.setTriggers(triggers);
automationManager.addRule(zDisabled);

// Rule for onZoneEnabled()
var zEnabled = new SimpleRule({
  execute: function execute(module, input) {
    onZoneEnabled(ir.getItem(input.event.itemName.substring(0, 2)));
  },
});
zEnabled.name = 'On Zone Enabled';
var triggers = [];
var zones = ir.getItem(masterGroup).members;
zones.forEach(function each(zone) {
  var trigger = TriggerBuilder.create()
    .withId('aItemStateChangeTrigger')
    .withTypeUID('core.ItemStateChangeTrigger')
    .withConfiguration(
      new Configuration({
        itemName: zone.getName() + '_Enabled',
        previousState: 'OFF',
        state: 'ON',
      })
    )
    .build();
  triggers.push(trigger);
});
zEnabled.setTriggers(triggers);
automationManager.addRule(zEnabled);
