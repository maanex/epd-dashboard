
#ifndef _DISPLAY_H_
#define _DISPLAY_H_


extern int disp_init(void);

extern int disp_clear(void);

extern int disp_print_raw(const char* text);

extern UBYTE* disp_raw_begin(const int w, const int h);
extern void disp_raw_stream_pixels(char* pixels, const int w, const int h, const int offset);

extern void disp_raw_render_full(void);
extern void disp_raw_render_part(int x, int y, int w, int h);

extern void disp_init_full(void);
extern void disp_init_part(void);

#endif
