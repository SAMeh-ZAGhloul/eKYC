import React, { useState, useEffect, useRef } from 'react';
import './LiveVerificationPage.css'; // To be created

function LiveVerificationPage({ idCardData, onVerificationComplete, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // For capturing frames

  const [stream, setStream] = useState(null);
  const [verificationImage, setVerificationImage] = useState(null); // The captured image for verification
  const [liveFacePreview, setLiveFacePreview] = useState(null); // Optional: preview of detected face from live feed
  
  const [matchScore, setMatchScore] = useState(null);
  const [isVerified, setIsVerified] = useState(null); // null, true, or false
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [instructionText, setInstructionText] = useState(
    "Please keep your face in front of the camera and come closer."
  );

  // Request camera access
  useEffect(() => {
    async function getCameraStream() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setErrorMessage("Could not access camera. Please check permissions and try again.");
      }
    }
    getCameraStream();

    // Cleanup: stop camera when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Changed to empty: Run once on mount, cleanup on unmount

  // Throttled frame processing loop (e.g., for client-side detections)
  useEffect(() => {
    if (!stream) return;

    let animationFrameId;
    let lastProcessTime = 0;
    const fpsInterval = 1000 / 5; // 5 FPS

    const processFrame = (now) => {
      animationFrameId = requestAnimationFrame(processFrame);

      if (now - lastProcessTime > fpsInterval) {
        lastProcessTime = now - ((now - lastProcessTime) % fpsInterval); // Adjust for precision

        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          // console.log(`[LiveVerificationPage] Processing frame at ~5 FPS. Timestamp: ${now}`);
          // TODO: Add client-side face detection logic here if needed
          // e.g., draw bounding box on video or a separate canvas overlay
          
          // Example: Get frame data if needed for some light processing
          // const video = videoRef.current;
          // const canvas = canvasRef.current; // Or a dedicated canvas for processing
          // if (canvas) {
          //   canvas.width = video.videoWidth;
          //   canvas.height = video.videoHeight;
          //   const context = canvas.getContext('2d');
          //   context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          //   // const frameDataForProcessing = canvas.toDataURL('image/jpeg', 0.5); // Or getImageData
          //   // console.log('[LiveVerificationPage] Frame data captured for processing at 5 FPS');
          // }
        }
      }
    };

    animationFrameId = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stream]); // Re-run if stream changes


  const captureFrameForVerification = () => {
    if (videoRef.current && canvasRef.current) {
      setIsLoading(true);
      setErrorMessage('');
      setInstructionText("Capturing frame...");

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      const frameDataUrl = canvas.toDataURL('image/jpeg');
      setVerificationImage(frameDataUrl);
      
      // TODO: In a real app, you might show this captured frame or a detected face from it.
      // For now, we'll just use it for the (simulated) API call.
      setLiveFacePreview(frameDataUrl); // Placeholder preview

      // Simulate API call for verification
      verifyFaceWithAPI(frameDataUrl);
    }
  };

  const verifyFaceWithAPI = async (liveFrameDataUrl) => {
    setInstructionText("Verifying...");
    // const idFaceData = idCardData?.detectedFace; // Assuming idCardData contains the face from ID

    // if (!idFaceData) {
    //   setErrorMessage("ID card face data is missing. Please go back.");
    //   setIsLoading(false);
    //   return;
    // }

    const formData = new FormData();
    formData.append('liveFaceImage', liveFrameDataUrl); // Or send the blob if preferred by backend
    // formData.append('idCardFaceData', idFaceData); // Or a reference/token to it

    try {
      // const response = await fetch('/api/face/verify', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const data = await response.json();

      // SIMULATING API RESPONSE
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
      const simulatedScore = Math.random() * 50 + 50; // Score between 50 and 100
      const data = {
        success: true,
        matchScore: simulatedScore, // Example: 75.5
        verified: simulatedScore >= 50, // Example threshold
        message: simulatedScore >= 50 ? "Verification successful!" : "Verification failed."
      };
      // END SIMULATION

      if (data.success) {
        setMatchScore(data.matchScore);
        setIsVerified(data.verified);
        setInstructionText(data.message);
      } else {
        setErrorMessage(data.message || "Verification process failed.");
        setIsVerified(false);
      }
    } catch (error) {
      console.error("Error during face verification:", error);
      setErrorMessage("An error occurred during verification.");
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNext = () => {
    if (isVerified && onVerificationComplete) {
      onVerificationComplete({ verificationImage, matchScore, isVerified });
    }
  };

  return (
    <div className="live-verification-container">
      <h2>Step 2: Live Face Verification</h2>
      <p className="instruction-text">{instructionText}</p>

      <div className="media-display">
        <div className="camera-feed-container">
          <h3>Live Camera Feed</h3>
          <video ref={videoRef} autoPlay playsInline muted className="camera-video"></video>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas> {/* For capturing frames */}
        </div>
        {/* Optional: Display for live detected face snippet, similar to IDCardUpload */}
        {liveFacePreview && (
          <div className="live-face-preview-container">
            <h3>Captured Frame</h3>
            <img src={liveFacePreview} alt="Live Face Preview" className="image-preview" />
          </div>
        )}
      </div>

      {isLoading && <p className="loading-message">Processing...</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {matchScore !== null && (
        <div className="results-display">
          <p>Match Score: {matchScore.toFixed(1)}%</p>
          <p style={{ color: isVerified ? 'green' : 'red' }}>
            Status: {isVerified ? 'VERIFIED' : 'NOT VERIFIED'}
          </p>
        </div>
      )}
      
      <div className="navigation-buttons">
        <button onClick={onBack} disabled={isLoading} className="button-back">Back</button>
        {!isVerified && !isLoading && verificationImage === null && (
          <button onClick={captureFrameForVerification} className="button-capture">
            Capture & Verify
          </button>
        )}
        {isVerified !== null && !isLoading && (
             <button onClick={handleNext} disabled={!isVerified} className="button-next">
             Next
           </button>
        )}
      </div>
    </div>
  );
}

export default LiveVerificationPage;
