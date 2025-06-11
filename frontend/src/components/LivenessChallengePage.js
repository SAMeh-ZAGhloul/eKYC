import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LivenessChallengePage.css'; 

const CHALLENGE_TYPES = ['blink', 'orientation', 'emotion']; 

function LivenessChallengePage({ onLivenessComplete, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null); 

  const [stream, setStream] = useState(null);
  const [currentChallenge, setCurrentChallenge] = useState(null); 
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [completedChallenges, setCompletedChallenges] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false); 
  const [errorMessage, setErrorMessage] = useState('');
  const [isAllChallengesDone, setIsAllChallengesDone] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const autoAttemptTimerRef = useRef(null);

  // console.log('[LivenessPage] Render. completedChallenges.size:', completedChallenges.size, 'isLoading:', isLoading, 'currentChallenge:', currentChallenge);

  useEffect(() => {
    async function getCameraStream() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("[LivenessPage] Error accessing camera:", err);
        setErrorMessage("Could not access camera. Please check permissions.");
      }
    }
    getCameraStream();
    return () => { 
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (autoAttemptTimerRef.current) clearTimeout(autoAttemptTimerRef.current);
    };
  }, []);

  const handleAttemptChallenge = useCallback(async (isRetry = false) => {
    if (!videoRef.current || !currentChallenge) return;
    
    if (autoAttemptTimerRef.current) {
      clearTimeout(autoAttemptTimerRef.current);
      autoAttemptTimerRef.current = null;
    }
    setShowRetryButton(false); // Hide retry button when an attempt starts
    setIsLoading(true);
    setFeedbackMessage(`Attempting: ${currentChallenge.instruction}`);

    await new Promise(resolve => setTimeout(resolve, 2000)); 
    
    // Simulate success/failure. For testing Retry, let's make it fail sometimes.
    // First attempt of a new challenge type will succeed, retries might also succeed.
    // This is a simple simulation; a real backend would determine success.
    const challengeMet = isRetry ? true : (Math.random() > 0.3 || completedChallenges.has(currentChallenge.type)); 
    // Make first attempt of a new type more likely to succeed, or if it's a retry, assume success.

    if (challengeMet) {
      setFeedbackMessage('Correct!');
      setCompletedChallenges(prev => new Set(prev).add(currentChallenge.type));
      // useEffect watching completedChallenges.size will trigger fetchNextChallenge
    } else {
      setFeedbackMessage('Challenge not met. Please try again.');
      setShowRetryButton(true); // Show retry button on failure
    }
    setIsLoading(false);
  }, [currentChallenge, completedChallenges, isAllChallengesDone, setIsLoading, setFeedbackMessage, setCompletedChallenges]);


  const fetchNextChallenge = useCallback(async () => {
    setIsLoading(true);
    setShowRetryButton(false); // Hide retry button when fetching new challenge
    // setFeedbackMessage('Loading next challenge...'); // Removed
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    let nextChallengeType;
    const availableTypes = CHALLENGE_TYPES.filter(type => !completedChallenges.has(type));

    if (availableTypes.length > 0) {
      nextChallengeType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    } else {
      setIsAllChallengesDone(true);
      setFeedbackMessage('All liveness challenges completed successfully!');
      setIsLoading(false);
      if(onLivenessComplete) onLivenessComplete({ success: true, details: {} });
      return;
    }
    
    let instruction = '';
    if (nextChallengeType === 'blink') instruction = `Please blink your eyes ${Math.floor(Math.random() * 3) + 2} times.`;
    else if (nextChallengeType === 'orientation') instruction = `Please turn your head slowly to the ${Math.random() > 0.5 ? 'left' : 'right'}.`;
    else if (nextChallengeType === 'emotion') instruction = `Please ${Math.random() > 0.5 ? 'smile' : 'show surprise'}.`;
    
    const newChallenge = { type: nextChallengeType, instruction };
    setCurrentChallenge(newChallenge);
    setFeedbackMessage(`Challenge ${completedChallenges.size + 1}/${CHALLENGE_TYPES.length}: ${instruction}`);
    setIsLoading(false);

    if (autoAttemptTimerRef.current) clearTimeout(autoAttemptTimerRef.current);
    autoAttemptTimerRef.current = setTimeout(() => handleAttemptChallenge(false), 12000); 

  }, [completedChallenges, setIsLoading, setFeedbackMessage, setCurrentChallenge, setIsAllChallengesDone, onLivenessComplete, handleAttemptChallenge]);

  useEffect(() => {
    if (stream && !isLoading && completedChallenges.size < CHALLENGE_TYPES.length && !isAllChallengesDone) {
      const delay = completedChallenges.size > 0 ? 1500 : 100; 
      const timerId = setTimeout(fetchNextChallenge, delay); 
      return () => clearTimeout(timerId);
    } else if (stream && completedChallenges.size === CHALLENGE_TYPES.length && !isAllChallengesDone) {
      setIsAllChallengesDone(true);
      setFeedbackMessage('All liveness challenges completed successfully!');
      if(onLivenessComplete) onLivenessComplete({ success: true, details: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [stream, completedChallenges.size, isAllChallengesDone, onLivenessComplete, setIsAllChallengesDone]);
  // Removed fetchNextChallenge and isLoading from deps to break loops, relying on internal guards.

  useEffect(() => {
    if (!stream || isAllChallengesDone) return; 
    let animationFrameId;
    let lastProcessTime = 0;
    const fpsInterval = 1000 / 5; 
    const processFrame = (now) => {
      animationFrameId = requestAnimationFrame(processFrame);
      if (now - lastProcessTime > fpsInterval) {
        lastProcessTime = now - ((now - lastProcessTime) % fpsInterval);
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          // console.log(`[LivenessChallengePage] Processing frame at ~5 FPS.`);
        }
      }
    };
    animationFrameId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [stream, isAllChallengesDone]);

  const onRetryHandler = () => {
    setShowRetryButton(false); // Hide button
    handleAttemptChallenge(true); // Pass true to indicate it's a retry, which will force success in simulation
  }

  return (
    <div className="liveness-challenge-container new-ui-liveness">
      <div className="liveness-header">
        <button onClick={onBack} className="back-arrow" disabled={isLoading}>&larr;</button>
        <span className="liveness-title">Activate Sports Fan ID</span>
      </div>

      <div className="step-indicator">
        {CHALLENGE_TYPES.map((type, index) => (
          <React.Fragment key={type}>
            <div className={`step-circle ${completedChallenges.has(type) ? 'completed' : (currentChallenge?.type === type ? 'active' : '')}`}>
              {index + 1}
            </div>
            {index < CHALLENGE_TYPES.length - 1 && <div className="step-line"></div>}
          </React.Fragment>
        ))}
      </div>
      
      <p className="face-recognition-subtitle">Face Recognition</p>
      <p className="challenge-instruction-text">{currentChallenge ? currentChallenge.instruction : feedbackMessage}</p>

      {/* Placeholder for Circular Visualizer */}
      <div className="circular-visualizer-placeholder">
        {/* This would be replaced by an SVG/Canvas component */}
        <p>(Circular Visualizer Area)</p>
        <video ref={videoRef} autoPlay playsInline muted className="camera-video-liveness"></video>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>


      {isLoading && <p className="loading-message">Processing...</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="liveness-navigation-buttons">
        {showRetryButton && !isLoading && (
          <button onClick={onRetryHandler} className="button-retry">
            Try Again
          </button>
        )}
        {isAllChallengesDone && !isLoading && (
          <button onClick={() => onLivenessComplete({success: true})} className="button-continue">
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export default LivenessChallengePage;
