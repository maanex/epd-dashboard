

export namespace Easings {

  export function easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
  }

  export function easeInQuart(x: number): number {
    return x * x * x * x;
  }

  export function easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
  }

  export function easeInCubic(x: number): number {
    return x * x * x;
  }

  export function easeOutQuad(x: number): number {
    return 1 - (1 - x) * (1 - x);
  }

  export function easeInQuad(x: number): number {
    return x * x;
  }

}
