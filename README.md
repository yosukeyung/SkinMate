# SkinMate 🌟

SkinMate is an AI-powered skincare companion that utilizes Computer Vision to analyze your skin type and detect acne. By uploading a photo or using your camera, SkinMate provides a detailed assessment of your skin condition, visualizes acne zones, and offers personalized, ingredient-focused skincare recommendations.

> **Disclaimer:** SkinMate is an educational AI research project. It is designed to support skincare awareness using Computer Vision, but it is **not a medical device** and cannot replace professional advice, diagnosis, or treatment from a certified dermatologist.

## 🚀 Features

- **Skin Type Classification:** Automatically detects if your skin is Dry, Oily, or Normal using a trained EfficientNet model.
- **Acne Detection & Classification:** Uses YOLOv8 to localize blemishes and EfficientNet to classify them (Comedo vs Inflamed).
- **Zone Clustering:** Uses DBSCAN to group nearby acne and visualize "Inflamed Zones" vs "Comedo Zones".
- **Personalized Skincare Tips:** Generates dynamic skincare recommendations based on your unique combination of skin type and acne severity.
- **Progress Tracking:** Saves your scan history locally so you can visualize your skin's improvement over time via an interactive chart.
- **Visual Skin Comparison:** Compare two different scans side-by-side to see visual progress.

## 🛠️ Technology Stack

**Frontend (Client)**
- React (Vite)
- TypeScript
- CSS (Custom modular styles)
- Recharts (for Progress Tracking timeline)

**Backend / AI (Hugging Face Space)**
- FastAPI
- PyTorch & Torchvision
- Ultralytics YOLOv8 (Object Detection)
- MediaPipe (Face Cropping & Extraction)
- OpenCV & Scikit-learn (Image processing and Clustering)

## 📁 Project Structure

The repository contains the following main directories:

- `/frontend` - The React Vite application containing the web UI.
- `/hf-space` - The Python backend API designed to be deployed on Hugging Face Spaces.

## 💻 Running Locally

### 1. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and set your Backend API URL (if deploying the backend separately):
   ```env
   VITE_BACKEND_URL=http://localhost:7860
   ```
   *(Note: The frontend code may also be configured to directly call your Hugging Face Space URL).*
4. Start the development server:
   ```bash
   npm run dev
   ```

### 2. Backend Setup (Optional / Hugging Face)
1. Navigate to the backend or hf-space directory:
   ```bash
   cd hf-space
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the FastAPI server:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 7860
   ```

## 🌐 Deployment

- **Frontend:** Can be easily deployed to Vercel. Set the root directory to `frontend` and select the Vite framework preset.
- **Backend:** Designed to be hosted on Hugging Face Spaces (Docker/FastAPI). Just push the contents of the `hf-space` directory to your Hugging Face Space repository.

## 📄 License

This project was developed for educational and research purposes.
