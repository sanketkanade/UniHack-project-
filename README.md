# Kinship (UniHack Project)

Kinship is a full-stack platform built for UniHack. It features a Next.js frontend application and a Python FastAPI backend. The application aims to facilitate community connections, offering features like tag extraction, matchmaking, and a map interface for local proximity tracking.

## 🚀 Technologies Used

### Frontend (`kinship/`)
- **Framework**: Next.js 14, React 18
- **Styling**: Tailwind CSS, PostCSS
- **State Management**: Zustand
- **Database / Auth**: Supabase
- **Maps**: Leaflet, React-Leaflet
- **Other Tools**: Dexie (for PWA offline support), Simple-Peer (WebRTC), Axios

### Backend (`kinship-backend/`)
- **Framework**: FastAPI, Uvicorn (Python 3)
- **Validation**: Pydantic
- **AI / NLP Models**: Anthropic, Groq
- **Database**: Supabase
- **Environment**: python-dotenv

---

## 💻 Getting Started locally

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.9+
- A Supabase account and project
- API keys for Anthropic and Groq (if using AI features)

### 1. Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd kinship-backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   Copy `.env.example` to `.env` (or create a new `.env` file) and add your keys:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GROQ_API_KEY=your_groq_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ALLOWED_ORIGINS=http://localhost:3000
   ```
5. Run the development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 10000 --reload
   ```
   *The backend will be available at `http://localhost:10000`.*

### 2. Frontend Setup (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd kinship
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your Supabase variables and other configurations:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GROQ_API_KEY=your_groq_api_key_here
   JWT_SECRET=your_jwt_secret
   NEXT_PUBLIC_APP_NAME=Kinship
   NEXT_PUBLIC_DEFAULT_LAT=-37.800
   NEXT_PUBLIC_DEFAULT_LNG=144.899
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at `http://localhost:3000`.*

---

## 🌍 Deployment

### Deploying the Backend
The backend includes a `render.yaml` file natively configured for **Render**.
1. Connect your GitHub repository in the Render dashboard.
2. Select **Web Service** and choose the `kinship-backend` root folder.
3. Use the start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
4. Make sure to input your environment variables in the Render dashboard.

### Deploying the Frontend
The frontend is a standard Next.js application, which can easily be deployed to **Vercel** or **Netlify**.
1. Connect your GitHub app to Vercel/Netlify.
2. Set the root directory to `kinship`.
3. Add the required environment variables (especially `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the project's settings before compiling.
4. Redeploy. Ensure CORS is correctly configured by adding your live frontend URL to the backend's `ALLOWED_ORIGINS` environment variable.

---

## 📝 License
This project was built for UniHack.
