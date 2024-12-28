import { Device, DeviceId } from "./Property";
import { MqttController } from "./MqttController";
import { DeviceStore } from "./DeviceStore";
import { EchoNetLiteController } from "./EchoNetLiteController";
import { RestApiController } from "./RestApiController";
import fs from "fs";
import mqtt from "mqtt";
import { SystemStatusRepositry } from "./ApiTypes";
import { EventRepository } from "./EventRepository";
import { LogRepository } from "./LogRepository";

let echonetTargetNetwork = "";
let echonetIntervalToGetProperties = 100;
let debugLog = false;
let restApiPort = 3000;
let restApiHost = "0.0.0.0";
let mqttBroker = "";
let mqttOptionFile = "";
let mqttBaseTopic = "echonetlite2mqtt/elapi/v1/devices";
let mqttCaFile = "";
let mqttCertFile = "";
let mqttKeyFile = "";

if (
  "ECHONET_TARGET_NETWORK" in process.env &&
  process.env.ECHONET_TARGET_NETWORK !== undefined
) {
  echonetTargetNetwork = process.env.ECHONET_TARGET_NETWORK.replace(/^"/g, "").replace(/"$/g, "");
}
if (
  "ECHONET_INTERVAL_TO_GET_PROPERTIES" in process.env &&
  process.env.ECHONET_INTERVAL_TO_GET_PROPERTIES !== undefined
) {
  const tempText = process.env.ECHONET_INTERVAL_TO_GET_PROPERTIES.replace(/^"/g, "").replace(/"$/g, "");
  const tempNo = Number(tempText);
  if(isNaN(tempNo) === false)
  {
    echonetIntervalToGetProperties = tempNo;
  }
}


if ("DEBUG" in process.env && process.env.DEBUG !== undefined) {
  debugLog =
    process.env.DEBUG.toUpperCase() === "TRUE" || process.env.DEBUG === "1" || 
    process.env.DEBUG.toUpperCase() === "\"TRUE\"" || process.env.DEBUG === "\"1\"";
}

if("REST_API_PORT" in process.env && process.env.REST_API_PORT !== undefined)
{
  const tempNo = Number(process.env.REST_API_PORT.replace(/^"/g, "").replace(/"$/g, ""));
  if(isNaN(tempNo)===false)
  {
    restApiPort = tempNo;
  }
}
if("REST_API_HOST" in process.env && process.env.REST_API_HOST !== undefined)
{
  restApiHost = process.env.REST_API_HOST.replace(/^"/g, "").replace(/"$/g, "");
}
if("MQTT_BROKER" in process.env && process.env.MQTT_BROKER !== undefined)
{
  mqttBroker = process.env.MQTT_BROKER.replace(/^"/g, "").replace(/"$/g, "");
}
if("MQTT_OPTION_FILE" in process.env && process.env.MQTT_OPTION_FILE !== undefined)
{
  mqttOptionFile = process.env.MQTT_OPTION_FILE.replace(/^"/g, "").replace(/"$/g, "");
}
if("MQTT_BASE_TOPIC" in process.env && process.env.MQTT_BASE_TOPIC !== undefined)
{
  mqttBaseTopic = process.env.MQTT_BASE_TOPIC.replace(/^"/g, "").replace(/"$/g, "");
}
if("MQTT_CA_FILE" in process.env && process.env.MQTT_CA_FILE !== undefined)
{
  mqttCaFile = process.env.MQTT_CA_FILE.replace(/^"/g, "").replace(/"$/g, "");
}
if("MQTT_CERT_FILE" in process.env && process.env.MQTT_CERT_FILE !== undefined)
{
  mqttCertFile = process.env.MQTT_CERT_FILE.replace(/^"/g, "").replace(/"$/g, "");
}
if("MQTT_KEY_FILE" in process.env && process.env.MQTT_KEY_FILE !== undefined)
{
  mqttKeyFile = process.env.MQTT_KEY_FILE.replace(/^"/g, "").replace(/"$/g, "");
}

