// Type definitions for the Barcode Detection API
// https://wicg.github.io/shape-detection-api/#barcode-detection-api

interface BarcodeDetectorOptions {
  // The formats to detect
  formats?: ('aztec' | 'code_128' | 'code_39' | 'code_93' | 'codabar' | 'data_matrix' | 'ean_13' | 'ean_8' | 'itf' | 'pdf417' | 'qr_code' | 'upc_a' | 'upc_e')[];
}

interface BarcodeDetector {
  // Detects barcodes in an image source
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface DetectedBarcode {
  // The barcode's bounding box in the image
  boundingBox: DOMRectReadOnly;
  
  // The raw value of the barcode
  rawValue: string;
  
  // The format of the barcode
  format: string;
  
  // The corner points of the barcode
  cornerPoints?: {x: number, y: number}[];
}

declare var BarcodeDetector: {
  prototype: BarcodeDetector;
  new(options?: BarcodeDetectorOptions): BarcodeDetector;
  
  // Check if a specific format is supported by the browser
  getSupportedFormats(): Promise<string[]>;
};