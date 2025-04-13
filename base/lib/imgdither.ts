

const bayerMatrix = [
  [  0,  8,  2, 10 ],
  [ 12,  4, 14,  6 ],
  [  3, 11,  1,  9 ],
  [ 15,  7, 13,  5 ]
]

export function orderedDither(imageData: Buffer, width: number, height: number) {
  const matrixSize = 4
  const matrixScale = 16

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const gray = 0.3 * imageData[i] + 0.59 * imageData[i+1] + 0.11 * imageData[i+2]
      const threshold = bayerMatrix[y % matrixSize][x % matrixSize] * 255 / matrixScale
      const value = gray > threshold ? 255 : 0
      imageData[i] = imageData[i+1] = imageData[i+2] = value
    }
  }

  return imageData
}