for(var i = 2;i < process.argv.length; i++){
  const name = process.argv[i].toLowerCase();
  const value = i + 1 < process.argv.length ? process.argv[i+1] : "";

  if(name === "--debug".toLowerCase())
  {
    debugLog = true;
  }

  if(value === "")
  {
    continue;
  }

  if(name === "--echonetTargetNetwork".toLowerCase())
  {
    echonetTargetNetwork = value.replace(/^"/g, "").replace(/"$/g, "");
  }
  if(name === "--echonetIntervalToGetProperties".toLowerCase())
  {
    const tempText = value.replace(/^"/g, "").replace(/"$/g, "");
    const tempNo = Number(tempText);
    if(isNaN(tempNo) === false)
    {
      echonetIntervalToGetProperties = tempNo;
    }
  }
  if(name === "--RestApiPort".toLowerCase())
  {
    const tempNo = Number(value.replace(/^"/g, "").replace(/"$/g, ""));
    if(isNaN(tempNo)===false)
    {
      restApiPort = tempNo;
    }
  }
  if(name === "--RestApiHost".toLowerCase())
  {
    restApiHost = value.replace(/^"/g, "").replace(/"$/g, "");
  }
  if(name === "--MqttBroker".toLowerCase())
  {
    mqttBroker = value.replace(/^"/g, "").replace(/"$/g, "");
  }
  if(name === "--MqttOptionFile".toLowerCase())
  {
    mqttOptionFile = value.replace(/^"/g, "").replace(/"$/g, "");
  }
  if(name === "--MqttBaseTopic".toLowerCase())
  {
    mqttBaseTopic = value.replace(/^"/g, "").replace(/"$/g, "");
  }
  if(name === "--MqttCaFile".toLowerCase())
  {
    mqttCaFile = value.replace(/^"/g, "").replace(/"$/g, "");
  }
  if(name === "--MqttCertFile".toLowerCase())
  {
    mqttCertFile = value.replace(/^"/g, "").replace(/"$/g, "");
  }
  if(name === "--MqttKeyFile".toLowerCase())
  {
    mqttKeyFile = value.replace(/^"/g, "").replace(/"$/g, "");
  }
}



const logger = new LogRepository();


console.log(`${process.env.npm_package_name} ver.${process.env.npm_package_version}`);
console.log("");

logger.output(`echonetTargetNetwork=${echonetTargetNetwork}`);
logger.output(`echonetIntervalToGetProperties=${echonetIntervalToGetProperties}`)
logger.output(`debugLog=${debugLog}`);
logger.output(`restApiPort=${restApiPort}`);
logger.output(`restApiHost=${restApiHost}`);
logger.output(`mqttBroker=${mqttBroker}`);
logger.output(`mqttOptionFile=${mqttOptionFile}`);
logger.output(`mqttBaseTopic=${mqttBaseTopic}`);
logger.output(`mqttCaFile=${mqttCaFile}`);
logger.output(`mqttCertFile=${mqttCertFile}`);
logger.output(`mqttKeyFile=${mqttKeyFile}`);


let mqttOption:mqtt.IClientOptions = {
  port:1883
};

if(mqttOptionFile !== "" && fs.existsSync(mqttOptionFile))
{
  const mqttOptionText = fs.readFileSync(mqttOptionFile, {encoding: "utf-8"});
  mqttOption = JSON.parse(mqttOptionText) as mqtt.IClientOptions;
}

if(mqttCaFile !== "" && fs.existsSync(mqttCaFile))
{
  mqttOption.ca = fs.readFileSync(mqttCaFile, {encoding:"utf-8"});
  logger.output(`load ${mqttCaFile}`)
}
if(mqttCertFile !== "" && fs.existsSync(mqttCertFile))
{
  mqttOption.cert = fs.readFileSync(mqttCertFile, {encoding:"utf-8"});
  logger.output(`load ${mqttCertFile}`)
}
if(mqttKeyFile !== "" && fs.existsSync(mqttKeyFile))
{
  mqttOption.key = fs.readFileSync(mqttKeyFile, {encoding:"utf-8"});
  logger.output(`load ${mqttKeyFile}`)
}

const eventRepository = new EventRepository();

const systemStatusRepository = new SystemStatusRepositry();

const deviceStore = new DeviceStore();

const echoNetListController = new EchoNetLiteController(echonetTargetNetwork, echonetIntervalToGetProperties);

echoNetListController.addDeviceDetectedEvent(()=>{
  const deviceIds = echoNetListController.getDetectedDeviceIds();
  for(const deviceId of deviceIds)
  {
    if(deviceStore.exists(deviceId.id)===false)
    {
      const device = echoNetListController.getDevice(deviceId);
      if(device!==undefined)
      {
        logger.output(`[ECHONETLite] new device ${device.id} ${device.deviceType} ${device.ip} ${device.eoj}`);
        //console.dir(device, {depth:10});
        deviceStore.add(device);
        mqttController.publishDevices();
        mqttController.publishDevice(device.id);
        mqttController.publishDevicePropertiesAndAllProperty(device.id);
        eventRepository.newEvent(`${device.id}`);
        eventRepository.newEvent(`SYSTEM`);
        eventRepository.newEvent(`LOG`);
        restApiController.setNewEvent();
      }
    }
  }
});

