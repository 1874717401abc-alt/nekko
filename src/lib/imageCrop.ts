// Crops an image file to a centered square and re-encodes it as a JPEG data URL.
export function cropImageToSquareJpeg(file: File, size = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas not supported"));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("无法读取图片"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("无法读取文件"));
    reader.readAsDataURL(file);
  });
}
