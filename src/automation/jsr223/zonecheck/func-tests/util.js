/* global Java,events,OnOffType */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'com.adam.zoneCheck.funcTest.util  ﭧ'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');

function attach(zoneCheck) {
  var tests = [
    function testGetPump(next) {
      var pump = zoneCheck.getPump();
      if (!pump) {
        throw new Error('testGetPump Failed');
      } else {
        logger.info('✓');
        next();
      }
    },

    function testAllRelaysAreOff(next) {
      ['A', 'B', 'C', 'D'].forEach(function eachRelay(x) {
        events.sendCommand('Z' + x + '_Relay', OnOffType.OFF);
      });
      ScriptExecution.createTimer(
        ZonedDateTime.now().plusSeconds(1),
        function onTimeout() {
          if (!zoneCheck.allRelaysAreOff()) {
            throw new Error('testAllRelaysAreOff Failed 1');
          }
          logger.info('✓');

          events.sendCommand('ZA_Relay', OnOffType.ON);
          ScriptExecution.createTimer(
            ZonedDateTime.now().plusSeconds(1),
            function onTimeout2() {
              if (zoneCheck.allRelaysAreOff()) {
                throw new Error('testAllRelaysAreOff Failed 2');
              }
              logger.info('✓');
              next();
            }
          );
        }
      );
    },

    function testShutsPumpOff(next) {
      events.sendCommand('ZALL_WaterPump', OnOffType.ON);
      ['A', 'B', 'C', 'D'].forEach(function eachRelay(x) {
        events.sendCommand('Z' + x + '_Relay', OnOffType.OFF);
      });

      ScriptExecution.createTimer(
        ZonedDateTime.now().plusSeconds(1),
        function onTimeout() {
          zoneCheck.checkPump();

          ScriptExecution.createTimer(
            ZonedDateTime.now().plusSeconds(1),
            function onTimeout2() {
              if (zoneCheck.getPump().getState() === OnOffType.ON) {
                throw new Error('should have turned pump off');
              }
              logger.info('✓');
              next();
            }
          );
        }
      );
    },

    function testKeepsPumpOn(next) {
      events.sendCommand('ZALL_WaterPump', OnOffType.ON);
      ['A', 'B', 'C', 'D'].forEach(function eachRelay(x) {
        events.sendCommand('Z' + x + '_Relay', OnOffType.OFF);
      });

      events.sendCommand('ZB_Relay', OnOffType.ON);

      ScriptExecution.createTimer(
        ZonedDateTime.now().plusSeconds(1),
        function onTimeout() {
          zoneCheck.checkPump();

          ScriptExecution.createTimer(
            ZonedDateTime.now().plusSeconds(1),
            function onTimeout2() {
              if (zoneCheck.getPump().getState() !== OnOffType.ON) {
                throw new Error('should have kept pump on ');
              }
              logger.info('✓');
              next();
            }
          );
        }
      );
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
  context.com.adam.zoneCheck.funcTest.util.tests = attach(
    context.com.adam.zoneCheck
  );
}
