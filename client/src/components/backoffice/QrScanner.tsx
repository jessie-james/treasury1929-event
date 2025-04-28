import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface QrScannerProps {
  onScan: (data: string) => void;
  isLoading?: boolean;
}

export function QrScanner({ onScan, isLoading = false }: QrScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Start camera when component mounts or when isCameraActive changes
  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isCameraActive]);

  // Function to start the camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      const constraints = {
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 720 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasPermission(true);
        startQrScanning();
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      setHasPermission(false);
      setCameraError(
        error instanceof Error 
          ? error.message 
          : 'Could not access camera. Please check permissions.'
      );
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check your device permissions.",
        variant: "destructive"
      });
    }
  };

  // Function to stop the camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  // Toggle camera on/off
  const toggleCamera = () => {
    setIsCameraActive(!isCameraActive);
  };

  // Start scanning for QR codes
  const startQrScanning = () => {
    if (!window.BarcodeDetector) {
      setCameraError("Your browser doesn't support QR code scanning. Please use a modern browser.");
      toast({
        title: "Browser Not Supported",
        description: "Your browser doesn't support QR code scanning. Please use a different browser or manual entry.",
        variant: "destructive"
      });
      return;
    }

    // Create a barcode detector
    const barcodeDetector = new window.BarcodeDetector({
      formats: ['qr_code']
    });

    // Set up scanning interval
    scanIntervalRef.current = window.setInterval(async () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        try {
          // Take snapshot of video feed
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (context) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            
            // Detect barcodes in the image
            const barcodes = await barcodeDetector.detect(canvas);
            
            if (barcodes.length > 0) {
              // Found QR code
              const qrData = barcodes[0].rawValue;
              console.log('QR code detected:', qrData);
              
              // Pause scanning while processing the scan
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;
              }
              
              // Call the onScan callback with the data
              onScan(qrData);
              
              // Restart scanning after 2 seconds
              setTimeout(() => {
                if (isCameraActive) {
                  startQrScanning();
                }
              }, 2000);
            }
          }
        } catch (error) {
          console.error('Error scanning QR code:', error);
        }
      }
    }, 200); // Scan every 200ms
  };

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden">
        <CardContent className="p-0">
          {/* Camera view */}
          <div className="relative aspect-square bg-black">
            <video 
              ref={videoRef} 
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              autoPlay 
              playsInline
              muted
            ></video>
            
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <Camera className="h-16 w-16 text-slate-400" />
              </div>
            )}
            
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-4">
                <p className="text-red-600 text-center">{cameraError}</p>
              </div>
            )}
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <RefreshCw className="h-12 w-12 text-white animate-spin" />
              </div>
            )}
            
            {/* QR scanner overlay */}
            {isCameraActive && !cameraError && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/5 h-3/5 border-2 border-white rounded-md"></div>
              </div>
            )}
          </div>
          
          {/* Hidden canvas for processing */}
          <canvas 
            ref={canvasRef} 
            className="hidden"
          ></canvas>
        </CardContent>
      </Card>
      
      <div className="flex justify-center">
        <Button 
          onClick={toggleCamera}
          disabled={isLoading}
          variant={isCameraActive ? "destructive" : "default"}
          className="w-full max-w-sm"
        >
          {isCameraActive ? (
            <>
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </>
          )}
        </Button>
      </div>
    </div>
  );
}