echoNetListController.addPropertyChnagedEvent((id:DeviceId, propertyName:string, newValue:any):void =>{
  
  const oldValue = deviceStore.getProperty(id.id, propertyName);
  if(oldValue===undefined){
    return;
  }

  deviceStore.changeProperty(id.id, propertyName, newValue);
  mqttController.publishDeviceProperties(id.id);
  mqttController.publishDeviceProperty(id.id, propertyName);
  eventRepository.newEvent(`${id.id}`);
  if(JSON.stringify(oldValue) !== JSON.stringify(newValue))
  {
    logger.output(`[ECHONETLite] prop changed: ${id.id} ${id.ip} ${id.eoj} ${propertyName} ${newValue}`);
    eventRepository.newEvent(`LOG`);
    restApiController.setNewEvent();
  }
});

const restApiController = new RestApiController(deviceStore, systemStatusRepository, eventRepository, logger, restApiHost, restApiPort);
restApiController.addPropertyChangedRequestEvent((deviceId:string, propertyName:string, newValue:any):void=>{

  const device = deviceStore.get(deviceId);
  if(device === undefined){
    return;
  }

  if (propertyName === 'multiple') {
    logger.output(`[RESTAPI] property changed id:${deviceId}, values:${JSON.stringify(newValue)}`);
    eventRepository.newEvent(`LOG`);
  
    echoNetListController.setDeviceProperties({id: deviceId, ip: device.ip, eoj:device.eoj}, newValue);
  } else {
    logger.output(`[RESTAPI] property changed id:${deviceId}, property:${propertyName}, value:${newValue.toString()}`);
    eventRepository.newEvent(`LOG`);
  
    echoNetListController.setDeviceProperty({id: deviceId, ip: device.ip, eoj:device.eoj}, propertyName, newValue);
  }
});
restApiController.addPropertyRequestedRequestEvent((deviceId:string, propertyName:string):void=>{
  const device = deviceStore.get(deviceId);
  if(device === undefined){
    logger.output('[RESTAPI] device not found : ' + deviceId)
    return;
  }
  if((propertyName in device.propertiesValue)===false)
  {
    logger.output('[RESTAPI] property not found : ' + propertyName)
    return;
  }

  logger.output(`[RESTAPI] property reuqested id:${deviceId}, property:${propertyName}`);
  eventRepository.newEvent(`LOG`);

  echoNetListController.requestDeviceProperty({id: deviceId, ip: device.ip, eoj:device.eoj}, propertyName);
});

const mqttController = new MqttController(deviceStore, mqttBroker, mqttOption, mqttBaseTopic);
mqttController.addPropertyChnagedEvent((deviceId:string, propertyName:string, value:any):void=>{
  const device = deviceStore.get(deviceId);
  if(device === undefined){
    logger.output('[MQTT] device not found : ' + deviceId)
    return;
  }
  if (propertyName === 'multiple') {
    logger.output(`[MQTT] property changed id:${deviceId}, values:${JSON.stringify(value)}`);
    eventRepository.newEvent(`LOG`);
  
    echoNetListController.setDeviceProperties({id: deviceId, ip: device.ip, eoj:device.eoj}, value);
  } else {
    if((propertyName in device.propertiesValue)===false)
    {
      logger.output('[MQTT] property not found : ' + propertyName)
      return;
    }

    logger.output(`[MQTT] property changed id:${deviceId}, property:${propertyName}, value:${value.toString()}`);
    eventRepository.newEvent(`LOG`);
  
    echoNetListController.setDeviceProperty({id: deviceId, ip: device.ip, eoj:device.eoj}, propertyName, value);
  }
});
mqttController.addPropertyRequestedEvent((deviceId:string, propertyName:string):void=>{
  const device = deviceStore.get(deviceId);
  if(device === undefined){
    logger.output('[MQTT] device not found : ' + deviceId)
    return;
  }
  if((propertyName in device.propertiesValue)===false)
  {
    logger.output('[MQTT] property not found : ' + propertyName)
    return;
  }

  logger.output(`[MQTT] property reuqested id:${deviceId}, property:${propertyName}`);
  eventRepository.newEvent(`LOG`);

  echoNetListController.requestDeviceProperty({id: deviceId, ip: device.ip, eoj:device.eoj}, propertyName);
});


mqttController.addConnectionStateChangedEvent(():void=>{
  systemStatusRepository.SystemStatus.mqttState = mqttController.ConnectionState;
  logger.output(`[MQTT] ${mqttController.ConnectionState}`);
  eventRepository.newEvent(`SYSTEM`);
  eventRepository.newEvent(`LOG`);
  restApiController.setNewEvent();
});


echoNetListController.start();
restApiController.start();
if(mqttBroker !== "")
{
  mqttController.start();
}
else
{
  logger.output(`[MQTT] mqttBroker is not configured.`);
}

