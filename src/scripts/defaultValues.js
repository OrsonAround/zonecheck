context.setDefaultItemValues = function setDefaultItemValues(
  overwrite,
  zonesEnabled
) {
  var items = ir.getItemsByTag('Settings');
  items.forEach(function (item) {
    var name = item.getName();
    if (name.indexOf('_TargetTemp') >= 0 || overwrite) {
      events.postUpdate(name, '74');
    } else if (name.indexOf('_TargetHumid' || overwrite) >= 0) {
      events.postUpdate(name, '90');
    } else if (name.indexOf('_Enabled' || overwrite) >= 0) {
      if (zonesEnabled) {
        events.postUpdate(name, OnOffType.ON);
      } else {
        events.postUpdate(name, OnOffType.OFF);
      }
    } else if (name.indexOf('_FanCycleTime' || overwrite) >= 0) {
      events.postUpdate(name, '10');
    } else if (name.indexOf('_FanTime' || overwrite) >= 0) {
      events.postUpdate(name, '10');
    } else if (name.indexOf('_DelayTime' || overwrite) >= 0) {
      events.postUpdate(name, '10');
    } else if (name.indexOf('_MistCycleTime' || overwrite) >= 0) {
      events.postUpdate(name, '10');
    } else if (name.indexOf('_MistTime') >= 0 || overwrite) {
      events.postUpdate(name, '10');
    } else if (name.indexOf('_CycleTime') >= 0 || overwrite) {
      events.postUpdate(name, '120');
    } else if (name.indexOf('_MaxTemp') >= 0 || overwrite) {
      events.postUpdate(name, '80');
    } else if (name.indexOf('_MinTemp') >= 0 || overwrite) {
      events.postUpdate(name, '70');
    } else {
      logger.warn('Unrecognized Settings Item: ' + name);
    }
  });
};