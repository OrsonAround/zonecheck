/* global Java,events,OnOffType */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');

function attach(zoneCheck) {
  var tests = [
    function testAttachProperties(next) {
      var zone = { zoneName: 'ZA' };
      zoneCheck.addPropertiesToZone(zone);
      [
        'fanSwitch',
        'fanEnabled',
        'relay',
        'fanTime',
        'enabled',
        'fanDelayTime'
      ].forEach(function fe(key) {
        if (!(key in zone)) {
          throw new Error(
            'testAttachProperties Failed. Missing property ' + key
          );
        }
      });
      logger.info('✓');
      next();
    }
  ];
  return tests;
}

/* istanbul ignore else  */
if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = {
    attach: attach
  };
} else {
  var context = this; // eslint-disable-line vars-on-top
  context.com = context.com || {};
  context.com.adam = context.com.adam || {};
  context.com.adam.zoneCheck = context.com.adam.zoneCheck || {};
  context.com.adam.zoneCheck.funcTest = context.com.adam.zoneCheck.funcTest || {};
  context.com.adam.zoneCheck.funcTest.main.tests = attach(
    context.com.adam.zoneCheck
  );
}
