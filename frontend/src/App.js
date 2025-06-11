import React, { useState, useCallback } from 'react'; // Added useCallback
import './App.css';
import IDCardUpload from './components/IDCardUpload'; 
import LiveVerificationPage from './components/LiveVerificationPage';
import LivenessChallengePage from './components/LivenessChallengePage';
import ResultsPage from './components/ResultsPage';

function App() {
  const [currentPage, setCurrentPage] = useState('idUpload');
  const [idCardData, setIdCardData] = useState(null); 
  const [liveVerificationData, setLiveVerificationData] = useState(null);
  const [livenessData, setLivenessData] = useState(null);

  const handleIDCardUploadNext = useCallback((dataFromIDUpload) => {
    console.log("Proceeding from ID Card Upload with data:", dataFromIDUpload);
    const simulatedIDData = {
      idCardImagePreview: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      detectedIdFacePreview: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    };
    setIdCardData(simulatedIDData); 
    setCurrentPage('liveVerification');
  }, []); // Dependencies: setIdCardData, setCurrentPage (stable from useState)

  const handleLiveVerificationBack = useCallback(() => {
    setCurrentPage('idUpload');
  }, []); // Dependencies: setCurrentPage

  const handleLiveVerificationComplete = useCallback((dataFromLiveVerification) => {
    console.log("Proceeding from Live Verification with data:", dataFromLiveVerification);
    const simulatedLiveData = {
        liveVerificationImage: dataFromLiveVerification?.verificationImage || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        matchScore: dataFromLiveVerification?.matchScore !== undefined ? dataFromLiveVerification.matchScore : 75.0,
        isFaceVerified: dataFromLiveVerification?.isVerified !== undefined ? dataFromLiveVerification.isVerified : true,
    };
    setLiveVerificationData(simulatedLiveData);
    setCurrentPage('liveness'); 
  }, []); // Dependencies: setLiveVerificationData, setCurrentPage

  const handleLivenessBack = useCallback(() => {
    setCurrentPage('liveVerification');
  }, []); // Dependencies: setCurrentPage

  const handleLivenessComplete = useCallback((dataFromLiveness) => {
    console.log("Proceeding from Liveness Challenges with data:", dataFromLiveness);
    const simulatedLivenessData = {
        livenessResults: { 
            'Blink Detection': dataFromLiveness?.success || true,
            'Face Orientation': dataFromLiveness?.success || true,
            'Emotion Detection': dataFromLiveness?.success || true,
        }
    };
    setLivenessData(simulatedLivenessData);
    setCurrentPage('results');
  }, []); // Dependencies: setLivenessData, setCurrentPage

  const handleBackToStart = useCallback(() => {
    setIdCardData(null);
    setLiveVerificationData(null);
    setLivenessData(null);
    setCurrentPage('idUpload');
  }, []); // Dependencies: setIdCardData, setLiveVerificationData, setLivenessData, setCurrentPage

  const ekycDataForResults = {
    ...(idCardData || {}),
    ...(liveVerificationData || {}),
    ...(livenessData || {}), 
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>eKYC Application</h1>
      </header>
      <main>
        {currentPage === 'idUpload' && (
          <IDCardUpload onNextPage={handleIDCardUploadNext} />
        )}
        {currentPage === 'liveVerification' && (
          <LiveVerificationPage 
            idCardData={idCardData} 
            onVerificationComplete={handleLiveVerificationComplete}
            onBack={handleLiveVerificationBack}
          />
        )}
        {currentPage === 'liveness' && (
          <LivenessChallengePage
            onLivenessComplete={handleLivenessComplete}
            onBack={handleLivenessBack}
          />
        )}
        {currentPage === 'results' && (
          <ResultsPage 
            ekycData={ekycDataForResults}
            onBackToStart={handleBackToStart}
          />
        )}
      </main>
    </div>
  );
}

export default App;
