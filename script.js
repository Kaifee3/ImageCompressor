document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput")
  const compressBtn = document.getElementById("compressBtn")
  const downloadBtn = document.getElementById("downloadBtn")
  const previews = document.getElementById("previews")
  const tip = document.getElementById("tip")
  let imageFiles = []
  let compressedFiles = []

  if (!fileInput || !compressBtn || !downloadBtn || !previews || !tip) {
    console.error("Missing required DOM elements.")
    return
  }

  const readFileAsDataURL = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result)
      r.onerror = rej
      r.readAsDataURL(file)
    })

  const loadImage = (src) =>
    new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.crossOrigin = "anonymous"
      img.src = src
    })

  const canvasToBlob = (canvas, type, quality) => new Promise((res) => canvas.toBlob(res, type, quality))
  const blobToFile = (blob, filename, type) => new File([blob], filename, { type })
  const makeJpegName = (name) => name.replace(/\.[^/.]+$/, "") + ".jpg"

  async function compressSingle(file, minSize, maxSize, limitWidth = 1200) {
    if (minSize === 0) {
      if (file.size <= maxSize) return file
    } else {
      if (file.size >= minSize && file.size <= maxSize) return file
    }

    const dataUrl = await readFileAsDataURL(file)
    const img = await loadImage(dataUrl)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    let targetWidth = img.width
    let targetHeight = img.height

    if (targetWidth > limitWidth) {
      const ratio = limitWidth / targetWidth
      targetWidth = limitWidth
      targetHeight = Math.floor(targetHeight * ratio)
    }

    const compressAtSize = async (width, height, quality) => {
      canvas.width = width
      canvas.height = height
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      return await canvasToBlob(canvas, "image/jpeg", quality)
    }

    if (minSize === 0) {
      return await compressUnderTarget(compressAtSize, targetWidth, targetHeight, maxSize, file)
    } else {
      return await compressToRange(compressAtSize, targetWidth, targetHeight, minSize, maxSize, file)
    }
  }

  async function compressUnderTarget(compressAtSize, targetWidth, targetHeight, maxSize, originalFile) {
    const sizesToTry = [
      { w: targetWidth, h: targetHeight },
      { w: Math.floor(targetWidth * 0.9), h: Math.floor(targetHeight * 0.9) },
      { w: Math.floor(targetWidth * 0.8), h: Math.floor(targetHeight * 0.8) },
      { w: Math.floor(targetWidth * 0.7), h: Math.floor(targetHeight * 0.7) },
      { w: Math.floor(targetWidth * 0.6), h: Math.floor(targetHeight * 0.6) },
      { w: Math.floor(targetWidth * 0.5), h: Math.floor(targetHeight * 0.5) },
      { w: Math.floor(targetWidth * 0.4), h: Math.floor(targetHeight * 0.4) },
    ]

    const qualitiesToTry = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]

    for (const size of sizesToTry) {
      if (size.w < 100 || size.h < 100) continue
      for (const quality of qualitiesToTry) {
        try {
          const blob = await compressAtSize(size.w, size.h, quality)
          if (blob && blob.size <= maxSize) {
            return blobToFile(blob, makeJpegName(originalFile.name), "image/jpeg")
          }
        } catch (err) {}
      }
    }

    try {
      const blob = await compressAtSize(
        Math.max(200, Math.floor(targetWidth * 0.3)),
        Math.max(200, Math.floor(targetHeight * 0.3)),
        0.1
      )
      if (blob) {
        return blobToFile(blob, makeJpegName(originalFile.name), "image/jpeg")
      }
    } catch (err) {}

    return originalFile
  }

  async function compressToRange(compressAtSize, targetWidth, targetHeight, minSize, maxSize, originalFile) {
    let bestBlob = null
    let bestScore = -1
    const isLargeRange = maxSize >= 500 * 1024

    const sizesToTry = isLargeRange
      ? [
          { w: targetWidth, h: targetHeight },
          { w: Math.floor(targetWidth * 0.98), h: Math.floor(targetHeight * 0.98) },
          { w: Math.floor(targetWidth * 0.95), h: Math.floor(targetHeight * 0.95) },
          { w: Math.floor(targetWidth * 0.92), h: Math.floor(targetHeight * 0.92) },
          { w: Math.floor(targetWidth * 0.9), h: Math.floor(targetHeight * 0.9) },
          { w: Math.floor(targetWidth * 0.87), h: Math.floor(targetHeight * 0.87) },
          { w: Math.floor(targetWidth * 0.85), h: Math.floor(targetHeight * 0.85) },
          { w: Math.floor(targetWidth * 0.82), h: Math.floor(targetHeight * 0.82) },
          { w: Math.floor(targetWidth * 0.8), h: Math.floor(targetHeight * 0.8) },
          { w: Math.floor(targetWidth * 0.75), h: Math.floor(targetHeight * 0.75) },
          { w: Math.floor(targetWidth * 0.7), h: Math.floor(targetHeight * 0.7) },
        ]
      : [
          { w: targetWidth, h: targetHeight },
          { w: Math.floor(targetWidth * 0.9), h: Math.floor(targetHeight * 0.9) },
          { w: Math.floor(targetWidth * 0.8), h: Math.floor(targetHeight * 0.8) },
          { w: Math.floor(targetWidth * 0.7), h: Math.floor(targetHeight * 0.7) },
          { w: Math.floor(targetWidth * 0.6), h: Math.floor(targetHeight * 0.6) },
          { w: Math.floor(targetWidth * 0.5), h: Math.floor(targetHeight * 0.5) },
        ]

    for (const size of sizesToTry) {
      if (size.w < 300 || size.h < 300) continue
      const qualitiesToTry = isLargeRange
        ? [0.98, 0.95, 0.92, 0.9, 0.87, 0.85, 0.82, 0.8, 0.77, 0.75, 0.72, 0.7, 0.67, 0.65, 0.6, 0.55, 0.5]
        : [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]

      for (const quality of qualitiesToTry) {
        try {
          const blob = await compressAtSize(size.w, size.h, quality)
          if (!blob) continue

          let score = 0
          if (blob.size >= minSize && blob.size <= maxSize) {
            const rangePosition = (blob.size - minSize) / (maxSize - minSize)
            score = 1000 + rangePosition * 500
            if (rangePosition > 0.7) score += 200
          } else if (blob.size < minSize) {
            const underRatio = blob.size / minSize
            score = 200 + underRatio * 100
          } else {
            continue
          }

          if (score > bestScore) {
            bestScore = score
            bestBlob = blob
          }
          if (isLargeRange && score >= 1200) break
          if (!isLargeRange && score >= 1000) break
        } catch (err) {}
      }

      if (isLargeRange && bestScore >= 1200) break
      if (!isLargeRange && bestScore >= 1000) break
    }

    if (bestScore < 500 && isLargeRange) {
      try {
        const result = await binarySearchQuality(compressAtSize, targetWidth, targetHeight, minSize, maxSize)
        if (result) bestBlob = result
      } catch (err) {}
    }

    if (bestBlob) {
      return blobToFile(bestBlob, makeJpegName(originalFile.name), "image/jpeg")
    }

    return originalFile
  }

  async function binarySearchQuality(compressAtSize, width, height, minSize, maxSize) {
    let lowQuality = 0.1
    let highQuality = 0.98
    let bestBlob = null
    let iterations = 0
    const maxIterations = 15

    while (iterations < maxIterations && highQuality - lowQuality > 0.02) {
      const midQuality = (lowQuality + highQuality) / 2
      try {
        const blob = await compressAtSize(width, height, midQuality)
        if (!blob) break
        if (blob.size >= minSize && blob.size <= maxSize) {
          bestBlob = blob
          lowQuality = midQuality
        } else if (blob.size > maxSize) {
          highQuality = midQuality
        } else {
          lowQuality = midQuality
        }
      } catch (err) {
        break
      }
      iterations++
    }
    return bestBlob
  }

  fileInput.addEventListener("change", function () {
    imageFiles = Array.from(this.files || []).filter((f) => f.type && f.type.startsWith("image/"))
    if (!imageFiles.length) {
      alert("Please select image files only.")
      this.value = ""
      compressBtn.disabled = true
      compressBtn.style.display = "none"
      return
    }

    compressedFiles = []
    previews.innerHTML = ""
    downloadBtn.style.display = "none"
    tip.style.display = "none"
    compressBtn.style.display = "inline-block"
    compressBtn.disabled = false
    compressBtn.textContent = "Compress Images"
  })

  compressBtn.addEventListener("click", async () => {
    if (!imageFiles.length) return

    compressBtn.disabled = true
    compressBtn.textContent = "Compressing..."
    tip.style.display = "block"
    tip.textContent = "Preparing to compress..."

    const rangeValue = document.getElementById("range")?.value || "100-200"
    let minSize, maxSize

    if (rangeValue === "1024") {
      minSize = 0
      maxSize = 1024 * 1024
    } else if (rangeValue.startsWith("0-")) {
      minSize = 0
      maxSize = Number.parseInt(rangeValue.split("-")[1], 10) * 1024
    } else {
      const [minKB, maxKB] = rangeValue.split("-").map((s) => Number.parseInt(s, 10))
      minSize = minKB * 1024
      maxSize = maxKB * 1024
    }

    compressedFiles = []
    const total = imageFiles.length

    for (let i = 0; i < total; i++) {
      const f = imageFiles[i]
      tip.textContent = `Processing ${i + 1}/${total} — ${f.name}`
      try {
        const compressed = await compressSingle(f, minSize, maxSize)
        compressedFiles.push(compressed)
      } catch (err) {
        compressedFiles.push(f)
      }
      const progress = Math.round(((i + 1) / total) * 100)
      tip.textContent = `Processed ${i + 1}/${total} (${progress}%)`
    }

    tip.textContent = `Compression completed! Processed ${total} image${total > 1 ? "s" : ""}.`
    compressBtn.disabled = false
    compressBtn.textContent = "Compress Images"
    showPreviews(compressedFiles)
    downloadBtn.style.display = compressedFiles.length ? "inline-block" : "none"
  })

  function showPreviews(files) {
    previews.innerHTML = ""
    files.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = function () {
        const container = document.createElement("div")
        container.className = "preview-container"
        const img = new Image()
        img.src = this.result
        img.className = "compressed-preview"
        const originalSize = imageFiles[index]?.size || 0
        const compressedSize = file.size
        const compressionRatio =
          originalSize > 0 ? (((originalSize - compressedSize) / originalSize) * 100).toFixed(1) : 0
        const info = document.createElement("div")
        info.className = "image-info"
        info.innerHTML = `
          <p><strong>${file.name}</strong></p>
          <p>Original: ${(originalSize / 1024).toFixed(2)} KB</p>
          <p>Compressed: ${(compressedSize / 1024).toFixed(2)} KB</p>
          <p>Saved: ${compressionRatio}%</p>
        `
        container.appendChild(img)
        container.appendChild(info)
        previews.appendChild(container)
      }
      reader.readAsDataURL(file)
    })
  }

  downloadBtn.addEventListener("click", () => {
    compressedFiles.forEach((file) => {
      const url = URL.createObjectURL(file)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name || "compressed-image.jpg"
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 200)
    })
  })
})
