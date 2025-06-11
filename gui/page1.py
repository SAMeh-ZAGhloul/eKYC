from PyQt5.QtCore import QPoint, QRect, Qt, QTimer
from PyQt5.QtGui import QFont, QImage, QPainter, QPen, QPixmap
from PyQt5.QtWidgets import (QApplication, QDialog, QFileDialog, QHBoxLayout,
                             QLabel, QMainWindow, QPushButton, QStackedWidget,
                             QVBoxLayout, QWidget)

import cv2 as cv
import numpy as np
from .utils import *
from utils.functions import extract_face, get_image


class IDCardPhoto(QWidget):
    def __init__(self, main_window):
        super().__init__()

        self.main_window = main_window

        self.window_heigt = 600
        self.window_width = 1200
                
        # Thiết lập tiêu đề và kích thước của cửa sổ
        self.setWindowTitle('Choose ID Card Photo')
        self.setGeometry(100, 100, self.window_width, self.window_heigt)
        self.setFixedSize(self.window_width, self.window_heigt)
        
        self.font = QFont()
        self.font.setPointSize(13)
        self.font.setFamily("Times New Roman")

        self.label = QLabel(self)
        self.label.setText('Please select the front side of your national identity card.')
        self.label.move(350, 100)
        self.label.setFont(self.font)
        
        self.exit_button = add_button(self, "Exit", 600, 500, 150, 50, exit)
    
        self.select_image_button = add_button(self, "Select ID Card", 240, 500, 150, 50, self.selectImage)
        self.next = add_button(self, "Next", 960, 500, 150, 50, self.switch_page, disabled = True)
        
        # ID card image display
        self.in_image = QLabel(self)
        
        # Face detection feedback display
        self.face_label = QLabel(self)
        self.face_text = QLabel(self)
        self.face_text.setText('Detected Face:')
        self.face_text.setFont(self.font)
        self.face_text.hide()
        
        self.img_path = None
        self.face_detected = False
    
    def switch_page(self):
        self.main_window.switch_page(1)     
        
    def rescale_image(self, width, height):
        # Reduced size for ID card (300px height instead of 400px)
        return int(width * 300 / height), 300

    def selectImage(self):
        # Hiển thị hộp thoại chọn tệp ảnh và lấy tên tệp ảnh được chọn
        file_name, _ = QFileDialog.getOpenFileName(self, 'Select Image', '', 'Image Files (*.png *.jpg *.jpeg *.bmp);;All Files (*)')
        
        if file_name:
            self.img_path = file_name
            # Tải ảnh từ tệp và hiển thị nó trên QLabel
            pixmap = QPixmap(file_name)
            img = get_image(file_name)  # Get RGB image
            
            # Resize ID card image
            width, height = self.rescale_image(img.shape[1], img.shape[0])
            self.in_image.setGeometry(QRect(400 - width //2, 200, width, height))
            self.in_image.setPixmap(pixmap.scaled(width, height))  
            self.in_image.show()
            
            # Detect face in ID card
            self.detect_face_in_id(img)
            
            # Only enable Next button if face is detected
            self.next.setDisabled(not self.face_detected)

    def detect_face_in_id(self, img):
        # Use MTCNN to detect face in ID card
        mtcnn = self.main_window.mtcnn
        face, box, landmarks = extract_face(img, mtcnn, padding=1.5)
        
        if box is not None:
            self.face_detected = True
            self.main_window.id_verified = True  # Update main window state
            self.next.setEnabled(True)  # Enable next button
            
            # Convert face to QPixmap and display
            face_rgb = cv.cvtColor(face, cv.COLOR_RGB2BGR)
            h, w, c = face_rgb.shape
            qimg = QImage(face_rgb.data, w, h, w * c, QImage.Format_RGB888)
            pixmap = QPixmap.fromImage(qimg)
            
            # Position face display to the right of ID card
            self.face_text.move(750, 180)
            self.face_text.show()
            
            # Increased size of detected face display (from 150x150 to 200x200)
            self.face_label.setGeometry(QRect(750, 220, 200, 200))
            self.face_label.setPixmap(pixmap.scaled(200, 200, Qt.KeepAspectRatio))
            self.face_label.show()
        else:
            self.face_detected = False
            self.main_window.id_verified = False  # Update main window state
            self.next.setEnabled(False)  # Disable next button
            self.face_text.hide()
            self.face_label.hide()
    
    def clear_window(self):
        self.in_image.hide()
        self.face_label.hide()
        self.face_text.hide()

    def update_id_image(self, image):
        # Convert image to QPixmap and display
        h, w, c = image.shape
        qimg = QImage(image.data, w, h, w * c, QImage.Format_RGB888)
        pixmap = QPixmap.fromImage(qimg)
        
        # Resize ID card image
        width, height = self.rescale_image(w, h)
        self.in_image.setGeometry(QRect(400 - width //2, 200, width, height))
        self.in_image.setPixmap(pixmap.scaled(width, height))
        self.in_image.show()