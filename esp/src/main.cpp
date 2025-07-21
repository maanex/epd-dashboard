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
const char* DEV_ID = ENV(ENV_DEV_ID);

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

  uint8_t sleepMinutes = 5;
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected.");
    float temp = bmp.readTemperature();
    Serial.print("Temperature: ");
    Serial.println(temp);

    char fullUrl[256];
    snprintf(fullUrl, sizeof(fullUrl), "http://%s:3034/r?temp=%.2f", IMG_URL, temp);
    Serial.print("Requesting image from: ");
    Serial.println(fullUrl);

    HTTPClient http;
    http.begin(fullUrl);
    int httpCode = http.GET();
    Serial.print("HTTP GET response: ");
    Serial.println(httpCode);

    if (httpCode >= 200 && httpCode < 300) {
      WiFiClient* stream = http.getStreamPtr();

      Serial.println("Started image streaming...");

      int headPosition = 0; // position in the stream (only updated when reading header)
      int writePosition = 0; // position in the display buffer

      uint8_t opCode = 99; // 99 is invalid opcode
      uint8_t partialBoundingX = 0;
      uint8_t partialBoundingY = 0;
      uint8_t partialBoundingW = 0;
      uint8_t partialBoundingH = 0;
      bool headerComplete = false;

      while (http.connected() && stream->available()) {
        uint8_t buffer[128];
        size_t len = stream->readBytes(buffer, sizeof(buffer));
        int buffPosition = 0; // position in the current buffer

        if (len <= 0) {
          continue;
        }

        if (headPosition == 0 && len > buffPosition) {
          uint8_t header = buffer[buffPosition];
          buffPosition++;
          headPosition++;
          if ((header >> 3) != 0b11101) {
            Serial.println("Invalid magic number header, aborting...");
            break;
          }

          opCode = header & 0b111;

          if (opCode == 0) {
            Serial.println("Op: Noop");
            headerComplete = true;
            break;
          } else if (opCode == 1) {
            Serial.println("Op: Full");
            disp_init_full();
            disp_raw_begin(800, 480);
            headerComplete = true;
          } else if (opCode == 2) {
            Serial.println("Op: Part");
          } else {
            Serial.printf("Unknown opcode: %u, skipping...\n", opCode);
            continue;
          }
        }

        // read sleep minutes regardless of opcode
        if (headPosition == 1 && len > buffPosition) {
          sleepMinutes = buffer[buffPosition];
          buffPosition++;
          headPosition++;
          if (sleepMinutes == 0 || sleepMinutes > 4*60) {
            sleepMinutes = 10;
          }
          Serial.printf("Sleep minutes set to: %u\n", sleepMinutes);
        }

        // if we are doing a partial update, we need to read the bounding box
        if (opCode == 2) {
          if (headPosition == 2 && len > buffPosition) {
            partialBoundingX = buffer[buffPosition];
            buffPosition++;
            headPosition++;
          } else if (headPosition == 3 && len > buffPosition) {
            partialBoundingY = buffer[buffPosition];
            buffPosition++;
            headPosition++;
          } else if (headPosition == 4 && len > buffPosition) {
            partialBoundingW = buffer[buffPosition];
            buffPosition++;
            headPosition++;
          } else if (headPosition == 5 && len > buffPosition) {
            partialBoundingH = buffer[buffPosition];
            buffPosition++;
            headPosition++;
            disp_init_part();
            disp_raw_begin(partialBoundingW, partialBoundingH);
            headerComplete = true;
          }
        }

        // no more data left in the buffer, load more
        if (len <= buffPosition) {
          continue;
        }

        // data left to read but header not complete... this should never happen
        if (!headerComplete) {
          Serial.println("Header not complete, waiting for more data...");
          continue;
        }

        // iterate all remaining bytes in the buffer and write to the display
        for (size_t i = buffPosition; i < len; i++) {
          disp_raw_stream_pixels(&buffer[i], 800, 480, writePosition++);
        }
      }

      if (headerComplete) {
        if (opCode == 1) {
          disp_raw_render_full();
        Serial.println("Full image rendered.");
        } else if (opCode == 2) {
          disp_raw_render_part(partialBoundingX, partialBoundingY, partialBoundingW, partialBoundingH);
        Serial.println("Partial image rendered.");
        }
      } else {
        Serial.println("Header not complete, image rendering aborted.");
      }
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
