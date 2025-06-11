import cv2 as cv
from PyQt5.QtCore import QRect, QTimer, Qt
from PyQt5.QtGui import QFont, QImage, QPixmap
from PyQt5.QtWidgets import QDialog, QLabel

from .utils import *
from challenge_response import *

class ChallengeWindow(QDialog):
    def __init__(self, camera, main_window, mtcnn, list_models = [], parent=None):
        super().__init__(parent)
        
        self.main_window = main_window
        
        self.window_heigt = 600
        self.window_width = 1200
                
        # Thiết lập tiêu đề và kích thước của cửa sổ
        self.setWindowTitle('Challenge response')
        self.setGeometry(100, 100, self.window_width, self.window_heigt)
        self.setFixedSize(self.window_width, self.window_heigt)

        self.font = QFont()
        self.font.setPointSize(13)
        self.font.setFamily("Times New Roman")

        self.label = QLabel(self)
        self.label.setText('Verify your authenticity by completing the following challenges.')
        self.label.move(300, 50)
        self.label.setFont(self.font)
        self.label.setStyleSheet("font-weight: bold; color: #000000;")
        self.label.adjustSize()
        
        # Challenge instruction label with improved visibility
        self.challenge_label = QLabel(self)
        self.font_challenge = QFont()
        self.font_challenge.setPointSize(14)
        self.font_challenge.setFamily("Times New Roman")
        self.challenge_label.setFont(self.font_challenge)
        self.challenge_label.move(400, 400)
        self.challenge_label.setStyleSheet("font-weight: bold; color: #0066CC; background-color: rgba(255, 255, 255, 0.7); padding: 5px;")
        self.challenge_label.setMinimumWidth(400)
        self.challenge_label.setAlignment(Qt.AlignCenter)
        self.update_challenge_label()
        
        self.camera_label = QLabel(self)

        self.camera = camera  # Open the default camera (usually the built-in webcam)
        self.timer = QTimer(self)
        
        # buttons
        self.back = add_button(self, "Back", 400, 500, 150, 50, self.back_switch_page)
        self.next = add_button(self, "Next", 960, 500, 150, 50, self.next_switch_page)
        self.next.setEnabled(False)  # Initially disabled until all challenges are completed
        
        #  models
        self.list_models = list_models
        self.mtcnn = mtcnn
        self.count_frame = 0
        self.isCorrect = False
        self.count_correct = 0 # đếm số câu hỏi đúng 
        self.count_delay_frame = 0 # 
        self.challenge, self.question = get_challenge_and_question()
        
        # Initialize liveness detection results and challenge tracking
        self.blink_passed = False
        self.orientation_passed = False
        self.emotion_passed = False
        self.completed_challenges = set()  # Track which challenges have been completed
        self.liveness_results = self.main_window.liveness_results  # Reference to main window's liveness results
        
    def rescale_image(self):
        return 480, 360
    
    def update_camera(self):
        ret, frame = self.camera.read()
        if ret:
            frame = cv.flip(frame, 1)
            frame = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
            height, width, channel = frame.shape
            bytes_per_line = channel * width
            image = QImage(frame.data, width, height, bytes_per_line, QImage.Format_RGB888)
            pixmap = QPixmap.fromImage(image)
            width, height = self.rescale_image()
            self.camera_label.setGeometry(QRect(600 - width //2 , 120, width, height))
            self.camera_label.setPixmap(pixmap)
            
            # Start showing challenges after a short delay (100 frames)
            if self.count_delay_frame < 100:
                self.count_delay_frame += 1
                # Show initial instruction while waiting
                if self.count_delay_frame == 1:
                    self.update_challenge_label(text="<font color = blue>Preparing challenges...</font>")
                if self.count_delay_frame == 99:
                    # Show the first challenge question
                    self.update_challenge_label(question=self.question)
            else:
                # Process challenge response
                if self.isCorrect == False and self.count_correct < 3:
                    # Check if the user completed the challenge
                    self.isCorrect = result_challenge_response(frame, self.challenge, self.question, self.list_models, self.mtcnn)
                    
                    # If challenge is completed, show success message
                    if self.isCorrect:
                        self.update_challenge_label(text="<font color = green>Correct!</font>")
                        # Update liveness detection results based on challenge type
                        if self.challenge == "blink eyes":
                            self.blink_passed = True
                            self.completed_challenges.add("blink")
                        elif self.challenge in ["right", "left", "front"] or self.challenge.startswith("turn"):
                            self.orientation_passed = True
                            self.completed_challenges.add("orientation")
                        elif self.challenge in ["smile", "surprise"] or self.challenge.startswith("make a"):
                            self.emotion_passed = True
                            self.completed_challenges.add("emotion")
                            
                        # Update liveness status in both page3 and main window
                        self.update_liveness_status()
                    
                elif self.isCorrect == True and self.count_correct < 3:
                    # Wait for a moment before showing the next challenge
                    self.count_frame += 1

                    if self.count_frame == 100:
                        self.count_correct += 1        
                        self.count_frame = 0
                        if len(self.completed_challenges) == 3:
                            # All three types of challenges completed successfully
                            self.update_challenge_label(text="<font color = green>You have successfully established your identity!</font>", coordinates=(300, 450))
                            for test, result in self.liveness_results.items():
                                print("Page3 ===>", test, result)
                            # Enable Next button when all challenges are complete
                            self.next.setEnabled(True)
                            # Update main window's liveness verification status
                            self.main_window.liveness_verified = True
                        else:
                            # Generate a new challenge that hasn't been completed yet
                            while True:
                                self.challenge, self.question = get_challenge_and_question()
                                challenge_type = "blink" if self.challenge == "blink eyes" else \
                                                "orientation" if self.challenge in ["right", "left", "front"] else \
                                                "emotion" if self.challenge in ["smile", "surprise"] else None
                                if challenge_type not in self.completed_challenges:
                                    break
                            self.update_challenge_label(question=self.question)
                            self.isCorrect = False
                        
    def back_switch_page(self):
        self.main_window.switch_page(1)
        
    def next_switch_page(self):
        self.main_window.switch_page(3)

    def closeEvent(self, event):
        self.camera.release()
        self.timer.stop()
        event.accept()
        
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
        self.camera_label.setGeometry(QRect(600 - width //2, 120, width, height))
        self.camera_label.show()
        
        # Reset challenge counters when opening camera
        self.count_frame = 0
        self.isCorrect = False
        self.count_delay_frame = 0
        self.count_correct = 0
        
        # Generate a new challenge
        self.challenge, self.question = get_challenge_and_question()
        
        # Display initial challenge instruction with prominent styling
        self.update_challenge_label(text="<font color='#0066CC' size='+1'><b>Please prepare for liveness detection challenges...</b></font>")
        
        # Ensure the challenge label is visible and properly positioned
        self.challenge_label.raise_()
        self.challenge_label.show()
        
    def close_camera(self):
        self.timer.stop()
        
    def clear_window(self):
        self.challenge_label.hide() 
        
        # Reset all challenge tracking variables
        self.blink_passed = False
        self.orientation_passed = False
        self.emotion_passed = False
        self.completed_challenges = set()
        
        # Reset counters
        self.count_frame = 0
        self.isCorrect = False
        self.count_correct = 0
        self.count_delay_frame = 0
        
        # Sync with main window's liveness results - ensure they're properly reset
        if hasattr(self, 'main_window') and hasattr(self.main_window, 'liveness_results'):
            self.main_window.liveness_results['Blink Detection'] = False
            self.main_window.liveness_results['Face Orientation'] = False
            self.main_window.liveness_results['Emotion Detection'] = False
            # Reset main window liveness verification
            self.main_window.liveness_verified = False
        
        # Reset and generate a new challenge
        self.challenge, self.question = get_challenge_and_question()
        # Make sure the challenge label will be shown when camera opens
        self.challenge_label.show()
        
        # Reset and generate a new challenge
        self.challenge, self.question = get_challenge_and_question()
        # Make sure the challenge label will be shown when camera opens
        self.challenge_label.show()
    
    def update_challenge_label(self, text = None, question = None, coordinates = None):
        assert  not (text is not None and question is not None)
        
        if text is not None:
            self.challenge_label.setText(text)
            # Center the challenge label horizontally
            self.challenge_label.move((self.window_width - self.challenge_label.width()) // 2, 400)
            
        if question is not None:
            if isinstance(self.question, str):
                text = f"<b>Question {self.count_correct + 1}/3:</b> {self.question}"
            else:
                text = f"<b>Question {self.count_correct + 1}/3:</b> {self.question[0]}"
            self.challenge_label.setText(text)
            # Center the challenge label horizontally
            self.challenge_label.move((self.window_width - self.challenge_label.width()) // 2, 400)
        
        if coordinates is not None:
            self.challenge_label.move(coordinates[0], coordinates[1])
        
        self.challenge_label.adjustSize()
        # Ensure the label has sufficient width for visibility
        if self.challenge_label.width() < 400:
            self.challenge_label.setMinimumWidth(400)
            # Re-center after adjusting width
            if coordinates is None:
                self.challenge_label.move((self.window_width - self.challenge_label.width()) // 2, 400)
        
        self.challenge_label.show()
        
        # Add NEXT button
        self.next = add_button(self, "Next", 960, 500, 150, 50, lambda: self.main_window.switch_page(3), disabled=True)
        
        # Connect liveness verification completion signal
        self.liveness_verified = False
        
    def enable_next_button(self):
        self.next.setEnabled(self.liveness_verified)

    def update_liveness_status(self):
        # Ensure main window's liveness results are synchronized with page3's results
        self.main_window.liveness_results['Blink Detection'] = self.blink_passed
        self.main_window.liveness_results['Face Orientation'] = self.orientation_passed
        self.main_window.liveness_results['Emotion Detection'] = self.emotion_passed
        
        # Check if all liveness tests passed
        all_passed = all([self.blink_passed, 
                         self.orientation_passed, 
                         self.emotion_passed])
        self.liveness_verified = all_passed
        
        # Update main window's liveness verification status
        self.main_window.liveness_verified = all_passed
        
        # Update the fourth page with the latest liveness results
        if hasattr(self.main_window, 'fourth_page'):
            self.main_window.fourth_page.update_liveness_results(self.main_window.liveness_results)
        
        # Enable next button if all tests passed
        self.enable_next_button()
        
        # Print current status for debugging
        for test, result in self.main_window.liveness_results.items():
            print("Page3 ===>" , test, result)
        