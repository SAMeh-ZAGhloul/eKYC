
import cv2 as cv
from PyQt5.QtCore import QRect, QTimer, Qt
from PyQt5.QtGui import QFont, QImage, QPixmap, QPen, QPainter
from PyQt5.QtWidgets import QDialog, QLabel

from .utils import *
from utils.functions import extract_face


class VerificationWindow(QDialog):
    def __init__(self, camera, main_window, parent=None):
        super().__init__(parent)
        
        self.main_window = main_window
        
        # set window size
        self.window_heigt = 600
        self.window_width = 1200
        self.setWindowTitle('Verification')
        self.setGeometry(100, 100, self.window_width, self.window_heigt)
        self.setFixedSize(self.window_width, self.window_heigt)

        # font
        self.font = QFont()
        self.font.setPointSize(13)
        self.font.setFamily("Times New Roman")

        # title
        self.label = QLabel(self)
        self.label.setText("Please keep your face in front of the camera and come closer to the camera.")
        self.label.move(270, 100)
        self.label.setFont(self.font)
        
        # process label
        self.process_label = QLabel(self)
        self.process_label.move(530, 450)
        self.process_label.setFont(self.font)
        self.update_process_label()
        
        self.count_frame = 0
        
        # camera label
        self.camera_label = QLabel(self)
        self.camera = camera # Open the default camera (usually the built-in webcam)
        self.timer = QTimer(self)
        
        # Face detection feedback display
        self.face_label = QLabel(self)
        self.face_text = QLabel(self)
        self.face_text.setText('Detected Face:')
        self.face_text.setFont(self.font)
        self.face_text.hide()
        
        # Match score display
        self.match_score = 0
        self.match_score_label = QLabel(self)
        self.match_score_label.setFont(self.font)
        self.match_score_label.setText('Match Score: 0%')
        self.match_score_label.setStyleSheet("font-weight: bold; color: #333;")
        self.match_score_label.hide()
        
        # Match flag display
        self.match_flag_label = QLabel(self)
        self.match_flag_label.setFont(self.font)
        self.match_flag_label.setStyleSheet("font-weight: bold;")
        self.match_flag_label.hide()
        
        # button
        self.next = add_button(self, "Next", 960, 500, 150, 50, self.next_switch_page, disabled= True)
        self.back = add_button(self, "Back", 240, 500, 150, 50, self.back_switch_page)
        self.exit = add_button(self, "Exit", 600, 500, 150, 50, exit)

        # trạng thái sau khi được xác 
        self.verified = False
        
        self.verification_image = None
        self.face_box = None
        self.face_detected = False
        
    def update_process_label(self, text = None):
        if text is not None:
            self.process_label.setText(text)
        self.process_label.adjustSize()
        self.process_label.show()
        
    def rescale_image(self):
        return 480, 360
    
    def update_camera(self):
        ret, frame = self.camera.read()
        if ret:
            self.count_frame += 1
            frame = cv.flip(frame, 1)
            frame = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
            
            # Detect face in camera frame
            face, box, landmarks = extract_face(frame, self.main_window.mtcnn, padding=1.5)
            self.face_box = box
            
            # Draw box around face if detected
            display_frame = frame.copy()
            if box is not None:
                self.face_detected = True
                x1, y1, x2, y2 = box.astype(int)
                cv.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                
                # Display detected face
                if face is not None:
                    face_rgb = cv.cvtColor(face, cv.COLOR_RGB2BGR)
                    h, w, c = face_rgb.shape
                    qimg = QImage(face_rgb.data, w, h, w * c, QImage.Format_RGB888)
                    pixmap = QPixmap.fromImage(qimg)
                    
                    # Position face display to the right of camera feed
                    self.face_text.move(850, 180)
                    self.face_text.show()
                    
                    # Display detected face with increased size (200x200)
                    self.face_label.setGeometry(QRect(850, 220, 200, 200))
                    self.face_label.setPixmap(pixmap.scaled(200, 200, Qt.KeepAspectRatio))
                    self.face_label.show()
            else:
                self.face_detected = False
                self.face_text.hide()
                self.face_label.hide()
            
            # Display camera feed with face box
            height, width, channel = display_frame.shape
            bytes_per_line = channel * width
            image = QImage(display_frame.data, width, height, bytes_per_line, QImage.Format_RGB888)
            pixmap = QPixmap.fromImage(image)
            width, height = self.rescale_image()
            self.camera_label.setGeometry(QRect(600 - width //2 , 150, width, height))
            self.camera_label.setPixmap(pixmap)
            
            if self.count_frame == 50:
                self.update_process_label(text = "Verifying...")
                self.verification_image = frame
                # Delegate verification to main window's method
                self.main_window.verify()
                self.match_score = self.main_window.fourth_page.match_score
                
                # Display match score
                score_color = "red"
                if self.match_score > 70:
                    score_color = "green"
                elif self.match_score > 50:
                    score_color = "orange"
                    
                #self.match_score_label.setText(f'Match Score: <font color={score_color}>{self.match_score:.1f}%</font>')
                from numpy import cos
                cos_score = cos(self.match_score/100)
                self.match_score_label.setText(f'Match Score: {100*cos_score:.1f}')
                print("\nPage 2===> ", self.match_score, cos_score)

                self.match_score_label.adjustSize()
                self.match_score_label.move(850, 430)
                self.match_score_label.show()
                
                # Display match/no-match flag
                if self.match_score >= 50.0:
                    self.match_flag_label.setText(f'<font color="green">MATCH</font>')
                else:
                    self.match_flag_label.setText(f'<font color="red">NO MATCH</font>')
                self.match_flag_label.adjustSize()
                self.match_flag_label.move(1000, 430)
                self.match_flag_label.show()
                
                if not self.main_window.face_verified:
                    self.count_frame = 0
                    self.update_process_label(text = "<font color = red>Verification failed!</font>")
                    self.next.setDisabled(True)
                else:
                    self.update_process_label(text = "<font color = green>Verification successful!</font>")
                    self.main_window.face_verified = True
                    self.next.setEnabled(self.main_window.face_verified)

    def next_switch_page(self):
        self.main_window.switch_page(2)  
        
    def back_switch_page(self):
        self.main_window.switch_page(0)  

    def open_camera(self):
        # Disconnect any existing connections to avoid multiple connections
        try:
            self.timer.timeout.disconnect()
        except:
            pass
        self.timer.timeout.connect(self.update_camera)
        self.timer.start(30)  # Update every 30 milliseconds
        
        # Initialize camera label with proper dimensions
        width, height = self.rescale_image()
        self.camera_label.setGeometry(QRect(800 - width //2, 150, width, height))
        self.camera_label.show()

    def close_camera(self):
        self.timer.stop()

    def closeEvent(self, event):
        self.camera.release()
        self.timer.stop()
        event.accept()
    
    def clear_window(self):
        self.process_label.hide()
        self.face_label.hide()
        self.face_text.hide()
        self.match_score_label.hide()
        self.match_flag_label.hide()
        self.count_frame = 0
        self.match_score = 0

    def update_verification_image(self, image):
        # Convert image to QPixmap and display
        h, w, c = image.shape
        qimg = QImage(image.data, w, h, w * c, QImage.Format_RGB888)
        pixmap = QPixmap.fromImage(qimg)
        
        # Display face with landmarks
        self.face_text.move(750, 180)
        self.face_text.show()
        self.face_label.setGeometry(QRect(700, 220, 200, 200))
        self.face_label.setPixmap(pixmap.scaled(200, 200))
        self.face_label.show()