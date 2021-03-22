logger.warn('Resetting all Climate Control settings to default values.');
logger.warn('All Zones will be Disabled');
var items = itemRegistry.getItemsByTag('Settings');
var ii = items.length;
for (var i = 0; i < ii; i += 1) {
  if (items[i].getName().indexOf('DesiredTemp') >= 0) {
    events.postUpdate(items[i].getName(), '74');
  } else if (items[i].getName().indexOf('DesiredHumid') >= 0) {
    events.postUpdate(items[i].getName(), '90');
  } else if (items[i].getName().indexOf('Enabled') >= 0) {
    events.postUpdate(items[i].getName(), OnOffType.OFF);
  } else if (items[i].getName().indexOf('Time') >= 0) {
    events.postUpdate(items[i].getName(), '60');
  } else if (items[i].getName().indexOf('CycleTime') >= 0) {
    events.postUpdate(items[i].getName(), '600');
  } else if (items[i].getName().indexOf('MaxTemp') >= 0) {
    events.postUpdate(items[i].getName(), '80');
  } else if (items[i].getName().indexOf('MinTemp') >= 0) {
    events.postUpdate(items[i].getName(), '70');
  } else {
    logger.warn('Unrecognized Settings Item: ' + items[i].getName());
  }
}