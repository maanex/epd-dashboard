import sharp from "sharp"

async function cannyEdgeDetector(image: sharp.Sharp, width: number, height: number) {
  const pixelCount = width * height
  const imageData = new Uint8Array(pixelCount)
  const buffer = await image.raw().toBuffer()

  for (let i = 0; i < pixelCount; i++)
    imageData[i] = buffer[i]

  const work = new Float32Array(imageData)

  // Simple edge detection using a Sobel operator
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const gx =
        -work[i - width - 1] - 2 * work[i - 1] - work[i + width - 1] +
        work[i - width + 1] + 2 * work[i + 1] + work[i + width + 1]
      const gy =
        -work[i - width - 1] - 2 * work[i - width] - work[i - width + 1] +
        work[i + width - 1] + 2 * work[i + width] + work[i + width + 1]
      const magnitude = Math.sqrt(gx * gx + gy * gy)
      imageData[i] = Math.floor(Math.log(1 + magnitude / 128) * 3) * 255 / 3
    }
  }

  return imageData
}


type Option = `${'t' | 'b'}${'l' | 'c' | 'r'}`;

export async function findLeastNoisy(buffer: Buffer, boxWidth: number, boxHeight: number, padding: number, resizeImageWidth?: number, resizeImageHeight?: number, options?: Option[]) {
  options = options ?? ['tl', 'tc', 'tr', 'bl', 'bc', 'br']

  const resize = (resizeImageWidth && resizeImageHeight)
  const grey = resize
    ? sharp(buffer).grayscale().resize(resizeImageWidth, resizeImageHeight)
    : sharp(buffer).grayscale()
  const { width, height } = resize
    ? { width: resizeImageWidth, height: resizeImageHeight }
    : await grey.metadata()
  const edges = await cannyEdgeDetector(grey, width!, height!)

  let pos = options[0]
  let value = Infinity

  for (const corner of options) {
    let x = 0
    let y = 0

    if (corner[0] === 't')
      y = padding
    else if (corner[0] === 'b')
      y = height! - boxHeight - padding

    if (corner[1] === 'l')
      x = padding
    else if (corner[1] === 'c')
      x = Math.round((width! - boxWidth) / 2)
    else if (corner[1] === 'r')
      x = width! - boxWidth - padding

    let currVal = 0
    for (let xi = x; xi < x + boxWidth; xi++) {
      for (let yi = y; yi < y + boxHeight; yi++)
        currVal += edges[yi * width! + xi]
    }

    // prioritize lower corners
    if (corner[0] === 'b')
      currVal *= 0.9
    // prioritize center position
    if (corner[1] === 'c')
      currVal *= 0.9

    if (currVal < value) {
      value = currVal
      pos = corner
    }
  }

  console.log(`Least noisy position: ${pos} with value ${value}`)
  return {
    position: pos,
    x: pos[1] === 'l' ? padding : pos[1] === 'c' ? Math.round((width! - boxWidth) / 2) : width! - boxWidth - padding,
    y: pos[0] === 't' ? padding : height! - boxHeight - padding
  }
}
