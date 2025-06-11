import sys

import cv2 as cv
import numpy as np

from face_verification import *
from facenet.models.mtcnn import MTCNN
from gui.page1 import *
from gui.page2 import *
from gui.page3 import *
from gui.page4 import *
from gui.utils import *
from liveness_detection.blink_detection import BlinkDetector
from liveness_detection.emotion_prediction import EmotionPredictor
from liveness_detection.face_orientation import FaceOrientationDetector
from PyQt5.QtWidgets import QApplication, QMainWindow, QStackedWidget
from utils.functions import *
from utils.plot import plot_landmarks_mtcnn
from verification_models import VGGFace2


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.window_heigt = 600
        self.window_width = 1200
        self.setWindowTitle("eKYC GUI")
        self.setGeometry(100, 100, self.window_width, self.window_heigt)
        self.setFixedSize(self.window_width, self.window_heigt)
        
        # Track verification steps completion
        self.id_verified = False
        self.face_verified = False 
        self.liveness_verified = False
        
        # Global liveness results dictionary shared between all pages
        self.liveness_results = {
            'Blink Detection': False,
            'Face Orientation': False,
            'Emotion Detection': False
        }

        # Model
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.mtcnn = MTCNN(device=self.device)

        self.verification_model = VGGFace2.load_model(device=self.device)

        self.blink_detector = BlinkDetector()
        self.face_orientation_detector = FaceOrientationDetector()
        self.emotion_preidictor = EmotionPredictor(device=self.device)

        # camera
        self.camera = cv.VideoCapture(0)
        # Check if camera opened successfully
        if not self.camera.isOpened():
            print("Error: Could not open camera.")
            self.camera = cv.VideoCapture(0)  # Try reopening
        
        # Set camera properties for better resolution
        self.camera.set(cv.CAP_PROP_FRAME_WIDTH, 640)
        self.camera.set(cv.CAP_PROP_FRAME_HEIGHT, 480)

        # stack widget
        self.stacked_widget = QStackedWidget()
        self.setCentralWidget(self.stacked_widget)
        self.first_page = IDCardPhoto(main_window=self)
        self.second_page = VerificationWindow(camera=self.camera, main_window=self)
        self.third_page = ChallengeWindow(
            camera=self.camera,
            main_window=self,
            mtcnn=self.mtcnn,
            list_models=[
                self.blink_detector,
                self.face_orientation_detector,
                self.emotion_preidictor,
            ],
        )

        self.fourth_page = ResultsWindow(main_window=self)

        self.stacked_widget.addWidget(self.first_page)
        self.stacked_widget.addWidget(self.second_page)
        self.stacked_widget.addWidget(self.third_page)
        self.stacked_widget.addWidget(self.fourth_page)

    def verify(self):
        id_image = get_image(self.first_page.img_path)
        verification_image = self.second_page.verification_image

        # Extract faces and plot landmarks
        face1, box1, landmarks1 = extract_face(id_image, self.mtcnn, padding=1)
        id_image_with_landmarks = plot_landmarks_mtcnn(id_image.copy(), landmarks1)
        self.first_page.update_id_image(id_image_with_landmarks)
        
        face2, box2, landmarks2 = extract_face(verification_image, self.mtcnn, padding=1)
        verification_image_with_landmarks = plot_landmarks_mtcnn(verification_image.copy(), landmarks2)
        self.second_page.update_verification_image(verification_image_with_landmarks)
        
        # Calculate similarity score
        distance_metric_name = "euclidean"
        model_name = "VGG-Face2"
        
        face1_transformed = face_transform(face1, model_name=model_name, device=self.verification_model.device())
        face2_transformed = face_transform(face2, model_name=model_name, device=self.verification_model.device())
        
        result1 = self.verification_model(face1_transformed)
        result2 = self.verification_model(face2_transformed)
        
        distance = Euclidean_Distance(result1, result2)
        threshold = findThreshold(model_name=model_name, distance_metric=distance_metric_name)
        
        # Calculate match percentage (lower distance means higher similarity)
        match_score = max(0, min(100, 100 * (1 - (distance.item() / (threshold * 2)))))
        self.second_page.match_score = match_score
        
        # Consider matches above 50% as verified, with threshold adjustment
        verified = match_score >= 50.0
        if verified:
            self.face_verified = True

        # Update global liveness results from third page
        self.liveness_results = {
            'Blink Detection': self.third_page.blink_passed,
            'Face Orientation': self.third_page.orientation_passed,
            'Emotion Detection': self.third_page.emotion_passed
        }
        
        # Update main window liveness verification status based on individual test results
        self.liveness_verified = all(self.liveness_results.values())
        for test, result in self.liveness_results.items():
            print("Main ===>", test, result)
            
        self.fourth_page.update_results(
            id_image=id_image_with_landmarks,
            id_face=face1,
            camera_image=verification_image_with_landmarks,
            camera_face=face2,
            match_score=match_score,
            verified=verified,
            liveness_results=self.liveness_results
        )
        
        return verified

    def switch_page(self, index):
        # Sync liveness verification status from page3 if it's been completed there
        if hasattr(self, 'third_page') and hasattr(self.third_page, 'blink_passed'):
            # Update global liveness results from third page
            self.liveness_results = {
                'Blink Detection': self.third_page.blink_passed,
                'Face Orientation': self.third_page.orientation_passed,
                'Emotion Detection': self.third_page.emotion_passed
            }
            # Update main window liveness verification status based on individual test results
            self.liveness_verified = all(self.liveness_results.values())
            
        # Validate step sequence
        if index == 1 and not self.id_verified:
            print("Please complete ID verification first")
            return
        elif index == 2 and not self.face_verified:
            print("Please complete face verification first")
            return
        elif index == 3 and not self.liveness_verified:
            print("Please complete liveness detection first")
            return
            
        if index == 0:
            self.first_page.clear_window()
            self.second_page.close_camera()
            self.third_page.close_camera()
            # Reset verification flags when returning to start
            self.id_verified = False
            self.face_verified = False
            self.liveness_verified = False
            # Reset liveness results dictionary
            self.liveness_results = {
                'Blink Detection': False,
                'Face Orientation': False,
                'Emotion Detection': False
            }

        elif index == 1:
            if self.first_page.face_detected:
                self.id_verified = True
                self.second_page.clear_window()
                self.second_page.open_camera()
                self.third_page.close_camera()
            else:
                print("No face detected in ID card")
                return

        elif index == 2:
            if self.second_page.face_detected:
                self.face_verified = True
                self.third_page.clear_window()
                self.third_page.open_camera()
                self.second_page.close_camera()
            else:
                print("Face verification not completed")
                return

        self.stacked_widget.setCurrentIndex(index)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    main_window = MainWindow()
    main_window.show()
    sys.exit(app.exec_())
