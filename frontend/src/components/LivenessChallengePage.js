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
  const [isLoading, setIsLoading] = useState(false); // Used for API calls and auto-attempt delay
  const [errorMessage, setErrorMessage] = useState('');
  const [isAllChallengesDone, setIsAllChallengesDone] = useState(false);
  const autoAttemptTimerRef = useRef(null);

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
    
    // Clear any pending auto-attempt timer if manually triggered or re-triggered
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
      // This 'else' branch won't be hit with challengeMet = true, but kept for structure
      setFeedbackMessage('Challenge not met. Please try again.');
      setTimeout(() => {
        if (currentChallenge && !isAllChallengesDone) { 
             setFeedbackMessage(`Challenge ${completedChallenges.size + 1}/${CHALLENGE_TYPES.length}: ${currentChallenge.instruction}`);
             // Re-schedule auto-attempt for the same challenge after failure message
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
    setFeedbackMessage('Loading next challenge...');
    await new Promise(resolve => setTimeout(resolve, 1000)); 

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

    // Automatically attempt the new challenge after a delay
    if (autoAttemptTimerRef.current) clearTimeout(autoAttemptTimerRef.current);
    autoAttemptTimerRef.current = setTimeout(() => {
        // Check if this challenge is still the current one before attempting
        // This check might be redundant if setCurrentChallenge is quick enough
        // but good for safety if state updates are batched.
        // For this simulation, we directly call handleAttemptChallenge.
        // In a real app, you might need to pass newChallenge to handleAttemptChallenge
        // or ensure handleAttemptChallenge uses the latest currentChallenge from state.
        // For now, handleAttemptChallenge uses `currentChallenge` from state which should be updated.
        handleAttemptChallenge();
    }, 8000); // Increased to 8-second delay after instruction is shown

  }, [completedChallenges, setIsLoading, setFeedbackMessage, setCurrentChallenge, setIsAllChallengesDone, onLivenessComplete, handleAttemptChallenge]);

  // Effect to fetch challenges
  useEffect(() => {
    if (stream && !isLoading && completedChallenges.size < CHALLENGE_TYPES.length && !isAllChallengesDone) {
      const timerId = setTimeout(() => {
        fetchNextChallenge();
      }, completedChallenges.size > 0 ? 1500 : 100); 
      return () => clearTimeout(timerId);
    } else if (stream && completedChallenges.size === CHALLENGE_TYPES.length && !isAllChallengesDone) {
      setIsAllChallengesDone(true);
      setFeedbackMessage('All liveness challenges completed successfully!');
      if(onLivenessComplete) onLivenessComplete({ success: true, details: {} });
    }
  }, [stream, completedChallenges.size, fetchNextChallenge, isAllChallengesDone, isLoading, onLivenessComplete, setIsAllChallengesDone]);

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
        {/* "Attempt Current Challenge" button is removed for automatic attempts */}
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
