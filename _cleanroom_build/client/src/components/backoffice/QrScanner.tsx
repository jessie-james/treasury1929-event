import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, StopCircle, RefreshCw } from "lucide-react";

interface QrScannerProps {
  onScan: (data: string) => void;
  isLoading?: boolean;
}

export function QrScanner({ onScan, isLoading = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [detectorSupported, setDetectorSupported] = useState(true);
  const detectorRef = useRef<any>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if BarcodeDetector is supported
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      setDetectorSupported(true);
      // @ts-ignore - BarcodeDetector is not included in the standard TypeScript definitions
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
    } else {
      setDetectorSupported(false);
      setError("Barcode detection is not supported in this browser. Please use a modern browser like Chrome.");
    }
    
    return () => {
      // Clean up when component unmounts
      stopScanning();
    };
  }, []);
  
  // Start the camera stream
  const startCamera = async () => {
    if (!videoRef.current) return;
    
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      
      videoRef.current.srcObject = stream;
      setHasCamera(true);
      setScanning(true);
      startScanningLoop();
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasCamera(false);
      setError("Camera access was denied or not available. Please check your browser permissions.");
    }
  };
  
  // Stop the camera stream
  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      // TypeScript doesn't recognize srcObject as a MediaStream
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track: MediaStreamTrack) => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setScanning(false);
  };
  
  // Scan for QR codes at regular intervals
  const startScanningLoop = () => {
    if (!detectorRef.current || scanIntervalRef.current) return;
    
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !detectorRef.current) return;
      
      // Only scan if video is playing and not paused or ended
      if (videoRef.current.readyState !== 4 || videoRef.current.paused || videoRef.current.ended) return;
      
      try {
        // Detect barcodes in the video stream
        const barcodes = await detectorRef.current.detect(videoRef.current);
        
        if (barcodes.length > 0) {
          // Process the first found QR code
          const barcode = barcodes[0];
          console.log("Detected QR code:", barcode.rawValue);
          
          // Highlight the detected QR code
          highlightDetectedCode(barcode);
          
          // Notify parent component
          onScan(barcode.rawValue);
          
          // Pause scanning after successful detection
          stopScanning();
        }
      } catch (err) {
        console.error("Error scanning QR code:", err);
      }
    }, 200); // Scan 5 times per second
  };
  
  // Highlight the detected QR code on canvas
  const highlightDetectedCode = (barcode: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Match canvas size to video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame on canvas for visual reference
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    // Highlight QR code with rectangle
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    
    // Draw the bounding box
    if (barcode.cornerPoints && barcode.cornerPoints.length >= 4) {
      // Draw polygon using corner points
      ctx.beginPath();
      ctx.moveTo(barcode.cornerPoints[0].x, barcode.cornerPoints[0].y);
      for (let i = 1; i < barcode.cornerPoints.length; i++) {
        ctx.lineTo(barcode.cornerPoints[i].x, barcode.cornerPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (barcode.boundingBox) {
      // Fallback to bounding box if corner points aren't available
      const { x, y, width, height } = barcode.boundingBox;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
    
    // Add text label
    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    if (barcode.boundingBox) {
      const text = `QR Code: ${barcode.rawValue}`;
      const textX = barcode.boundingBox.x;
      const textY = barcode.boundingBox.y - 10;
      ctx.strokeText(text, textX, textY);
      ctx.fillText(text, textX, textY);
    }
  };
  
  // Toggle scanning state
  const toggleScanning = () => {
    if (scanning) {
      stopScanning();
    } else {
      startCamera();
    }
  };
  
  return (
    <div className="flex flex-col items-center">
      <Card className="w-full overflow-hidden">
        <CardContent className="p-0 relative">
          {/* Video Element for Camera Feed */}
          <div className="relative aspect-video w-full bg-gray-900 rounded-md overflow-hidden">
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-cover" 
              autoPlay 
              playsInline 
              muted
            />
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
            />
            
            {/* Camera status overlay */}
            {!scanning && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                <div className="text-center p-4">
                  <Camera className="w-12 h-12 mx-auto mb-2" />
                  <p>Camera is off</p>
                  <p className="text-xs opacity-70">Press the button below to start scanning</p>
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                <div className="text-center p-4">
                  <RefreshCw className="w-12 h-12 mx-auto mb-2 animate-spin" />
                  <p>Processing...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/70 text-white">
                <div className="text-center p-4 max-w-xs">
                  <p className="font-bold mb-2">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            
            {!detectorSupported && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/70 text-white">
                <div className="text-center p-4 max-w-xs">
                  <p className="font-bold mb-2">Browser Not Supported</p>
                  <p className="text-sm">
                    Your browser doesn't support QR code scanning. 
                    Please use Chrome or another modern browser.
                  </p>
                </div>
              </div>
            )}
            
            {!hasCamera && (
              <div className="absolute inset-0 flex items-center justify-center bg-yellow-900/70 text-white">
                <div className="text-center p-4 max-w-xs">
                  <p className="font-bold mb-2">Camera Not Available</p>
                  <p className="text-sm">
                    Camera access denied or no camera available.
                    Please check your browser permissions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-4">
        <Button 
          type="button" 
          onClick={toggleScanning} 
          disabled={isLoading || !detectorSupported}
          className="w-full"
          variant={scanning ? "destructive" : "default"}
          data-scanner-restart
        >
          {scanning ? (
            <>
              <StopCircle className="w-4 h-4 mr-2" />
              Stop Scanner
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Start Scanner
            </>
          )}
        </Button>
      </div>
    </div>
  );
}