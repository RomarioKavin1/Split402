"use client";

import { useState, useRef, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ScanPage() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Function to handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setShowPreview(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to start camera
  const startCamera = async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    setCameraError(null);
    
    try {
      console.log("Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      });
      console.log("Camera access granted:", mediaStream);
      
      streamRef.current = mediaStream;
      setIsCameraActive(true);
      setShowPreview(false);
    } catch (error) {
      console.error("Camera access error:", error);
      setCameraError("Failed to access camera. Please check permissions.");
    } finally {
      setIsInitializing(false);
    }
  };

  // Function to stop camera
  const stopCamera = () => {
    console.log("Stopping camera...");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
      setIsCameraActive(false);
    }
  };

  // Handle video stream when stream or videoRef changes
  useEffect(() => {
    if (streamRef.current && videoRef.current) {
      console.log("Setting up video stream...");
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
        console.log("Video metadata loaded");
        videoRef.current?.play().catch((error) => {
          console.error("Error playing video:", error);
          setCameraError("Failed to start video playback");
        });
      };
    }
  }, [streamRef.current, videoRef.current]);

  // Function to capture image from camera
  const captureImage = () => {
    if (videoRef.current) {
      console.log("Capturing image...");
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg");
        setImage(imageData);
        setShowPreview(true);
        stopCamera();
      }
    }
  };

  // Function to retake photo
  const retakePhoto = () => {
    setImage(null);
    setShowPreview(false);
    startCamera();
  };

  // Function to process image with OCR and bill recognition
  const processImage = async () => {
    if (!image) return;

    setIsProcessing(true);
    try {
      // First, perform OCR
      const worker = await createWorker('eng');
      const { data: { text: ocrText } } = await worker.recognize(image);
      await worker.terminate();
      setText(ocrText);

      // Then, send to bill recognition agent
      const response = await fetch("/api/agent/bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: ocrText }),
      });

      if (!response.ok) {
        throw new Error("Failed to process bill");
      }

      const billData = await response.json();
      
      // Save bill data to localStorage
      localStorage.setItem("billData", JSON.stringify(billData));
      
      // Navigate to split page
      router.push("/split");
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Error processing bill. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup camera on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Bill Scanner
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Image Capture/Upload */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Capture or Upload Bill
              </h2>

              {/* Camera View */}
              {isCameraActive && !showPreview && (
                <div className="relative mb-4 aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }} // Mirror the video
                  />
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white p-4 text-center">
                      {cameraError}
                    </div>
                  )}
                  {isInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white p-4 text-center">
                      Initializing camera...
                    </div>
                  )}
                  <button
                    onClick={captureImage}
                    disabled={isInitializing}
                    className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 shadow-lg ${
                      isInitializing ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Scan
                  </button>
                </div>
              )}

              {/* Camera Controls */}
              {!isCameraActive && !showPreview && (
                <div className="space-y-4">
                  <button
                    onClick={startCamera}
                    disabled={isInitializing}
                    className={`w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 shadow-md ${
                      isInitializing ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isInitializing ? "Starting Camera..." : "Start Camera"}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        Or
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload an image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100
                        dark:file:bg-blue-900 dark:file:text-blue-300"
                    />
                  </div>
                </div>
              )}

              {/* Preview */}
              {showPreview && image && (
                <div className="space-y-4">
                  <img
                    src={image}
                    alt="Preview"
                    className="w-full rounded-lg"
                  />
                  <div className="flex space-x-4">
                    <button
                      onClick={retakePhoto}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                    >
                      Retake
                    </button>
                    <button
                      onClick={processImage}
                      disabled={isProcessing}
                      className={`flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 ${
                        isProcessing ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isProcessing ? "Processing..." : "Process"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Extracted Text */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Extracted Text
            </h2>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[200px]">
              {text ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                  {text}
                </pre>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  {isProcessing
                    ? "Processing image..."
                    : "Extracted text will appear here"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 