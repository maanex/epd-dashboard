#include "DEV_Config.h"
#include "EPD.h"
#include "display.h"
#include "env.h"
#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_sleep.h>

const char* WIFI_SSID = ENV(ENV_WIFI_SSID);
const char* WIFI_PASS = ENV(ENV_WIFI_PASS);
const char* IMG_URL = ENV(ENV_IMG_HOST);

Adafruit_BMP085 bmp;

void setup() {
  Serial.begin(115200);
  Serial.println("Booting...");

  disp_init();
  delay(500);
  Serial.println("Display initialized.");

  if (!bmp.begin()) {
    Serial.println("BMP085 sensor init failed!");
  } else {
    Serial.println("BMP085 sensor initialized.");
  }

  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  uint8_t sleepMinutes = 15;
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected.");
    float temp = bmp.readTemperature();
    Serial.print("Temperature: ");
    Serial.println(temp);

    char fullUrl[256];
    snprintf(fullUrl, sizeof(fullUrl), "http://%s:3000/r?temp=%.2f", IMG_URL, temp);
    Serial.print("Requesting image from: ");
    Serial.println(fullUrl);

    HTTPClient http;
    http.begin(fullUrl);
    int httpCode = http.GET();
    Serial.print("HTTP GET response: ");
    Serial.println(httpCode);

    if (httpCode > 0) {
      WiFiClient* stream = http.getStreamPtr();

      disp_raw_begin(800, 480);
      Serial.println("Started image streaming...");

      int position = 0;
      bool firstByteRead = false;
      while (http.connected() && stream->available()) {
        uint8_t buffer[128];
        size_t len = stream->readBytes(buffer, sizeof(buffer));

        size_t start = 0;
        if (!firstByteRead && len > 0) {
          sleepMinutes = buffer[0];
          if (sleepMinutes == 0 || sleepMinutes > 4*60) {
            sleepMinutes = 15;
          }
          firstByteRead = true;
          start = 1;
          position = 0;
        }

        for (size_t i = start; i < len; i++) {
          disp_raw_stream_pixels(&buffer[i], 800, 480, position++);
        }
      }

      disp_raw_render_full();
      Serial.println("Image rendered.");
    } else {
      Serial.println("Failed to download image.");
    }
    http.end();
  } else {
    Serial.println("WiFi connection failed.");
  }

  WiFi.disconnect(true);
  Serial.printf("Entering deep sleep for %u minutes...\n", sleepMinutes);
  delay(500);
  esp_sleep_enable_timer_wakeup(sleepMinutes * 60 * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {}
