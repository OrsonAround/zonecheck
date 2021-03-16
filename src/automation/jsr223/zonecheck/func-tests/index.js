/* global Java,scriptExtension,automationManager,SimpleRule,load */

'use strict';

var logger = Java.type('org.slf4j.LoggerFactory').getLogger(
  'com.adam.zoneCheck.funcTest.index ﭧ'
);
var CONF_DIR = Java.type('java.lang.System').getenv('OPENHAB_CONF');

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

if (typeof module === 'object' && typeof module.exports === 'object') {
  // eslint-disable-next-line vars-on-top,global-require
  var attachUtil = require('./util').attach;
  // var attachTemp = require('./checkTemp').attach;
  module.exports = {
    attach: function attachIndex(x) {
      attachUtil(x);
      // attachTemp(x);
      return x;
    }
  };
} else {
  var context = this; // eslint-disable-line vars-on-top
  context.com = context.com || {};
  context.com.adam = context.com.adam || {};
  context.com.adam.zoneCheck = context.com.adam.zoneCheck || {};
  context.com.adam.zoneCheck.funcTest = context.com.adam.zoneCheck.funcTest || {};
  load(CONF_DIR + '/automation/jsr223/zonecheck/func-tests/util.js');
  load(CONF_DIR + '/automation/jsr223/zonecheck/func-tests/main.js');

  // eslint-disable-next-line vars-on-top
  var allTests = [].concat(
    context.com.adam.zoneCheck.funcTest.util.tests,
    context.com.adam.zoneCheck.funcTest.main.tests
  );
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
}
