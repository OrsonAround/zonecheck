var logger = Java.type("org.slf4j.LoggerFactory").getLogger("org.openhab.model.script.Rules.Experiments");
var ScriptExecution = Java.type("org.openhab.core.model.script.actions.ScriptExecution");
var ZonedDateTime = Java.type("java.time.ZonedDateTime");

var pumpSwitch = itemRegistry.getItem("Water_Pump_Switch");

this.mistTimerA = (this.mistTimerA === undefined) ? null:this.mistTimerA;
this.fanTimerA = (this.fanTimerA === undefined) ? null:this.fanTimerA;
this.cycleTimerA = (this.lastCycleA === undefined) ? null:this.lastCycleA;
this.mistTimerB = (this.mistTimerB === undefined) ? null:this.mistTimerB;
this.fanTimerB = (this.fanTimerB === undefined) ? null:this.fanTimerB;
this.cycleTimerB = (this.lastCycleB === undefined) ? null:this.lastCycleB;
this.mistTimerC = (this.mistTimerC === undefined) ? null:this.mistTimerC;
this.fanTimerC = (this.fanTimerC === undefined) ? null:this.fanTimerC;
this.cycleTimerC = (this.lastCycleC === undefined) ? null:this.lastCycleC;
this.mistTimerD = (this.mistTimerD === undefined) ? null:this.mistTimerD;
this.fanTimerD = (this.fanTimerD === undefined) ? null:this.fanTimerD;
this.cycleTimerD = (this.lastCycleD === undefined) ? null:this.lastCycleD;

this.lastUpdateTimer = (this.lastUpdateTimer === undefined) ? null:this.lastUpdateTimer;

var enabledA = itemRegistry.getItem("ClimateSHT10Array_ZoneA").getState(); 
var enabledB = itemRegistry.getItem("ClimateSHT10Array_ZoneB").getState(); 
var enabledC = itemRegistry.getItem("ClimateSHT10Array_ZoneC").getState(); 
var enabledD = itemRegistry.getItem("ClimateSHT10Array_ZoneD").getState(); 

// Timer Lengths - minutes
var cycleTimerLen = 60;
var mistTimerLen = 2;
var fanTimerLen = 5;

var zoneA = {
  zoneName: "A",
  desiredTemp: "75", // Need to get this from openhab item in the future
  desiredHumid: "90",
  currentTemp: itemRegistry.getItem("ClimateSHT10Array_TemperatureZoneA").getState(),
  currentHumid: itemRegistry.getItem("ClimateSHT10Array_HumidityZoneA").getState(),
  relay: itemRegistry.getItem("ClimateController_Relay1"),
  fans: itemRegistry.getItem("ZoneAFans_Switch"),
}

var zoneB = {
  zoneName: "B",
  desiredTemp: "75",
  desiredHumid: "90",
  currentTemp: itemRegistry.getItem("ClimateSHT10Array_TemperatureZoneB").getState(),
  currentHumid: itemRegistry.getItem("ClimateSHT10Array_HumidityZoneB").getState(),
  relay: itemRegistry.getItem("ClimateController_Relay2"),
  fans: itemRegistry.getItem("ZoneBFans_Switch"),
}

var zoneC = {
  zoneName: "C",
  desiredTemp: "75",
  desiredHumid: "90",
  currentTemp: itemRegistry.getItem("ClimateSHT10Array_TemperatureZoneC").getState(),
  currentHumid: itemRegistry.getItem("ClimateSHT10Array_HumidityZoneC").getState(),
  relay: itemRegistry.getItem("ClimateController_Relay9"),
  fans: itemRegistry.getItem("ZoneCFans_Switch"),
}

var zoneD = {
  zoneName: "D",
  desiredTemp: "75",
  desiredHumid: "90",
  currentTemp: itemRegistry.getItem("ClimateSHT10Array_TemperatureZoneD").getState(),
  currentHumid: itemRegistry.getItem("ClimateSHT10Array_HumidityZoneD").getState(),
  relay: itemRegistry.getItem("ClimateController_Relay10"),
  fans: itemRegistry.getItem("ZoneDFans_Switch"),
}

