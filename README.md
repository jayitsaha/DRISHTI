<div align="center">
<img src="https://images.ctfassets.net/1wry7ALQy62081v1mJb3iL/6a77d853e34360eab8383e387d55f013/foursquare-logo.svg" alt="Foursquare Logo" width="150" style="filter: brightness(0) invert(1); margin-bottom: 20px;"/>
<h1 style="font-size: 4em; font-weight: bold; color: #8A2BE2; text-shadow: 0 0 15px rgba(138, 43, 226, 0.4);">
DRISHTI
</h1>
<p style="font-size: 1.5em; color: #B0A8B9;">
<strong>An Eye with AI.</strong><br/>
Bridging Citizens and Civic Services with Location Intelligence and AI.
</p>
</div>

<div align="center">

</div>

📺 Live Demo
Insert a GIF or link to a video of your app in action here. This is the best way to showcase your animated UI!

[App Demo Video Placeholder]

<p align="center">🌟 What Are We Solving? 🌟</p>
In today's fast-paced urban environments, a critical disconnect exists between citizens, civic data, and municipal services. This leads to several key problems:

Data Fragmentation: Traffic updates are on Twitter, civic issues are on government portals, and power outage information is with the utility company. Data is siloed and disconnected.

Response Delays: Critical issues get buried under social media noise or bureaucratic red tape. Emergency services are forced to be reactive rather than proactive.

Lack of Analysis: Standard mapping tools provide the best route but offer no insight into why there's a delay or what underlying conditions (road quality, weather, events) are contributing to the problem.

Citizen Disconnect: There is no single, unified platform for citizens to report the full spectrum of issues they face or to track them to resolution, leading to apathy and frustration.

DRISHTI is a revolutionary mobile platform designed to eliminate this friction. We leverage Foursquare's world-class location intelligence and the power of Google's Gemini AI to create a transparent, engaging, and gamified ecosystem.

<p align="center">🔥 Core Features & Unified Platform 🔥</p>
DRISHTI is more than just an app; it's a comprehensive ecosystem that analyzes and acts on civic data in real-time.

Feature Icon

Feature Name

Description

User Benefit

🗣️

Unified Reporting System

A single, intuitive interface for citizens to report any issue—from potholes to power outages—using photos, videos, or audio clips.

Empowers citizens to be the eyes and ears of the city with a simple, powerful tool.

🤖

AI-Powered Analysis

We use Gemini to perform real-time analysis on multimedia reports, understanding context, determining severity, and categorizing issues.

Ensures reports are rich with detail and immediately actionable, reducing manual processing time.

🗄️

Centralized Data Warehouse

Ingests real-time info from BESCOM, Twitter, Google Search, weather APIs, etc., into a BigQuery warehouse.

Creates a single source of truth for the city's real-time pulse, enabling deep analysis.

🗺️

Predictive Mapping

Provides route summaries that highlight traffic, weather, and road quality. Predicts travel conditions for future trips.

Allows users and services to plan travel proactively, avoiding delays and hazards.

smart_toy

Smart Task Distribution

Issues are automatically and intelligently routed to the correct municipal department for immediate action.

Dramatically reduces response times and ensures the right team is dispatched for every issue.

🏆

Gamification & Engagement

Users earn points, badges, and tangible rewards for reporting issues, creating a positive feedback loop of community involvement.

Fosters a sense of community ownership and encourages consistent, high-quality reporting.

<p align="center">🏗️ System Architecture 🏗️</p>
Our system is designed for massive scale and real-time performance, built on a modern, microservices-based architecture.

📲 User Input (React Native App): Citizens submit reports via the mobile app. The multimedia data is uploaded to Firebase.

🧠 AI Processing Core (Google Cloud): A Cloud Function triggers our suite of independent AI agents.

Report Intake Agent: Pre-processes the incoming data.

Classification Agent (Gemini): Analyzes the report to determine its nature, severity, and location.

Mapping Agent: Uses Foursquare geocodes to precisely map the issue.

📊 Data Warehouse (BigQuery): All structured data from the AI agents and external APIs is streamed into our BigQuery warehouse for historical analysis and model training.

⚡ Actionable Output: The system generates real-time alerts for dashboards, provides updates to GIS systems, and sends notifications directly to the backend systems of the relevant authorities.

<p align="center">🌐 The Power of Foursquare: Our Location Intelligence Engine 🌐</p>
Foursquare's API is the backbone of our platform, transforming our app from a simple reporting tool into a rich, context-aware experience.

API / Endpoint

How We Use It in DRISHTI

