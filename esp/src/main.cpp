/* Includes ------------------------------------------------------------------*/
#include "DEV_Config.h"
#include "EPD.h"
#include "network.h"
#include "display.h"
#include <stdlib.h>


int part_x = 0;
int part_y = 0;
int part_w = 0;
int part_h = 0;
int current_mode = -1;

void on_message(int mode, size_t length, size_t index, bool done, char* message) {
  if (mode == MODE_FULL) {
    if (current_mode != MODE_FULL) {
      current_mode = MODE_FULL;
      disp_init_full();
    }

    printf("Full! Length: %d\n", length);
    if (index == 0) {
      disp_raw_begin(800, 480);
    }

    for (int i = 0; i < length; i++) {
      disp_raw_stream_pixels(&message[i], 800, 480, i + index);
    }

    if (done) {
      disp_raw_render_full();
    }
  } else if (mode == MODE_PART) {
    if (current_mode != MODE_PART) {
      current_mode = MODE_PART;
      disp_init_part();
    }

    if (index == 0) {
      part_x = message[0] << 8 | message[1];
      part_y = message[2] << 8 | message[3];
      part_w = message[4] << 8 | message[5];
      part_h = message[6] << 8 | message[7];

      printf("Part! x: %d, y: %d, w: %d, h: %d\n", part_x, part_y, part_w, part_h);

      disp_raw_begin(part_w, part_h);

      for (int i = 8; i < length; i++) {
        disp_raw_stream_pixels(&message[i], part_w, part_h, i + index - 8);
      }
    } else {
      for (int i = 0; i < length; i++) {
        disp_raw_stream_pixels(&message[i], part_w, part_h, i + index);
      }
    }

    if (done) {
      disp_raw_render_part(part_x, part_y, part_w, part_h);
    }
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

  // if (net_loop() != 0) {
  //   disp_print_raw(" ERROR ON WIFI INIT! ");
  //   DEV_Delay_ms(50000);
  //   disp_clear();
  //   return;
  // }
}
