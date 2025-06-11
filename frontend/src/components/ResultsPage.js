import React from 'react';
import './ResultsPage.css'; // To be created

// Helper to display an image or a placeholder
const ImageDisplay = ({ src, alt, label }) => (
  <div className="image-display-item">
    <h4>{label}</h4>
    {src ? (
      <img src={src} alt={alt} className="result-image-preview" />
    ) : (
      <div className="result-image-placeholder">Not available</div>
    )}
  </div>
);

function ResultsPage({ ekycData, onBackToStart }) {
  // Destructure data, providing defaults for robustness
  const {
    idCardImagePreview, // From IDCardUpload (simulated)
    detectedIdFacePreview, // From IDCardUpload (simulated)
    liveVerificationImage, // From LiveVerificationPage (simulated)
    // detectedLiveFacePreview, // Could be added to LiveVerificationPage data
    matchScore, // From LiveVerificationPage (simulated)
    isFaceVerified, // From LiveVerificationPage (simulated)
    livenessResults // From LivenessChallengePage (simulated)
  } = ekycData || {};

  // Default liveness results if not provided
  const finalLivenessResults = livenessResults || {
    'Blink Detection': false,
    'Face Orientation': false,
    'Emotion Detection': false,
  };
  
  // Mimic the cos transformation for match score display from Qt app
  const displayMatchScore = matchScore !== null && matchScore !== undefined 
    ? (100 * Math.cos(parseFloat(matchScore) / 100)).toFixed(1) 
    : 'N/A';

  return (
    <div className="results-page-container">
      <h2>eKYC Verification Results</h2>

      <div className="results-grid">
        <section className="result-section">
          <h3>ID Card Information</h3>
          <ImageDisplay src={idCardImagePreview} alt="ID Card" label="Uploaded ID Card" />
          <ImageDisplay src={detectedIdFacePreview} alt="Detected ID Face" label="Detected Face from ID" />
        </section>

        <section className="result-section">
          <h3>Live Verification Photo</h3>
          <ImageDisplay src={liveVerificationImage} alt="Live Camera Photo" label="Live Camera Snapshot" />
          {/* <ImageDisplay src={detectedLiveFacePreview} alt="Detected Live Face" label="Detected Face from Snapshot" /> */}
        </section>
        
        <section className="result-section full-width-section">
          <h3>Overall Verification Summary</h3>
          <div className="summary-item">
            <strong>Face Match Score:</strong> 
            <span style={{ color: isFaceVerified ? 'green' : 'red', fontWeight: 'bold' }}>
              {displayMatchScore}{displayMatchScore !== 'N/A' ? '%' : ''}
            </span>
          </div>
          <div className="summary-item">
            <strong>Face Verification Status:</strong>
            <span style={{ color: isFaceVerified ? 'green' : 'red', fontWeight: 'bold' }}>
              {isFaceVerified ? 'MATCH (VERIFIED)' : 'NO MATCH (NOT VERIFIED)'}
            </span>
          </div>
        </section>

        <section className="result-section full-width-section">
          <h3>Liveness Detection</h3>
          <ul className="liveness-list">
            {Object.entries(finalLivenessResults).map(([test, result]) => (
              <li key={test} style={{ color: result ? 'green' : 'red' }}>
                <strong>{test}:</strong> {result ? '✓ PASSED' : '✗ FAILED'}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="navigation-buttons">
        <button onClick={onBackToStart} className="button-primary">
          Back to Start
        </button>
      </div>
    </div>
  );
}

export default ResultsPage;
