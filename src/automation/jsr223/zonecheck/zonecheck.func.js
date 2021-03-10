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
    [1, 2, 9, 10].forEach(function eachRelay(x) {
      events.sendCommand(
        zoneCheck['CLIMATE_CONTROLLER_RELAY_' + x],
        OnOffType.OFF
      );
    });
    ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(1),
      function afterEventSet() {
        if (!zoneCheck.allRelaysAreOff()) {
          throw new Error('testAllRelaysAreOff Failed 1');
        }
        logger.info('✓');

        events.sendCommand(zoneCheck.CLIMATE_CONTROLLER_RELAY_9, OnOffType.ON);
        ScriptExecution.createTimer(
          ZonedDateTime.now().plusSeconds(1),
          function afterControllerOn() {
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
    events.sendCommand(zoneCheck.WATER_PUMP_SWITCH, OnOffType.ON);
    [1, 2, 9, 10].forEach(function eachRelay(x) {
      events.sendCommand(
        zoneCheck['CLIMATE_CONTROLLER_RELAY_' + x],
        OnOffType.OFF
      );
    });

    ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(1),
      function afterRelaySet() {
        zoneCheck.pumpCheck();

        ScriptExecution.createTimer(
          ZonedDateTime.now().plusSeconds(1),
          function afterPumpCheck() {
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
    events.sendCommand(zoneCheck.WATER_PUMP_SWITCH, OnOffType.ON);
    [1, 9, 10].forEach(function eachRelay(x) {
      events.sendCommand(
        zoneCheck['CLIMATE_CONTROLLER_RELAY_' + x],
        OnOffType.OFF
      );
    });
    events.sendCommand(
      zoneCheck['CLIMATE_CONTROLLER_RELAY_' + 2],
      OnOffType.ON
    );

    ScriptExecution.createTimer(
      ZonedDateTime.now().plusSeconds(1),
      function afterRelayOn() {
        zoneCheck.pumpCheck();

        ScriptExecution.createTimer(
          ZonedDateTime.now().plusSeconds(1),
          function afterPumpCheck() {
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

function setTestNames(next) {
  zoneCheck.origWaterPump = zoneCheck.WATER_PUMP_SWITCH;
  zoneCheck.WATER_PUMP_SWITCH = 'Water_Pump_Switch_Test';
  [1, 2, 9, 10].forEach(function eachRelay(x) {
    zoneCheck['origClimateControllerRelay' + x] = zoneCheck['CLIMATE_CONTROLLER_RELAY_' + x];
    zoneCheck['CLIMATE_CONTROLLER_RELAY_' + x] = 'Climate_Controller_Relay' + x + '_Test';
  });
  next();
}

function restoreTestNames(next) {
  zoneCheck.WATER_PUMP_SWITCH = zoneCheck.origWaterPump;
  [1, 2, 9, 10].forEach(function eachRelay(x) {
    zoneCheck['CLIMATE_CONTROLLER_RELAY_' + x] = zoneCheck['origClimateControllerRelay' + x];
  });

  next();
}

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

(function createRule() {
  var allTests = [].concat(setTestNames, tests, restoreTestNames);
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
}());
