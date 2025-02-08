#include <WiFi.h>
#include <AsyncMqttClient.h>
extern "C" {
	#include "freertos/FreeRTOS.h"
	#include "freertos/timers.h"
}

#include "network.h"
#include "env.h"

//

const unsigned int MQTT_MAX_MES_LEN = 8 * 1024;
const char* MQTT_TOP_FULL = "epddash/up/full";
const char* MQTT_TOP_PART = "epddash/up/part";

const char* WIFI_SSID = ENV(ENV_WIFI_SSID);
const char* WIFI_PASS = ENV(ENV_WIFI_PASS);
const char* MQTT_HOST = ENV(ENV_MQTT_HOST);
const int MQTT_PORT = 1883;

AsyncMqttClient mqttClient;
TimerHandle_t mqttReconnectTimer;
TimerHandle_t wifiReconnectTimer;


//

std::function<void(int, size_t, size_t, bool, char*)> callbackFn;

void net_provide_callback(std::function<void(int, size_t, size_t, bool, char*)> callback) {
  callbackFn = callback;
}

//








void connectToWifi() {
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void connectToMqtt() {
  Serial.println("Connecting to MQTT...");
  mqttClient.connect();
}

void WiFiEvent(WiFiEvent_t event) {
    Serial.printf("[WiFi-event] event: %d\n", event);
    switch(event) {
    case SYSTEM_EVENT_STA_GOT_IP:
        Serial.println("WiFi connected");
        Serial.println("IP address: ");
        Serial.println(WiFi.localIP());
        connectToMqtt();
        break;
    case SYSTEM_EVENT_STA_DISCONNECTED:
        Serial.println("WiFi lost connection");
        xTimerStop(mqttReconnectTimer, 0); // ensure we don't reconnect to MQTT while reconnecting to Wi-Fi
        xTimerStart(wifiReconnectTimer, 0);
        break;
    }
}

void onMqttConnect(bool sessionPresent) {
  Serial.println("Connected to MQTT.");

  mqttClient.subscribe("epddash/up/full", 2);
  mqttClient.subscribe("epddash/up/part", 2);
}

void onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
  Serial.println("Disconnected from MQTT.");

  if (WiFi.isConnected()) {
    xTimerStart(mqttReconnectTimer, 0);
  }
}

void onMqttMessage(char* topic, char* payload, AsyncMqttClientMessageProperties properties, size_t len, size_t index, size_t total) {
  if (!callbackFn) {
    return;
  }

  String strTopic = String(topic);
  bool done = (index + len) >= total;
  if (strTopic == MQTT_TOP_FULL) {
    callbackFn(MODE_FULL, len, index, done, payload);
  } else if (strTopic == MQTT_TOP_PART) {
    callbackFn(MODE_PART, len, index, done, payload);
  }
}

int net_init(void) {
  Serial.begin(115200);
  Serial.println();
  Serial.println();

  mqttReconnectTimer = xTimerCreate("mqttTimer", pdMS_TO_TICKS(2000), pdFALSE, (void*)0, reinterpret_cast<TimerCallbackFunction_t>(connectToMqtt));
  wifiReconnectTimer = xTimerCreate("wifiTimer", pdMS_TO_TICKS(2000), pdFALSE, (void*)0, reinterpret_cast<TimerCallbackFunction_t>(connectToWifi));

  WiFi.onEvent(WiFiEvent);

  mqttClient.onConnect(onMqttConnect);
  mqttClient.onDisconnect(onMqttDisconnect);
  mqttClient.onMessage(onMqttMessage);
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);

  connectToWifi();
  return 0; // ok
}

