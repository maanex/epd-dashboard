

export namespace TextUtils {

  export function sliceIntoNewlines(text: string, lineLength: number) {
    if (lineLength <= 0)
      return [text]

    const lines = []
    while (text.length > lineLength) {
      const i = text.lastIndexOf(' ', lineLength)
      if (i === -1) {
        lines.push(text.slice(0, lineLength))
        text = text.slice(lineLength)
      } else {
        lines.push(text.slice(0, i))
        text = text.slice(i + 1)
      }
    }
    lines.push(text)
    return lines
  }

}
