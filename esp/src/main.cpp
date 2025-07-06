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
  delay(3000);
  Serial.println("Now for real!");

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

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected.");
    float temp = bmp.readTemperature();
    Serial.print("Temperature: ");
    Serial.println(temp);

    char fullUrl[256];
    snprintf(fullUrl, sizeof(fullUrl), "http://%s:3000/?temp=%.2f", IMG_URL, temp);
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
      while (http.connected() && stream->available()) {
        uint8_t buffer[128];
        size_t len = stream->readBytes(buffer, sizeof(buffer));

        for (int i = 0; i < len; i++) {
          disp_raw_stream_pixels(&buffer[i], 800, 480, i + position);
        }
        position += len;
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

  sleep(500);
  WiFi.disconnect(true);
  EPD_7IN5_V2_Sleep();
  Serial.println("Entering deep sleep for 10 minutes...");
  esp_sleep_enable_timer_wakeup(10 * 60 * 1000000ULL); // 10 min
  esp_deep_sleep_start();
}

void loop() {}