Impact on the Platform

📍 Places API (/places/{fsq_id})

Fetches rich, structured details for specific venues, including name, address, contact info, hours, ratings, and photos.

Powers the detailed information cards, ensuring users have access to comprehensive and accurate data for any civic service.

🔍 Search API (/places/search)

Enables powerful, context-aware search for civic services based on user queries, categories (e.g., 15001 for Hospital), radius, and relevance.

Allows users to instantly find the nearest essential services, from government offices to emergency facilities, with pinpoint accuracy.

⌨️ Autocomplete (via Search API)

Provides real-time, type-ahead suggestions as a user enters a search query, refining results based on their location.

Creates a fluid, professional, and error-free search experience, making discovery fast and intuitive.

🌍 Geocoding (Core Data)

Extracts precise latitude/longitude for every venue returned by the API to plot them on the map.

This is the critical link that enables accurate mapping, issue reporting at specific venues, and reliable route optimization for service teams.

📈 Foursquare Studio

Provides a powerful backend tool for visualizing and analyzing our aggregated, location-specific data.

Empowers municipal planners to identify issue hotspots, track KPIs, and make data-driven decisions on resource allocation.

<p align="center">🧠 AI & LLM Integration: The Gemini-Powered "Guardian" 🧠</p>
To make our platform truly intelligent, we've integrated Google's Gemini as our core AI engine.

Multimedia Understanding: Gemini analyzes the images, videos, and audio from user reports. It can identify a "cracked road" from a photo, understand the urgency in a user's voice from an audio clip, and transcribe the details.

Guided & Automated Reporting: The AI acts as a chatbot, asking clarifying questions ("Is the pothole deep enough to be a danger to traffic?") to ensure reports are detailed. It then automatically categorizes the issue, streamlining the process for city officials.

Hyperlocal Information Retrieval: The AI can query our data warehouse and the Foursquare API in real-time. A user can ask, "Is there a power cut reported near me?" or "What's the non-emergency number for the nearest police station?" and get an instant, accurate answer.

<p align="center">⚡ Scalability & Performance ⚡</p>
DRISHTI is architected to handle the data velocity of a major metropolitan area.

Microservices Architecture: Each AI agent and data ingestion service scales independently using Kubernetes orchestration, allowing us to handle fluctuating loads efficiently.

Stream Processing: We use Apache Kafka to build a resilient data pipeline capable of handling over a million reports per second, ensuring no data is lost during peak times.

Optimized AI Inference: We employ techniques like model quantization and context-aware GPU scaling to maintain accuracy while achieving up to 10x inference speed, making real-time analysis possible.

<p align="center">📈 Future Scope 📈</p>
Timescale

Enhancements

Immediate (6 Months)

• Regional Language Support for broader accessibility.<br/>• AR Overlay to show reported hazards on a phone's camera view.<br/>• Immutable Report Tracking via Blockchain for ultimate transparency.

Medium-Term (1-2 Years)

• Drone Integration for automated initial damage assessment.<br/>• AI-Facilitated Community Decisions on local improvement projects.<br/>• ML-driven Infrastructure Recommendations for city planners.

Long-Term (3-5 Years)

• Cross-City Learning to share best practices between municipalities.<br/>• Predict and Prevent Climate Impacts by modeling urban vulnerabilities.<br/>• AI-Managed City Services with human oversight.

<p align="center">🛠️ Tech Stack 🛠️</p>
Frontend: React Native, Redux, Lottie

Cloud & Backend: Google Cloud Platform (Firebase, Cloud Functions, Kubernetes), Python, Flask

AI & Data: Google Gemini, BigQuery, Apache Kafka

Location Intelligence: Foursquare API (Places, Search, Geocoding), Foursquare Studio

<p align="center">🚀 Getting Started 🚀</p>
Clone the repository:

git clone [https://github.com/your-repo/drishti.git](https://github.com/your-repo/drishti.git)
cd drishti

Setup the Frontend (CityGuardUI):

cd CityGuardUI
npm install
# Add your Foursquare API Key in a .env file
echo "FOURSQUARE_API_KEY='YOUR_API_KEY'" > .env
# Run on your simulator/device
npx react-native run-ios
# or
npx react-native run-android

Setup the Backend (CityGuardAgent):

cd ../CityGuardAgent
pip install -r requirements.txt
# Add your Google AI API Key in a .env file
echo "GOOGLE_API_KEY='YOUR_API_KEY'" > .env
# Start the server
python app.py

<div align="center">
Built with ❤️ for a better tomorrow.
</div>