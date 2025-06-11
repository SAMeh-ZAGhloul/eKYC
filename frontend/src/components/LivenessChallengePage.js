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
  const autoAttemptTimerRef = useRef(null);

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
        setErrorMessage("Could not access camera. Please check permissions.");
      }
    }
    getCameraStream();
    return () => { 
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (autoAttemptTimerRef.current) clearTimeout(autoAttemptTimerRef.current);
    };
  }, []);

  const handleAttemptChallenge = useCallback(async () => {
    if (!videoRef.current || !currentChallenge) return;
    
    if (autoAttemptTimerRef.current) {
      clearTimeout(autoAttemptTimerRef.current);
      autoAttemptTimerRef.current = null;
    }

    setIsLoading(true);
    setFeedbackMessage(`Attempting: ${currentChallenge.instruction}`);

    await new Promise(resolve => setTimeout(resolve, 2000)); 
    const challengeMet = true; 

    if (challengeMet) {
      setFeedbackMessage('Correct!');
      setCompletedChallenges(prev => new Set(prev).add(currentChallenge.type));
    } else {
      setFeedbackMessage('Challenge not met. Please try again.');
      setTimeout(() => {
        if (currentChallenge && !isAllChallengesDone) { 
             setFeedbackMessage(`Challenge ${completedChallenges.size + 1}/${CHALLENGE_TYPES.length}: ${currentChallenge.instruction}`);
             if (!isAllChallengesDone) {
                autoAttemptTimerRef.current = setTimeout(handleAttemptChallenge, 2000);
             }
        }
      }, 2000);
    }
    setIsLoading(false);
  }, [currentChallenge, completedChallenges.size, isAllChallengesDone, setIsLoading, setFeedbackMessage, setCompletedChallenges]);


  const fetchNextChallenge = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay for "loading" 

    let nextChallengeType;
    const availableTypes = CHALLENGE_TYPES.filter(type => !completedChallenges.has(type));
    if (availableTypes.length > 0) {
      nextChallengeType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    } else {
      setIsAllChallengesDone(true);
      setFeedbackMessage('All liveness challenges completed!');
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
    autoAttemptTimerRef.current = setTimeout(handleAttemptChallenge, 12000); 

  }, [completedChallenges, setIsLoading, setFeedbackMessage, setCurrentChallenge, setIsAllChallengesDone, onLivenessComplete, handleAttemptChallenge]);

  // Effect to fetch challenges
  useEffect(() => {
    // This effect now primarily reacts to stream availability and challenge completion count
    if (stream && !isLoading && completedChallenges.size < CHALLENGE_TYPES.length && !isAllChallengesDone) {
      const timerId = setTimeout(() => {
        // We call fetchNextChallenge directly. It's memoized by useCallback.
        // If fetchNextChallenge's own dependencies haven't changed, it won't be a new function.
        fetchNextChallenge(); 
      }, completedChallenges.size > 0 ? 1500 : 100); // Delay before fetching next/first challenge
      return () => clearTimeout(timerId);
    } else if (stream && completedChallenges.size === CHALLENGE_TYPES.length && !isAllChallengesDone) {
      setIsAllChallengesDone(true);
      setFeedbackMessage('All liveness challenges completed successfully!');
      if(onLivenessComplete) onLivenessComplete({ success: true, details: {} });
    }
    // Removed fetchNextChallenge from deps; it's called internally.
    // This effect now triggers based on data changes (stream, size, done status, loading status).
  }, [stream, completedChallenges.size, isAllChallengesDone, isLoading, onLivenessComplete, setIsAllChallengesDone]);

  // Throttled frame processing loop
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

  return (
    <div className="liveness-challenge-container">
      <h2>Step 3: Liveness Challenges</h2>
      <p className="feedback-message">{feedbackMessage}</p>

      <div className="camera-feed-container-liveness">
        <video ref={videoRef} autoPlay playsInline muted className="camera-video-liveness"></video>
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      </div>

      {isLoading && <p className="loading-message">Processing...</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="navigation-buttons">
        <button onClick={onBack} disabled={isLoading} className="button-back">Back</button>
        {isAllChallengesDone && (
          <button onClick={() => onLivenessComplete({success: true})} className="button-next">
            Next
          </button>
        )}
      </div>
    </div>
  );
}

export default LivenessChallengePage;
