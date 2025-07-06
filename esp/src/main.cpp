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
const char* IMG_URL = ENV(ENV_IMG_URL);


Adafruit_BMP085 bmp;

void setup() {
  Serial.begin(115200);

  disp_init_full();
  bmp.begin();
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(500);
  }

  if (WiFi.status() == WL_CONNECTED) {
    float temp = bmp.readTemperature();
    char fullUrl[256];
    snprintf(fullUrl, sizeof(fullUrl), "%s?temp=%.2f", IMG_URL, temp);

    HTTPClient http;
    http.begin(fullUrl);
    int httpCode = http.GET();
    if (httpCode > 0) {
      WiFiClient* stream = http.getStreamPtr();

      disp_raw_begin(800, 480);
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
    }
    http.end();
  }

  WiFi.disconnect(true);
  esp_sleep_enable_timer_wakeup(10 * 60 * 1000000ULL); // 10 min
  esp_deep_sleep_start();
}

void loop() {}

