#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"

#define HEIGHT EPD_7IN5_V2_HEIGHT
#define WIDTH EPD_7IN5_V2_WIDTH

//

UBYTE *ImageBuffer;

//

int disp_init(void) {
  DEV_Module_Init();

  printf("e-Paper Init and Clear...\r\n");
  // EPD_7IN5_V2_Clear();

  UWORD Imagesize = ((WIDTH % 8 == 0) ? (WIDTH / 8 ) : (WIDTH / 8 + 1)) * HEIGHT;
  if ((ImageBuffer = (UBYTE *)malloc(Imagesize)) == NULL) {
    printf("Failed to apply for black memory...\r\n");
    while (1);
  }

  return 0;
}

int disp_clear(void) {
  EPD_7IN5_V2_Init();
  EPD_7IN5_V2_Clear();
  return 0;
}

int disp_print_raw(const char* text) {
  sFONT* font = &Font24;

  EPD_7IN5_V2_Init_Part();

  int w = strlen(text) * font->Width;
  int x = (WIDTH - w > 10) ? (WIDTH - w) / 2 : 0;
  int h = font->Height;
  int y = (HEIGHT - h) / 2;

  Paint_NewImage(ImageBuffer, w, h, 0, WHITE);
  Paint_SelectImage(ImageBuffer);
  Paint_Clear(WHITE);

  Paint_DrawString_EN(0, 0, text, font, WHITE, BLACK);
  Paint_DrawLine(1, 1, w-1, 1, BLACK, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);
  Paint_DrawLine(1, h-1, w-1, h-1, BLACK, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);
  Paint_DrawLine(1, 1, 1, h-1, BLACK, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);
  Paint_DrawLine(w-1, 1, w-1, h-1, BLACK, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);

  int correctedX = (x % 8 == 0) ? x : x - (x % 8);
  EPD_7IN5_V2_Display_Part(ImageBuffer, correctedX, y, correctedX + w, y + h);
  return 0;
}

UBYTE* disp_raw_begin(const int w, const int h) {
  Paint_NewImage(ImageBuffer, w, h, 0, WHITE);
  Paint_SelectImage(ImageBuffer);
  Paint_Clear(WHITE);
  return ImageBuffer;
}

void disp_raw_stream_pixels(uint8_t* pixels, const int w, const int h, const int offset) {
  int x = 0;
  int y = 0;
  int val = 0;
  for (int i = 0; i < 8; i++) {
    x = (offset*8 + i) % WIDTH;
    y = (offset*8 + i) / WIDTH;
    val = (pixels[0] >> i) & 1;
    Paint_SetPixel(x, y, val == 0 ? BLACK : WHITE);
  }
}

void disp_raw_render_full(void) {
  EPD_7IN5_V2_Display(ImageBuffer);
  EPD_7IN5_V2_Sleep();
  printf("Display going to sleep...\r\n");
}

void disp_raw_render_part(int x, int y, int w, int h) {
  EPD_7IN5_V2_Display_Part(ImageBuffer, x, y, x + w, y + h);
  EPD_7IN5_V2_Sleep();
  printf("Display going to sleep...\r\n");
}

void disp_init_full(void) {
  EPD_7IN5_V2_Init();
}

void disp_init_part(void) {
  EPD_7IN5_V2_Init_Part();
}
