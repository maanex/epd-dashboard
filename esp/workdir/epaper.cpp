#include <SPI.h>
#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"
#include "ImageData.h"
#include <stdlib.h>

UBYTE *ImageBuffer;




void test() {
  delay(5000);
  EPD_7IN5_V2_Init_Part();
  Paint_Clear(BLACK);
  for (int i = 20; i < EPD_7IN5_V2_HEIGHT; i += 20) {
    EPD_7IN5_V2_Display_Part(ImageBuffer, 0, i - 20, EPD_7IN5_V2_WIDTH, i);
    delay(500);
  }
  EPD_7IN5_V2_Display_Part(ImageBuffer, 0, 0, 120, 60);
  delay(5000);
  EPD_7IN5_V2_Init();
  Paint_Clear(WHITE);
  EPD_7IN5_V2_Display(ImageBuffer);
  delay(5000);



  printf("Goto Sleep...\r\n");
  EPD_7IN5_V2_Sleep();
  free(ImageBuffer);
  ImageBuffer = NULL;
}

void loop() {}

// const long MAX_PARTIAL_UPDATES_BETWEEN_CLEARS = 90;
// long currentPartialUpdatesSinceClear = 0;
// void awaitPotentialClear() {
//   if (currentPartialUpdatesSinceClear >= MAX_PARTIAL_UPDATES_BETWEEN_CLEARS) {
//     EPD_7IN5_V2_Clear();
//     currentPartialUpdatesSinceClear = 0;
//   }
// }


void setup() {
  DEV_Module_Init();
  
  // Initialize the e-Paper display
  EPD_7IN5_V2_Init();
  EPD_7IN5_V2_Clear();
  delay(500);

  ImageBuffer = (UBYTE *)malloc(EPD_7IN5_V2_WIDTH * EPD_7IN5_V2_HEIGHT / 8);
  Paint_NewImage(ImageBuffer, EPD_7IN5_V2_WIDTH, EPD_7IN5_V2_HEIGHT, 0, WHITE);
  Paint_SelectImage(ImageBuffer);
  Paint_Clear(WHITE);
  test();
}

// unsigned long previousMillis = 0;
// const long interval = 5000; // Update every second
// int counter = 0;

// void loop() {
//   if (millis() - previousMillis < interval)
//     return;

//   if (counter > 100) return;
//   counter++;

//   awaitPotentialClear();
//   previousMillis = millis();

//   long elapsed = millis() / 1000;

//   Serial.print(("Elapsed: " + String(elapsed)).c_str());

//   Paint_ClearWindows(0, 0, EPD_7IN5_V2_WIDTH, EPD_7IN5_V2_HEIGHT, WHITE);

//   const char *text = ("Elapsed: " + String(elapsed)).c_str();

//   UWORD textWidth = strlen(text) * Font24.Width;
//   UWORD textHeight = Font24.Height;
//   UWORD x = (EPD_7IN5_V2_WIDTH - textWidth) / 2;
//   UWORD y = (EPD_7IN5_V2_HEIGHT - textHeight) / 2;

//   Paint_DrawString_EN(x, y, text, &Font24, BLACK, WHITE);
//   EPD_7IN5_V2_Display_Part(ImageBuffer, 0, 0, EPD_7IN5_V2_WIDTH, EPD_7IN5_V2_HEIGHT);
//   currentPartialUpdatesSinceClear++;
// }