// Run zoneCheck() for enabled zones
if (enabledA == "ON") { zoneCheck(zoneA, this.mistTimerA, this.fanTimerA, this.cycleTimerA); }
if (enabledB == "ON") { zoneCheck(zoneB, this.mistTimerB, this.fanTimerB, this.cycleTimerB); }
if (enabledC == "ON") { zoneCheck(zoneC, this.mistTimerC, this.fanTimerC, this.cycleTimerC); }
if (enabledD == "ON") { zoneCheck(zoneD, this.mistTimerD, this.fanTimerD, this.cycleTimerD); }

// Check state of relays, if none are ON turn OFF pump 
// TODO: Make sure QOS is 2 on all these MQTT topics
if(pumpSwitch.getState() == "ON" && zoneA["relay"] == "OFF" && zoneB["relay"] == "OFF" && zoneC["relay"] == "OFF" && zoneD["relay"] == "OFF") {
  events.sendCommand(pumpSwitch, "OFF");
}

function zoneCheck(object, mistTimer, fanTimer, cycleTimer) {
  logger.info("* * * Zone " + object["zoneName"] + " * * *");
  logger.info("Current Temperature: " + object["currentTemp"] + " Desired Temperature: " + object["desiredTemp"]);
  logger.info("Current Humidity: " + object["currentHumid"] + " Desired Humidty: " + object["desiredHumid"]);
  
  // Temperature
  // Average temps?
  // TODO Turn on fans when temperature is too high / mister isn't on and humiditiy is in range
  if (object["currentTemp"] < object["desiredTemp"]) {
    logger.info("Temperature too low. TODO: Integrate with Space Heater Script to adjust temperature.");
  } else if (object["currentTemp"] > object["desiredTemp"]) {
    logger.info("Temperature too high.");
  } else {
    logger.info("Temperature in range.");
  }
  
  // Humidity
  if (object["currentHumid"] < object["desiredHumid"]) {
    logger.info("Humidity too low.");
    // Check to see if cycle timer is running, if so skip this cycle.
    if (this.cycleTimer == null) {
    // See if mistTimer or fanTimer is already running, is so skip this cycle.
      if(this.mistTimer == null && this.fanTimer == null && this.cycleTimer == null) {
        logger.info("Starting Humidity Cycle.");
        if(object["relay"].getState() == "OFF") { 
          // If the Pump Switch is OFF, turn it ON
          if(pumpSwitch.getState() == "OFF") { events.sendCommand(pumpSwitch, "ON"); } 
          events.sendCommand(object["relay"], "ON"); 
          logger.info("turning on");
        }
        // Create cycle timer to prevent running humidity cycle more than once per hour
        this.cycleTimer = ScriptExecution.createTimer(ZonedDateTime.now().plusMinutes(cycleTimerLen), function() {
          this.cycleTimer = null;
        });
        // Create mist timer - run mister for two minutes, then turn on fans and start fan timer
        this.mistTimer = ScriptExecution.createTimer(ZonedDateTime.now().plusMinutes(mistTimerLen), function(){
          events.sendCommand(object["relay"], "OFF");
          events.sendCommand(object["fans"], "ON");
          this.mistTimer = null;
          // Create fan timer when mist timer expires - run fans for 5 minutes, then turn them off
          this.fanTimer = ScriptExecution.createTimer(ZonedDateTime.now().plusMinutes(fanTimerLen), function(){
            events.sendCommand(object["fans"], "OFF");
            this.fanTimer = null;
          });
        });
      } else {
        logger.info("Humidity cycle is already running.");       
      } 
    } else {
      logger.info("Humidity cycle has already ran in the past " + cycleTimerLen + " minutes.");   
    }
  } else if (object["currentHumid"] > object["desiredHumid"]) {
    if (object["relay"].getState() == "ON") { events.sendCommand(object["relay"], "OFF"); }
  } else {
    logger.info("Humidtiy in range.");
  }
}