from PyQt5.QtWidgets import QWidget, QLabel, QGridLayout, QVBoxLayout, QPushButton
from PyQt5.QtGui import QPixmap, QImage
from PyQt5.QtCore import Qt
import cv2 as cv
import numpy as np

class ResultsWindow(QWidget):
    def __init__(self, main_window=None):
        super().__init__()
        self.main_window = main_window
        self.match_score = 0  # Initialize match_score
        self.init_ui()

    def init_ui(self):
        self.layout = QGridLayout()

        # ID Card Section
        self.id_section = QVBoxLayout()
        self.id_label = QLabel('ID Card Image')
        self.id_label.setAlignment(Qt.AlignCenter)
        self.id_label.setStyleSheet('font-weight: bold; font-size: 14px;')
        self.id_image = QLabel()
        self.id_face = QLabel()
        self.id_face_label = QLabel('Detected Face:')
        self.id_face_label.setStyleSheet('font-weight: bold;')
        self.id_section.addWidget(self.id_label)
        self.id_section.addWidget(self.id_image)
        self.id_section.addWidget(self.id_face_label)
        self.id_section.addWidget(self.id_face)

        # Camera Photo Section
        self.camera_section = QVBoxLayout()
        self.camera_label = QLabel('Camera Photo')
        self.camera_label.setAlignment(Qt.AlignCenter)
        self.camera_label.setStyleSheet('font-weight: bold; font-size: 14px;')
        self.camera_image = QLabel()
        self.camera_face = QLabel()
        self.camera_face_label = QLabel('Detected Face:')
        self.camera_face_label.setStyleSheet('font-weight: bold;')
        self.camera_section.addWidget(self.camera_label)
        self.camera_section.addWidget(self.camera_image)
        self.camera_section.addWidget(self.camera_face_label)
        self.camera_section.addWidget(self.camera_face)

        # Results Section
        self.results_section = QVBoxLayout()
        
        # Results Title
        self.results_title = QLabel('Verification Results')
        self.results_title.setStyleSheet('font-size: 16px; font-weight: bold; margin: 10px 5px; color: #2c3e50;')
        self.results_title.setAlignment(Qt.AlignCenter)
        
        # Match Score and Status
        self.match_score_label = QLabel('Match Score: N/A')
        self.match_score_label.setStyleSheet('font-size: 14px; font-weight: bold; margin: 5px;')
        self.match_status_label = QLabel('Verification Status: N/A')
        self.match_status_label.setStyleSheet('font-size: 16px; font-weight: bold; margin: 5px;')
        
        # Liveness Results
        self.liveness_title = QLabel('Liveness Detection Results')
        self.liveness_title.setStyleSheet('font-size: 14px; font-weight: bold; margin: 10px 5px; color: #2c3e50;')
        self.liveness_results_label = QLabel('No results available')
        self.liveness_results_label.setStyleSheet('margin: 5px; padding: 10px;')
        self.liveness_results_label.setWordWrap(True)
        
        # Add widgets to results section
        self.results_section.addWidget(self.results_title)
        self.results_section.addWidget(self.match_score_label)
        self.results_section.addWidget(self.match_status_label)
        self.results_section.addWidget(self.liveness_title)
        self.results_section.addWidget(self.liveness_results_label)
        self.results_section.addStretch()

        # Back Button with styling
        self.back_button = QPushButton('Back to Start')
        self.back_button.setStyleSheet(
            'QPushButton {background-color: #3498db; color: white; padding: 8px 15px; '
            'border-radius: 4px; font-weight: bold;} '
            'QPushButton:hover {background-color: #2980b9;}'
        )
        self.back_button.clicked.connect(lambda: self.main_window.switch_page(0))

        # Add sections to grid
        self.layout.addLayout(self.id_section, 0, 0)
        self.layout.addLayout(self.camera_section, 0, 1)
        self.layout.addLayout(self.results_section, 0, 2)
        self.layout.addWidget(self.back_button, 1, 1)

        self.setLayout(self.layout)

    def update_results(self, id_image, id_face, camera_image, camera_face, match_score, verified, liveness_results):
        # Update ID card images
        self.update_image_label(self.id_image, id_image)
        self.update_image_label(self.id_face, id_face)

        # Update camera images
        self.update_image_label(self.camera_image, camera_image)
        self.update_image_label(self.camera_face, camera_face)

        self.match_score = match_score
        # Update match results with color coding
        score_color = '#28a745' if match_score >= 50.0 else '#dc3545'

        #self.match_score_label.setText(f'Match Score: {match_score:.1f}%')
        from numpy import cos
        cos_score = cos(match_score/100)
        self.match_score_label.setText(f'Match Score: {100*cos_score:.1f}')
        print("\nPage 4===> ", match_score, cos_score)

        self.match_score_label.setStyleSheet(f'font-size: 14px; font-weight: bold; margin: 5px; color: {score_color}')
        
        status = 'MATCH' if verified else 'NO MATCH'
        status_color = '#28a745' if verified else '#dc3545'
        self.match_status_label.setText(f'Verification Status: {status}')
        self.match_status_label.setStyleSheet(f'font-size: 16px; font-weight: bold; margin: 5px; color: {status_color}')

        # Update liveness results with improved formatting
        liveness_text = '<div style="font-family: Arial; font-size: 13px;">'        
        for test, result in liveness_results.items():
            print("Page4 ===>", test, result)
            status = '✓ PASSED' if result else '✗ FAILED'
            status_color = '#28a745' if result else '#dc3545'
            test_style = 'font-weight: normal; margin-right: 10px;'
            status_style = f'font-weight: bold; color: {status_color};'
            liveness_text += f'<div style="background: #f8f9fa; padding: 8px; margin: 5px 0; border-radius: 4px;">' \
                           f'<span style="{test_style}">{test}:</span>' \
                           f'<span style="{status_style}">{status}</span></div>'
        liveness_text += '</div>'
        self.liveness_results_label.setText(liveness_text)
        self.liveness_results_label.setTextFormat(Qt.RichText)

    def update_image_label(self, label, image):
        if image is None:
            return
        
        if isinstance(image, np.ndarray):
            height, width = image.shape[:2]
            if len(image.shape) == 2:  # Grayscale
                image = cv.cvtColor(image, cv.COLOR_GRAY2RGB)
            elif image.shape[2] == 3:  # BGR to RGB
                image = cv.cvtColor(image, cv.COLOR_BGR2RGB)
            
            bytes_per_line = 3 * width
            q_image = QImage(image.data, width, height, bytes_per_line, QImage.Format_RGB888)
            pixmap = QPixmap.fromImage(q_image)
        else:
            pixmap = QPixmap(image)

        # Scale the image to fit the label while maintaining aspect ratio
        label.setPixmap(pixmap.scaled(300, 300, Qt.KeepAspectRatio))

    def clear_window(self):
        self.id_image.clear()
        self.id_face.clear()
        self.camera_image.clear()
        self.camera_face.clear()
        self.match_score_label.setText('Match Score: N/A')
        self.match_score_label.setStyleSheet('font-size: 14px; font-weight: bold; margin: 5px; color: #6c757d')
        self.match_status_label.setText('Verification Status: N/A')
        self.match_status_label.setStyleSheet('font-size: 16px; font-weight: bold; margin: 5px; color: #6c757d')
        self.liveness_results_label.setText('No liveness detection results available')
        self.liveness_results_label.setStyleSheet('color: #6c757d; margin: 5px; padding: 10px;')
        
    def update_liveness_results(self, liveness_results):
        """Update only the liveness detection results section"""
        # Update liveness results with improved formatting
        liveness_text = '<div style="font-family: Arial; font-size: 13px;">'
        for test, result in liveness_results.items():
            print("Page4 ==>", test, result)
            status = '✓ PASSED' if result else '✗ FAILED'
            status_color = '#28a745' if result else '#dc3545'
            test_style = 'font-weight: normal; margin-right: 10px;'
            status_style = f'font-weight: bold; color: {status_color};'
            liveness_text += f'<div style="background: #f8f9fa; padding: 8px; margin: 5px 0; border-radius: 4px;">' \
                           f'<span style="{test_style}">{test}:</span>' \
                           f'<span style="{status_style}">{status}</span></div>'
        liveness_text += '</div>'
        self.liveness_results_label.setText(liveness_text)
        self.liveness_results_label.setTextFormat(Qt.RichText)