
# Screenshot

![screenshot](./output/front.jpg)


## Protocol

```
    Op Code       Op Payload
     ┌┴┐          ┌──┴──── ─ ─
11101000 00000000 00000000 ...
└─┬─┘    └──┬───┘
Header   Sleep Minutes
```

Op Codes:
- `0b000` **NOOP**: Do nothing
- `0b001` **FULL**: Full update, payload is image data from top left to bottom right
- `0b010` **PART**: Partial update,
  * payload bytes 0+1 -> x coordinate of left edge
  * payload bytes 2+3 -> y coordinate of top edge
  * payload bytes 4+5 -> width of box
  * payload bytes 6+7 -> height of box
  * payload bytes from 8 -> image data
