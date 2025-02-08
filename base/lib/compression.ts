

export namespace Compression {

  type Node = {
    symbol: number | null
    freq: number
    left?: Node
    right?: Node
  }
  
  function buildHuffmanTree(freq: Uint16Array): Node {
    let nodes: Node[] = []
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) nodes.push({ symbol: i, freq: freq[i] })
    }
  
    while (nodes.length > 1) {
      nodes.sort((a, b) => a.freq - b.freq)
      let left = nodes.shift()!
      let right = nodes.shift()!
      nodes.push({ symbol: null, freq: left.freq + right.freq, left, right })
    }
  
    return nodes[0]
  }
  
  function generateHuffmanCodes(node: Node, prefix: number = 0, length: number = 0, codes: Map<number, { code: number; length: number }> = new Map()) {
    if (node.symbol !== null) {
      codes.set(node.symbol, { code: prefix, length })
    } else {
      if (node.left) generateHuffmanCodes(node.left, (prefix << 1), length + 1, codes)
      if (node.right) generateHuffmanCodes(node.right, (prefix << 1) | 1, length + 1, codes)
    }
    return codes
  }
  
  export function encodeHuffman(input: Uint8Array) {
    const freq = new Uint16Array(256)
    for (const byte of input) freq[byte]++
  
    const root = buildHuffmanTree(freq)
    const codes = generateHuffmanCodes(root)
  
    let bitPos = 0
    let output = new Uint8Array(Math.ceil(input.length * 8 / 8)) // Worst case: 8x the input size
    for (const byte of input) {
      const { code, length } = codes.get(byte)!
      for (let i = length - 1; i >= 0; i--) {
        if ((code >> i) & 1) output[bitPos >> 3] |= 1 << (7 - (bitPos & 7))
        bitPos++
      }
    }
  
    return {
      compressed: output.slice(0, Math.ceil(bitPos / 8)),
      tree: root,
      bitLength: bitPos
    }
  }  

}
