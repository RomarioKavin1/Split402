"use client";

import { useState, useRef, useEffect } from "react";
import { createWorker } from "tesseract.js";

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Function to handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  // Function to stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
      setIsCameraActive(false);
    }
  };

  // Function to capture image from camera
  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg");
        setImage(imageData);
        stopCamera();
      }
    }
  };

  // Function to process image with OCR
  const processImage = async () => {
    if (!image) return;

    setIsProcessing(true);
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(image);
      setText(text);
      await worker.terminate();
    } catch (error) {
      console.error("Error processing image:", error);
      setText("Error processing image. Please try again.");
    }
    setIsProcessing(false);
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
              {isCameraActive && (
                <div className="relative mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <button
                    onClick={captureImage}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700"
                  >
                    Capture
                  </button>
                </div>
              )}

              {/* Camera Controls */}
              <div className="flex space-x-4 mb-4">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Stop Camera
                  </button>
                )}
              </div>

              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or upload an image
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

              {/* Preview */}
              {image && (
                <div className="mt-4">
                  <img
                    src={image}
                    alt="Preview"
                    className="w-full rounded-lg"
                  />
                  <button
                    onClick={processImage}
                    disabled={isProcessing}
                    className={`mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 ${
                      isProcessing ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isProcessing ? "Processing..." : "Extract Text"}
                  </button>
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