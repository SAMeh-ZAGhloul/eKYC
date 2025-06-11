# syntax=docker/dockerfile:1
FROM python:3.10-slim

# Install system dependencies for OpenCV and dlib
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libopencv-dev \
    python3-opencv \
    libx11-dev \
    libatlas-base-dev \
    libgtk-3-dev \
    libboost-python-dev \
    python3-pyqt5 \
    qt5-qmake \
    qtbase5-dev \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies in smaller batches with memory optimization
RUN    pip3 install PyQt5==5.15.11
RUN    pip3 install requests==2.32.3 numpy==1.26.4 
RUN    pip3 install Pillow==9.4.0 matplotlib==3.7.1 imutils==0.5.4 
RUN    pip3 install opencv-python==4.8.1.78 
RUN    pip3 install dlib==19.24.0 
RUN    pip3 install torch==2.0.1 torchvision==0.15.2

# Copy the rest of the application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONFAULTHANDLER=1

# Command to run the application
CMD ["python3", "main.py"]