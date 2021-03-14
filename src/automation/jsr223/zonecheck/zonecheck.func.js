/* global Java,scriptExtension,events,OnOffType,automationManager,SimpleRule,load */

'use strict';

var context = this;
var zoneCheck = context.com.adam.zoneCheck;

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'org.openhab.model.script.Rules.Experiments'
);
var ScriptExecution = Java.type(
  'org.openhab.core.model.script.actions.ScriptExecution'
);
var ZonedDateTime = Java.type('java.time.ZonedDateTime');
var CONF_DIR = Java.type('java.lang.System').getenv('OPENHAB_CONF');

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
        zoneCheck.pumpCheck();

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
        zoneCheck.pumpCheck();

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

function runner() {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  var nxt = args.length
    ? function next() {
      runner.apply(null, args);
    }
    : function done() {
      logger.info('done');
    };
  try {
    logger.info('Start test ' + fn.name);
    fn(nxt);
  } catch (e) {
    logger.error('Test Failed (' + fn.name + '): ' + e.message);
    runner.apply(null, args);
  }
}

scriptExtension.importPreset('RuleSupport');
scriptExtension.importPreset('RuleSimple');

// eslint-disable-next-line vars-on-top
var allTests = [].concat(tests);
// eslint-disable-next-line vars-on-top
var sRule = new SimpleRule({
  execute: function execute() {
    load(CONF_DIR + '/automation/jsr223/zonecheck/index.js');
    logger.info('**** in test mode, starting tests ****');
    try {
      runner.apply(null, allTests);
    } catch (e) {
      logger.error('One or more tests failed: ' + e.message);
    }
  }
});

sRule.name = 'ZoneCheck Fuctional Test';

automationManager.addRule(sRule);
