/**
 * Módulo de compresión de imágenes y Watermarking.
 * Toma un File o Blob y lo comprime a WebP ajustando sus dimensiones y calidad.
 */

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

export async function compressImageToWebP(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const {
    maxWidthOrHeight = 1280, // Resolución recomendada para mantener detalles y reducir peso
    quality = 0.8, // 80% calidad es un buen balance para WebP
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          } else {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("No se pudo obtener el contexto 2D del canvas"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Exportar a WebP
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Error al convertir a WebP"));
            }
          },
          "image/webp",
          quality
        );
      };
      
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
