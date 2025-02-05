/* Includes ------------------------------------------------------------------*/
#include "DEV_Config.h"
#include "EPD.h"
#include "network.h"
#include "display.h"
#include <stdlib.h>


void on_message(int mode, int length, byte* message) {
  if (mode == MODE_FULL) {
    printf("Full! Length: %s\n", length);
    // disp_raw_begin(800, 480);
    // for (int i = 0; i < length; i++) {
      // disp_raw_stream_pixels(&message[i], 800, 480, i);
      // printf("%hhx,", message[i]);
    // }
    // disp_raw_render();
  } else if (mode == MODE_PART) {
    printf("PART!\n");
  }
}

int setup_success = 0;

void setup() {
  printf("Init\r\n");
  DEV_Delay_ms(500);

  printf("Display Init\r\n");
  disp_init();
  DEV_Delay_ms(500);

  printf("Printing connect text\r\n");
  disp_print_raw("Connecting to WiFi...");
  DEV_Delay_ms(500);

  // Network
  net_provide_callback(on_message);
  int net_init_res;
  if ((net_init_res = net_init()) != 0) {
    if (net_init_res == ERROR_WIFI_TIMEOUT) {
      disp_print_raw(" WIFI CONNECTION TIMEOUT ");
    } else if (net_init_res == ERROR_MQTT_TIMEOUT) {
      disp_print_raw(" MQTT CONNECTION TIMEOUT ");
    } else {
      disp_print_raw(" UNKNOWN ERROR ON WIFI INIT! ");
    }
    DEV_Delay_ms(50000);
    disp_clear();
    return;
  }

  disp_print_raw("   WiFi connected!   ");
  DEV_Delay_ms(3000);
  disp_clear();

  DEV_Delay_ms(500);
  setup_success = 1;
  return;
}

void loop() {
  if (!setup_success) {
    return;
  }

  if (net_loop() != 0) {
    disp_print_raw(" ERROR ON WIFI INIT! ");
    DEV_Delay_ms(50000);
    disp_clear();
    return;
  }
}
