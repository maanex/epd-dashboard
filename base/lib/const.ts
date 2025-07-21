

export namespace Const {

  export const ScreenWidth = 800
  export const ScreenHeight = 480

  export const MaxPixelsForPartialUpdate = 70_000

  export const OpNoop = 0b000 // no operation
  export const OpFull = 0b001 // full update
  export const OpPart = 0b010 // partial update

}
