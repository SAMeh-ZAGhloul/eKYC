import React, { useState } from 'react';
import './IDCardUpload.css';

function IDCardUpload({ onNextPage }) {
  const [selectedIdImage, setSelectedIdImage] = useState(null);
  const [idImagePreview, setIdImagePreview] = useState('');
  const [detectedFacePreview, setDetectedFacePreview] = useState('');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedIdImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const newIdImagePreview = reader.result;
        setIdImagePreview(newIdImagePreview);
        setDetectedFacePreview('');
        setIsFaceDetected(false);
        setErrorMessage('');
        extractFaceFromAPI(file, newIdImagePreview);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractFaceFromAPI = async (fileToProcess, idPreviewForSim) => {
    console.log('[extractFaceFromAPI] Called with:', { fileToProcess, idPreviewForSim });
    if (!fileToProcess) {
      console.log('[extractFaceFromAPI] No fileToProcess, returning.');
      return;
    }

    setIsLoading(true);
    console.log('[extractFaceFromAPI] isLoading set to true');
    setErrorMessage('');
    const formData = new FormData();
    formData.append('idCardImage', fileToProcess);

    try {
      // const response = await fetch('/api/id-card/extract-face', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const data = await response.json();

      console.log('[extractFaceFromAPI] Simulating API delay...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const simulateSuccess = true;
      let data;
      if (simulateSuccess) {
        // Use a self-contained, visible placeholder for the detected face (50x50 blue square)
        const detectedFacePlaceholder = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABFSURBVChTY2RgYNgHxMzAgAFgDjI2NnY2BgYGBkYGFmY2BlYGFmY2BgYGFmY2BlYGFmY2BgYGFmY2BlYGFmY2BgYGFmY2BgYGAHw6D4s8NBJzAAAAAElFTkSuQmCC"; 
        data = { 
          success: true, 
          faceImageUrl: detectedFacePlaceholder, 
          message: 'Face detected successfully.' 
        };
      } else {
        data = {
          success: false,
          faceImageUrl: null,
          message: 'No face detected in the ID card.'
        };
      }
      console.log('[extractFaceFromAPI] After simulated delay. Simulated data:', data);

      const conditionMet = data.success && data.faceImageUrl;
      console.log('[extractFaceFromAPI] Condition (data.success && data.faceImageUrl) is:', conditionMet);

      if (conditionMet) {
        setDetectedFacePreview(data.faceImageUrl);
        setIsFaceDetected(true);
        console.log('[extractFaceFromAPI] setIsFaceDetected(true) called.');
      } else {
        setDetectedFacePreview('');
        setIsFaceDetected(false);
        setErrorMessage(data.message || 'Failed to detect face.');
        console.log('[extractFaceFromAPI] setIsFaceDetected(false) called. Message:', data.message);
      }
    } catch (error) {
      console.error('[extractFaceFromAPI] Error in API call:', error);
      setDetectedFacePreview('');
      setIsFaceDetected(false);
      setErrorMessage('An error occurred while processing the image. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('[extractFaceFromAPI] isLoading set to false in finally block.');
    }
  };

  const handleNext = () => {
    if (isFaceDetected && onNextPage) {
      onNextPage();
    }
  };

  const handleExit = () => {
    console.log("Exit button clicked");
    setSelectedIdImage(null);
    setIdImagePreview('');
    setDetectedFacePreview('');
    setIsFaceDetected(false);
  };

  return (
    <div className="id-card-upload-container">
      <h2>Step 1: Upload ID Card</h2>
      <p>Please select the front side of your national identity card.</p>

      <div className="upload-section">
        <input
          type="file"
          accept="image/png, image/jpeg, image/bmp"
          onChange={handleImageSelect}
          id="idCardInput"
          style={{ display: 'none' }}
        />
        <label htmlFor="idCardInput" className="custom-file-upload">
          Select ID Card Image
        </label>
        {/* Temporary button for simulation */}
        <button
          onClick={() => {
            const mockFile = new File(["dummy"], "dummy.jpg", { type: "image/jpeg" });
            setSelectedIdImage(mockFile);
            const placeholderImageUrl = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            setIdImagePreview(placeholderImageUrl);
            setDetectedFacePreview('');
            setIsFaceDetected(false);
            setErrorMessage('');
            extractFaceFromAPI(mockFile, placeholderImageUrl);
          }}
          style={{ marginLeft: '10px', padding: '10px', backgroundColor: 'orange' }}
        >
          Simulate File Select
        </button>
      </div>

      <div className="images-display-section">
        <div className="image-preview-container">
          <h3>ID Card Preview:</h3>
          {idImagePreview ? (
            <img src={idImagePreview} alt="ID Card Preview" className="image-preview" />
          ) : (
            <div className="image-placeholder">No image selected</div>
          )}
        </div>

        <div className="image-preview-container">
          <h3>Detected Face:</h3>
          {detectedFacePreview ? (
            <img src={detectedFacePreview} alt="Detected Face Preview" className="image-preview" />
          ) : (
            <div className="image-placeholder">No face detected yet</div>
          )}
        </div>
      </div>

      {isLoading && <p className="loading-message">Detecting face, please wait...</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="navigation-buttons">
        <button onClick={handleExit} className="button-exit">Exit</button>
        <button onClick={handleNext} disabled={!isFaceDetected} className="button-next">
          Next
        </button>
      </div>
    </div>
  );
}

export default IDCardUpload;
