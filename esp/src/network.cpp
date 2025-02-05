#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>

#include "network.h"
#include "env.h"

//

const unsigned int MQTT_MAX_MES_LEN = 8 * 1024;
const char* MQTT_TOP_FULL = "epddash/up/full";
const char* MQTT_TOP_PART = "epddash/up/part";

const char* WIFI_SSID = ENV(ENV_WIFI_SSID);
const char* WIFI_PASS = ENV(ENV_WIFI_PASS);
const char* MQTT_HOST = ENV(ENV_MQTT_HOST);

WiFiClient espClient;
PubSubClient client(espClient);

//

std::function<void(int, int, byte*)> callbackFn;

void net_provide_callback(std::function<void(int, int, byte*)> callback) {
  callbackFn = callback;
}

//

void callback(char* topic, byte* message, unsigned int length) {
  if (!callbackFn) {
    return;
  }

  String messageTemp;
  for (int i = 0; i < min(length, MQTT_MAX_MES_LEN); i++) {
    messageTemp += (char)message[i];
  }

  String strTopic = String(topic);
  printf("%s - %s\n", strTopic, messageTemp.c_str());
  if (strTopic == MQTT_TOP_FULL) {
    printf("FULL\n");
    callbackFn(MODE_FULL, min(length, MQTT_MAX_MES_LEN), message);
  } else if (strTopic == MQTT_TOP_PART) {
    printf("PART\n");
    callbackFn(MODE_PART, min(length, MQTT_MAX_MES_LEN), message);
  }
}

int reconnect_mqtt(void) {
  int attempt = 0;

  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("epddash")) {
      Serial.println("connected");
      // Subscribe
      client.subscribe(MQTT_TOP_FULL);
      client.subscribe(MQTT_TOP_PART);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }

    if (attempt++ > 10) {
      return ERROR_MQTT_TIMEOUT;
    }
  }

  return 0;
}

//

int net_init(void) {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("Connecting to %s \n", WIFI_SSID);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    if (attempts++ > 30) {
      return ERROR_WIFI_TIMEOUT;
    }
  }

  Serial.println("Wifi connected");

  client.setServer(MQTT_HOST, 1883);
  client.setCallback(callback);

  if (reconnect_mqtt() != 0) {
    return ERROR_MQTT_TIMEOUT;
  }

  return 0; // ok
}

int net_loop(void) {
  if (!client.connected()) {
    if (reconnect_mqtt() != 0) {
      return ERROR_MQTT_TIMEOUT;
    }
  }

  client.loop();

  return 0;
}
