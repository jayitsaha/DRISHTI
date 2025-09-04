# CityPulse Multi-Agent Platform - FastAPI Backend with Real-time Data
# Enhanced version with actual data sources and WebSocket support (Redis removed)

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from enum import Enum
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.generativeai as genai
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import uuid
import pytz
from collections import defaultdict
import re
import os
from dotenv import load_dotenv
import hashlib

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid


# Import the existing agent classes from app.py (Redis-free version)
from app import (
    BaseAgent, DataCollectorAgent, PatternAnalyzerAgent, 
    PredictorAgent, CoordinatorAgent, AgentRole, MessageType,
    AgentMessage, AgentState, InMemoryMessageBroker,
    CityPulseMultiAgentSystem
)

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== ENHANCED DATA COLLECTORS ==============

class RealTimeDataCollector(DataCollectorAgent):
    """Enhanced data collector with real APIs and Gemini search"""
    
    def __init__(self, agent_id: str, gemini_model, db):
        super().__init__(agent_id, gemini_model, db)
        self.bangalore_tz = pytz.timezone('Asia/Kolkata')
        self._setup_real_apis()
    
    def _setup_real_apis(self):
        """Setup actual API connections"""
        self.api_keys = {
            "openweather": 'XXXXXX',
            "google_maps": 'XXXXXX',
            "twitter_bearer": '',
            # "twitter_bearer":'AAAAAAAAAAAAAAAAAAAAANmy3AEAAAAAa8VmQFcQ3IyB9%2FQGeWP%2F6p4W7Fw%3DJEscEdl0Eo9n0guT6rZyZQqWNTMrG8bgbpeIJAaXs7pdiFjDrt',
            "newsapi": 'xxxxxxx'
        }
    
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute data collection task - override parent to use real-time methods"""
        task_type = task.get("type")
        
        if task_type == "collect_data":
            data_type = task.get("data_type")
            parameters = task.get("parameters", {})
            
            # Route to appropriate collector
            if data_type == "traffic":
                areas = parameters.get("areas", ["Koramangala", "Whitefield", "Electronic City"])
                return await self.collect_real_time_traffic(areas)
            elif data_type == "power_grid" or data_type == "power":
                areas = parameters.get("areas", ["Koramangala", "Whitefield", "Electronic City"])
                return await self.collect_power_data_realtime(areas)
            elif data_type == "weather":
                return await self.collect_weather_data()
            elif data_type == "health_check":
                return {"status": "healthy", "agent": self.agent_id}
            else:
                # Fall back to parent implementation
                return await super().execute_task(task)
        
        return {"error": "Unknown task type"}
    
    async def collect_real_time_traffic(self, areas: List[str]) -> Dict[str, Any]:
        """Collect real-time traffic using Google Maps and Gemini search"""
        results = {
            "source": "real_time_traffic",
            "timestamp": datetime.now(self.bangalore_tz),
            "data": []
        }
        
        # 1. Google Maps Traffic API
        if self.api_keys["google_maps"]:
            for area in areas:
                traffic_data = await self._get_google_traffic(area)
                results["data"].append(traffic_data)
        
        # 2. Use Gemini for real-time web search
        search_prompt = f"""
        Search for current traffic conditions in Bangalore, specifically for these areas: {', '.join(areas)}
        
        Look for:
        1. Current traffic jams or congestion
        2. Accidents or incidents
        3. Road closures or diversions
        4. Real-time updates from traffic police
        5. Commuter reports on social media
        
        Focus on information from the last 2 hours. Include source URLs.
        """
        
        gemini_response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            search_prompt
        )
        
        results["gemini_search"] = gemini_response.text
        
        # 3. Twitter real-time search
        # twitter_results = await self._search_twitter_realtime(
        #     ["#BangaloreTraffic", "#BLRTraffic", "traffic jam bangalore"]
        # )

        twitter_results = []
        results["data"].extend(twitter_results)
        
        return results
    
    async def _get_google_traffic(self, area: str) -> Dict[str, Any]:
        """Get traffic data from Google Maps API"""
        if not self.api_keys["google_maps"]:
            return {"error": "Google Maps API key not configured"}
        
        try:
            # Get coordinates for the area
            geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": f"{area}, Bangalore, India",
                "key": self.api_keys["google_maps"]
            }
            
            response = await self.http_client.get(geocode_url, params=params)
            geocode_data = response.json()
            
            if geocode_data.get("results"):
                location = geocode_data["results"][0]["geometry"]["location"]
                lat, lng = location["lat"], location["lng"]
                
                # Get nearby traffic incidents
                places_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                params = {
                    "location": f"{lat},{lng}",
                    "radius": 2000,
                    "key": self.api_keys["google_maps"]
                }
                
                # Fix: Use self.http_client instead of client
                traffic_response = await self.http_client.get(places_url, params=params)
                
                return {
                    "area": area,
                    "coordinates": {"lat": lat, "lng": lng},
                    "timestamp": datetime.now(self.bangalore_tz).isoformat(),
                    "traffic_data": traffic_response.json()
                }
            
            return {"area": area, "error": "Could not geocode location"}
            
        except Exception as e:
            logger.error(f"Error getting Google traffic data: {e}")
            return {"area": area, "error": str(e)}
    
    async def _search_twitter_realtime(self, keywords: List[str]) -> List[Dict]:
        """Search Twitter using v2 API"""
        if not self.api_keys["twitter_bearer"]:
            return []
        
        results = []
        headers = {"Authorization": f"Bearer {self.api_keys['twitter_bearer']}"}
        
        for keyword in keywords:
            url = "https://api.twitter.com/2/tweets/search/recent"
            params = {
                "query": f"{keyword} -is:retweet",
                "max_results": 10,
                "tweet.fields": "created_at,geo,author_id,public_metrics"
            }
            
            try:
                response = await self.http_client.get(url, params=params, headers=headers)
                data = response.json()
                
                if "data" in data:
                    for tweet in data["data"]:
                        results.append({
                            "source": "twitter",
                            "type": "social_media",
                            "content": tweet["text"],
                            "created_at": tweet["created_at"],
                            "metrics": tweet.get("public_metrics", {}),
                            "keyword": keyword
                        })
            except Exception as e:
                logger.error(f"Twitter search error: {e}")
        
        return results
    
    async def collect_power_data_realtime(self, areas: List[str]) -> Dict[str, Any]:
        """Collect real-time power data using web scraping and Gemini"""
        results = {
            "source": "power_data",
            "timestamp": datetime.now(self.bangalore_tz),
            "data": []
        }
        
        # 1. BESCOM website scraping (simplified for now)
        bescom_data = await self._collect_bescom_data(areas)
        results["data"].extend(bescom_data)
        
        # 2. Gemini search for power outages
        search_prompt = f"""
        Search for current power outages or scheduled power cuts in Bangalore for these areas: {', '.join(areas)}
        
        Look for:
        1. BESCOM announcements
        2. Scheduled maintenance
        3. Unexpected outages reported by residents
        4. Power restoration updates
        
        Focus on today's information. Include specific times and affected localities.
        """
        
        gemini_response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            search_prompt
        )
        
        results["gemini_search"] = gemini_response.text
        
        # 3. Parse Gemini response to extract structured data
        parsed_outages = await self._parse_outage_info(gemini_response.text, areas)
        results["data"].extend(parsed_outages)
        
        return results
    
    async def _collect_bescom_data(self, areas: List[str]) -> List[Dict]:
        """Collect BESCOM data (simplified implementation)"""
        # In production, this would scrape actual BESCOM website
        bescom_data = []
        for area in areas:
            bescom_data.append({
                "area": area,
                "source": "bescom",
                "status": "normal",  # Would check actual status
                "timestamp": datetime.now(self.bangalore_tz).isoformat()
            })
        return bescom_data
    
    async def _get_news_articles(self, areas: List[str]) -> List[Dict]:
        """Get news articles related to traffic in specified areas"""
        articles = []
        
        # Search for news about traffic in each area
        for area in areas:
            # Simulated news search - in production would use news APIs
            articles.append({
                "source": "news",
                "type": "article",
                "area": area,
                "title": f"Traffic update for {area}",
                "content": f"Latest traffic conditions in {area} area",
                "timestamp": datetime.now(self.bangalore_tz).isoformat()
            })
        
        return articles
    
    async def _parse_outage_info(self, text: str, areas: List[str]) -> List[Dict]:
        """Parse outage information from text"""
        outages = []
        
        # Use Gemini to extract structured data
        parse_prompt = f"""
        Extract power outage information from this text into JSON format:
        
        {text}
        
        For each outage, extract:
        - area (must be one of: {', '.join(areas)})
        - start_time
        - end_time
        - type (scheduled/unscheduled)
        - affected_localities
        - reason
        
        Return as JSON array.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            parse_prompt
        )
        
        try:
            json_match = re.search(r'\[.*\]', response.text, re.DOTALL)
            if json_match:
                parsed_data = json.loads(json_match.group())
                for item in parsed_data:
                    item["source"] = "gemini_extraction"
                    item["timestamp"] = datetime.now(self.bangalore_tz).isoformat()
                    outages.append(item)
        except Exception as e:
            logger.error(f"Failed to parse outage info: {e}")
        
        return outages
    
    async def collect_weather_data(self) -> Dict[str, Any]:
        """Collect real-time weather data"""
        bangalore_lat, bangalore_lon = 12.9716, 77.5946
        
        results = {
            "source": "weather",
            "timestamp": datetime.now(self.bangalore_tz),
            "data": {}
        }
        
        if self.api_keys["openweather"]:
            url = "https://api.openweathermap.org/data/2.5/weather"
            params = {
                "lat": bangalore_lat,
                "lon": bangalore_lon,
                "appid": self.api_keys["openweather"],
                "units": "metric"
            }
            
            response = await self.http_client.get(url, params=params)
            weather_data = response.json()
            
            results["data"]["current"] = {
                "temperature": weather_data["main"]["temp"],
                "feels_like": weather_data["main"]["feels_like"],
                "humidity": weather_data["main"]["humidity"],
                "weather": weather_data["weather"][0]["main"],
                "description": weather_data["weather"][0]["description"],
                "wind_speed": weather_data["wind"]["speed"]
            }
            
            # Get forecast
            forecast_url = "https://api.openweathermap.org/data/2.5/forecast"
            forecast_response = await self.http_client.get(forecast_url, params=params)
            forecast_data = forecast_response.json()
            
            # Check for rain in next 6 hours
            rain_forecast = []
            for item in forecast_data["list"][:2]:  # Next 6 hours
                if "rain" in item:
                    rain_forecast.append({
                        "time": item["dt_txt"],
                        "rain_mm": item["rain"].get("3h", 0),
                        "probability": item.get("pop", 0)
                    })
            
            results["data"]["rain_forecast"] = rain_forecast
        
        return results

# ============== CHATBOT AGENT ==============

class CitizenInterfaceAgent(BaseAgent):
    """Chatbot agent for citizen interaction"""
    
    def __init__(self, agent_id: str, gemini_model, db):
        super().__init__(
            agent_id, 
            AgentRole.CITIZEN_INTERFACE, 
            gemini_model, 
            db
        )
        self.conversation_memory = defaultdict(list)
        self.bangalore_tz = pytz.timezone('Asia/Kolkata')
        # In-memory message queue instead of Redis
        self.message_queue = defaultdict(list)
    
    async def send_message(self, target_agent_id: str, message_type: MessageType, data: Dict) -> str:
        """Send message to another agent (in-memory implementation)"""
        message = AgentMessage(
            id=str(uuid.uuid4()),
            from_agent=self.agent_id,
            to_agent=target_agent_id,
            message_type=message_type,
            data=data,
            timestamp=datetime.utcnow()
        )
        
        # Store in memory queue
        self.message_queue[target_agent_id].append({
            "id": message.id,
            "from_agent": message.from_agent,
            "to_agent": message.to_agent,
            "message_type": message.message_type.value,
            "data": message.data,
            "timestamp": message.timestamp.isoformat(),
            "correlation_id": message.correlation_id,
            "priority": message.priority
        })
        
        return message.id
    
    async def process_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Process incoming messages"""
        if message.message_type == MessageType.DATA_REQUEST:
            # Handle data requests from other agents
            data_type = message.data.get("data_type")
            if data_type == "citizen_query":
                query = message.data.get("query")
                user_id = message.data.get("user_id")
                location = message.data.get("location")
                
                response = await self.process_citizen_query(query, user_id, location)
                
                return AgentMessage(
                    from_agent=self.agent_id,
                    to_agent=message.from_agent,
                    message_type=MessageType.DATA_RESPONSE,
                    data=response,
                    correlation_id=message.correlation_id
                )
        
        return None
    
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute assigned tasks"""
        task_type = task.get("type")
        
        if task_type == "process_query":
            query = task.get("query")
            user_id = task.get("user_id")
            location = task.get("location")
            return await self.process_citizen_query(query, user_id, location)
        elif task_type == "health_check":
            return {"status": "healthy", "agent": self.agent_id}
        else:
            return {"error": f"Unknown task type: {task_type}"}
    
    async def process_citizen_query(self, query: str, user_id: str, location: Optional[Dict] = None) -> Dict[str, Any]:
        """Process citizen query and return response"""
        
        # Store query in conversation memory
        self.conversation_memory[user_id].append({
            "role": "user",
            "content": query,
            "timestamp": datetime.now(self.bangalore_tz)
        })
        
        # Analyze query intent
        intent = await self._analyze_intent(query)
        
        # Route to appropriate handler
        if intent["type"] == "traffic_query":
            response = await self._handle_traffic_query(query, intent, location)
        elif intent["type"] == "power_query":
            response = await self._handle_power_query(query, intent, location)
        elif intent["type"] == "weather_query":
            response = await self._handle_weather_query(query, intent)
        elif intent["type"] == "report_issue":
            response = await self._handle_issue_report(query, intent, location, user_id)
        elif intent["type"] == "general_info":
            response = await self._handle_general_query(query, intent)
        else:
            response = await self._handle_complex_query(query, intent)
        
        # Store response
        self.conversation_memory[user_id].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now(self.bangalore_tz)
        })
        
        return response
    
    async def _analyze_intent(self, query: str) -> Dict[str, Any]:
        """Analyze user query intent using Gemini"""
        
        prompt = f"""
        Analyze this citizen query about Bangalore city services:
        
        Query: "{query}"
        
        Classify the intent as one of:
        - traffic_query (asking about traffic conditions, routes, congestion)
        - power_query (asking about power cuts, outages, BESCOM)
        - weather_query (asking about weather, rain, temperature)
        - report_issue (reporting a problem or issue)
        - general_info (general city information)
        - complex_query (multiple topics or complex analysis needed)
        
        Also extract:
        - locations mentioned
        - time references (now, today, tomorrow, etc.)
        - urgency level (low/medium/high)
        - specific entities (road names, areas, etc.)
        
        Return as JSON with this exact structure:
        {{
            "type": "one of the intent types above",
            "locations": ["list of locations"],
            "time_references": ["list of time references"],
            "urgency": "low/medium/high",
            "entities": ["list of specific entities"]
        }}
        """
        
        try:
            response = await asyncio.to_thread(
                self.gemini_model.generate_content,
                prompt
            )
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                intent_data = json.loads(json_match.group())
                
                # Ensure all required fields are present
                if "type" not in intent_data:
                    intent_data["type"] = "general_info"
                if "locations" not in intent_data:
                    intent_data["locations"] = []
                if "urgency" not in intent_data:
                    intent_data["urgency"] = "medium"
                    
                return intent_data
                
        except Exception as e:
            logger.error(f"Error analyzing intent: {e}")
        
        # Default intent structure
        return {
            "type": "general_info",
            "locations": [],
            "time_references": [],
            "urgency": "medium",
            "entities": []
        }
    
    async def _handle_traffic_query(self, query: str, intent: Dict, location: Optional[Dict]) -> Dict[str, Any]:
        """Handle traffic-related queries"""
        
        # Extract locations from intent or use user location
        areas = intent.get("locations", [])
        if not areas and location:
            # Get area name from coordinates
            areas = [await self._get_area_from_coords(location["lat"], location["lng"])]
        
        if not areas:
            areas = ["Koramangala", "Whitefield", "Electronic City"]  # Default areas
        
        # Request real-time traffic data
        await self.send_message(
            "rt_collector",
            MessageType.DATA_REQUEST,
            {
                "data_type": "traffic",
                "parameters": {"areas": areas}
            }
        )
        
        # Generate user-friendly response
        response_prompt = f"""
        Generate a helpful response about traffic conditions based on:
        
        User query: "{query}"
        Areas of interest: {areas}
        Current time: {datetime.now(self.bangalore_tz).strftime('%I:%M %p IST')}
        
        Traffic data available: [Assume real-time data was collected]
        
        Provide:
        1. Current traffic status for requested areas
        2. Alternative routes if congestion detected
        3. Estimated travel times
        4. Any incidents or special conditions
        
        Keep response conversational and helpful. Use specific road names and landmarks.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            response_prompt
        )
        
        return {
            "type": "traffic_response",
            "message": response.text,
            "data": {
                "areas": areas,
                "severity": "moderate",  # Would be calculated from actual data
                "alternatives": []
            },
            "suggestions": [
                "Check real-time updates",
                "Consider metro for longer distances",
                "Avoid peak hours if possible"
            ]
        }
    
    async def _handle_power_query(self, query: str, intent: Dict, location: Optional[Dict]) -> Dict[str, Any]:
        """Handle power-related queries"""
        
        areas = intent.get("locations", [])
        if not areas and location:
            areas = [await self._get_area_from_coords(location["lat"], location["lng"])]
        
        # Request power data
        await self.send_message(
            "rt_collector",
            MessageType.DATA_REQUEST,
            {
                "data_type": "power_grid",
                "parameters": {"areas": areas}
            }
        )
        
        # Generate response
        response_prompt = f"""
        Generate a helpful response about power supply based on:
        
        User query: "{query}"
        Areas: {areas}
        Current time: {datetime.now(self.bangalore_tz).strftime('%I:%M %p IST')}
        
        Consider:
        1. Any scheduled outages
        2. Current power status
        3. Expected restoration times
        4. BESCOM helpline numbers
        
        Be specific and actionable.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            response_prompt
        )
        
        return {
            "type": "power_response",
            "message": response.text,
            "data": {
                "areas": areas,
                "outages": []  # Would be populated from actual data
            },
            "contacts": {
                "BESCOM Helpline": "1912",
                "Emergency": "080-22871912"
            }
        }
    
    async def _handle_weather_query(self, query: str, intent: Dict) -> Dict[str, Any]:
        """Handle weather-related queries"""
        
        # Generate response
        response_prompt = f"""
        Generate a helpful weather response based on:
        
        User query: "{query}"
        Current time: {datetime.now(self.bangalore_tz).strftime('%I:%M %p IST')}
        
        Provide current weather and forecast information for Bangalore.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            response_prompt
        )
        
        return {
            "type": "weather_response",
            "message": response.text,
            "data": {}
        }
    
    async def _handle_issue_report(self, query: str, intent: Dict, location: Optional[Dict], user_id: str) -> Dict[str, Any]:
        """Handle issue reporting"""
        
        # Extract issue details
        issue_prompt = f"""
        Extract issue details from this report:
        
        Report: "{query}"
        
        Extract:
        - Issue type (traffic, power, water, garbage, etc.)
        - Specific problem
        - Location details
        - Urgency
        
        Return as JSON.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            issue_prompt
        )
        
        # Generate response
        return {
            "type": "issue_report_response",
            "message": "Thank you for reporting this issue. We have logged it and will investigate.",
            "report_id": str(uuid.uuid4()),
            "status": "logged"
        }
    
    async def _handle_general_query(self, query: str, intent: Dict) -> Dict[str, Any]:
        """Handle general information queries"""
        
        response_prompt = f"""
        Provide helpful information about Bangalore city services based on:
        
        Query: "{query}"
        
        Be informative and helpful.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            response_prompt
        )
        
        return {
            "type": "general_response",
            "message": response.text
        }
    
    async def _handle_complex_query(self, query: str, intent: Dict) -> Dict[str, Any]:
        """Handle complex multi-topic queries"""
        
        response_prompt = f"""
        Provide comprehensive information for this complex query:
        
        Query: "{query}"
        
        Address all aspects mentioned in the query.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            response_prompt
        )
        
        return {
            "type": "complex_response",
            "message": response.text
        }
    
    async def _get_area_from_coords(self, lat: float, lng: float) -> str:
        """Get area name from coordinates"""
        # Simplified - in production use reverse geocoding
        areas = {
            "Koramangala": {"lat": 12.9352, "lng": 77.6245},
            "Whitefield": {"lat": 12.9698, "lng": 77.7500},
            "Indiranagar": {"lat": 12.9783, "lng": 77.6408},
            "Electronic City": {"lat": 12.8399, "lng": 77.6770}
        }
        
        # Find nearest area
        min_dist = float('inf')
        nearest_area = "Bangalore"
        
        for area, coords in areas.items():
            dist = ((coords["lat"] - lat) ** 2 + (coords["lng"] - lng) ** 2) ** 0.5
            if dist < min_dist:
                min_dist = dist
                nearest_area = area
        
        return nearest_area

# ============== AREA DATA CACHE ==============

class AreaDataCache:
    """Simple in-memory cache for area data"""
    
    def __init__(self, ttl_seconds: int = 0):  # Disabled caching
        self.cache = {}
        self.ttl = ttl_seconds
    
    def get(self, key: str) -> Optional[Dict]:
        """Get cached data if not expired"""
        # Caching disabled - always return None to force fresh data
        return None
    
    def set(self, key: str, data: Dict):
        """Set cache data with timestamp"""
        # Caching disabled - don't store anything
        pass
    
    def clear_expired(self):
        """Clear expired entries"""
        # Caching disabled - nothing to clear
        pass

# ============== SIMPLIFIED MAS WITHOUT REDIS ==============

class SimplifiedCityPulseSystem:
    """Simplified Multi-Agent System without Redis"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.agents = {}
        self.gemini_model = None
        self.db = None
        self.mongodb_client = None
    
    async def initialize(self):
        """Initialize the system"""
        # Initialize Gemini
        genai.configure(api_key=self.config["gemini_api_key"])
        self.gemini_model = genai.GenerativeModel('gemini-2.5-pro')
        
        # Initialize MongoDB
        self.mongodb_client = AsyncIOMotorClient(self.config["mongodb_url"])
        self.db = self.mongodb_client[self.config["database_name"]]
        
        # Initialize agents
        self.agents["rt_collector"] = RealTimeDataCollector(
            "rt_collector",
            self.gemini_model,
            self.db
        )
        
        self.agents["chatbot"] = CitizenInterfaceAgent(
            "chatbot",
            self.gemini_model,
            self.db
        )
        
        logger.info("Simplified CityPulse system initialized")
    
    async def shutdown(self):
        """Shutdown the system"""
        # Close MongoDB client
        if hasattr(self, 'mongodb_client') and self.mongodb_client:
            self.mongodb_client.close()

# ============== FASTAPI APPLICATION ==============

class CityPulseAPI:
    """FastAPI application for CityPulse"""
    
    def __init__(self):
        self.app = FastAPI(title="CityPulse API", version="1.0.0")
        self.setup_middleware()
        self.setup_routes()
        self.active_connections: List[WebSocket] = []
        self.mas = None  # Multi-agent system
        self.area_cache = AreaDataCache(ttl_seconds=0)  # Caching disabled
        
    def setup_middleware(self):
        """Setup CORS and other middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Configure appropriately for production
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    @asynccontextmanager
    async def lifespan(self, app: FastAPI):
        """Startup and shutdown events"""
        # Startup
        await self.initialize_system()
        yield
        # Shutdown
        await self.shutdown_system()
    
    async def initialize_system(self):
        """Initialize the multi-agent system"""
        config = {
            # "gemini_api_key": 'AIzaSyD81GmV9PIRHu64ddJtLeM2sH16jrEC1Xo',
            # "gemini_api_key": "AIzaSyCPCsOZVnVYHDkMc4sa8xAFCnHhrFSYjgs",
            "gemini_api_key": "AIzaSyBi4SRdJxbv7gBZrikckoUx8XUWrN7DMqs",
            "mongodb_url": "mongodb+srv://rashijayit:Somapal5201@citypulse.3dpayue.mongodb.net",
            "database_name": "citypulse"
        }
        
        # Initialize simplified MAS
        self.mas = SimplifiedCityPulseSystem(config)
        await self.mas.initialize()
        
        # Start background tasks
        asyncio.create_task(self.periodic_data_collection())
        asyncio.create_task(self.broadcast_updates())
        
        logger.info("CityPulse API initialized")
    
    async def shutdown_system(self):
        """Shutdown the system"""
        if self.mas:
            await self.mas.shutdown()
    
    def setup_routes(self):
        """Setup API routes"""
        
        # Health check
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.utcnow()}
        
        # Chat endpoint
        @self.app.post("/chat")
        async def chat(request: ChatRequest):
            chatbot = self.mas.agents.get("chatbot")
            if not chatbot:
                raise HTTPException(status_code=503, detail="Chatbot not available")
            
            response = await chatbot.process_citizen_query(
                request.message,
                request.user_id,
                request.location
            )
            
            return response
        
        # Real-time data endpoints
        @self.app.get("/data/traffic")
        async def get_traffic_data(areas: List[str] = None):
            if not areas:
                areas = ["Koramangala", "Whitefield", "Electronic City"]
            
            collector = self.mas.agents.get("rt_collector")
            data = await collector.collect_real_time_traffic(areas)
            
            return data
        
        @self.app.get("/data/power")
        async def get_power_data(areas: List[str] = None):
            if not areas:
                areas = ["Koramangala", "Whitefield", "Electronic City"]
            
            collector = self.mas.agents.get("rt_collector")
            data = await collector.collect_power_data_realtime(areas)
            
            return data
        
        @self.app.get("/data/weather")
        async def get_weather_data():
            collector = self.mas.agents.get("rt_collector")
            data = await collector.collect_weather_data()
            
            return data
        
        # Comprehensive city status
        @self.app.get("/city/status")
        async def get_city_status():
            # Collect all data
            areas = ["Koramangala", "Whitefield", "Electronic City", "Indiranagar"]
            collector = self.mas.agents.get("rt_collector")
            
            traffic_data = await collector.collect_real_time_traffic(areas)
            power_data = await collector.collect_power_data_realtime(areas)
            weather_data = await collector.collect_weather_data()
            
            return {
                "timestamp": datetime.utcnow(),
                "traffic": traffic_data,
                "power": power_data,
                "weather": weather_data
            }
        
        # Report issue endpoint
        @self.app.post("/report/issue")
        async def report_issue(report: IssueReport):
            # Store in database
            report_data = report.dict()
            report_data["timestamp"] = datetime.utcnow()
            report_data["status"] = "pending"
            
            result = await self.mas.db.citizen_reports.insert_one(report_data)
            
            return {
                "report_id": str(result.inserted_id),
                "status": "received",
                "message": "Your report has been received and will be analyzed"
            }
        
        # Map data endpoint
        @self.app.get("/map/data")
        async def get_map_data(data_type: str = "all"):
            """Get data formatted for map display"""
            
            map_data = {
                "type": "FeatureCollection",
                "features": []
            }
            
            if data_type in ["traffic", "all"]:
                # Get traffic hotspots
                traffic_data = await self._get_traffic_hotspots()
                map_data["features"].extend(traffic_data)
            
            if data_type in ["power", "all"]:
                # Get power outage areas
                power_data = await self._get_power_outage_areas()
                map_data["features"].extend(power_data)
            
            if data_type in ["reports", "all"]:
                # Get citizen reports
                report_data = await self._get_citizen_reports_geo()
                map_data["features"].extend(report_data)
            
            return map_data
        
        # WebSocket for real-time updates
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await websocket.accept()
            self.active_connections.append(websocket)
            
            try:
                while True:
                    # Keep connection alive and handle messages
                    data = await websocket.receive_text()
                    
                    # Handle subscribe/unsubscribe
                    message = json.loads(data)
                    if message.get("action") == "subscribe":
                        # Handle subscription logic
                        pass
                    
            except WebSocketDisconnect:
                self.active_connections.remove(websocket)

        # Unified area data endpoint
        @self.app.post("/map/areas/unified")
        async def get_unified_area_data(request: UnifiedAreaRequest):
            """
            Get comprehensive area data in a single call
            Returns both summary and detailed data to minimize API calls
            """
            # Define all areas with coordinates
            all_areas = {
                "Koramangala": {"lat": 12.9352, "lng": 77.6245},
                # "Whitefield": {"lat": 12.9698, "lng": 77.7500},
                # "Electronic City": {"lat": 12.8399, "lng": 77.6770},
                # "Indiranagar": {"lat": 12.9783, "lng": 77.6408},
                # "Jayanagar": {"lat": 12.9308, "lng": 77.5838},
                # "BTM Layout": {"lat": 12.9165, "lng": 77.6101},
                # "HSR Layout": {"lat": 12.9121, "lng": 77.6446},
                "Marathahalli": {"lat": 12.9562, "lng": 77.7019}
            }
            
            # Determine areas to process
            areas_to_process = list(all_areas.keys())
            
            # Check cache for comprehensive data (disabled - always fetch fresh)
            cache_key = f"unified:{','.join(sorted(areas_to_process))}"
            cached_response = None  # Caching disabled
            
            if cached_response and not request.force_refresh:
                logger.info(f"Returning cached unified data for {len(areas_to_process)} areas")
                return cached_response
            
            # Collect all data in one go
            collector = self.mas.agents.get("rt_collector")
            
            try:
                # Parallel data collection for all areas
                traffic_task = collector.collect_real_time_traffic(areas_to_process)
                power_task = collector.collect_power_data_realtime(areas_to_process)
                weather_task = collector.collect_weather_data()
                
                # Collect citizen reports for all areas in parallel
                citizen_reports_tasks = [
                    self.mas.db.citizen_reports.find({
                        "area": area,
                        "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
                    }).to_list(20)
                    for area in areas_to_process
                ]
                
                # Wait for all data
                results = await asyncio.wait_for(
                    asyncio.gather(
                        traffic_task,
                        power_task,
                        weather_task,
                        *citizen_reports_tasks
                    ),
                    timeout=500.0
                )
                
                traffic_data = results[0]
                power_data = results[1]
                weather_data = results[2]
                citizen_reports_by_area = {
                    areas_to_process[i]: results[3 + i] 
                    for i in range(len(areas_to_process))
                }
                
                # Build comprehensive response
                area_data = {}
                
                for area in areas_to_process:
                    if area not in all_areas:
                        continue
                    
                    area_coords = all_areas[area]
                    
                    # Extract area-specific data
                    area_traffic = self._extract_area_data(traffic_data, area)
                    area_power = self._extract_area_data(power_data, area)
                    area_reports = citizen_reports_by_area.get(area, [])
                    
                    # Build comprehensive area object with all detail levels
                    area_obj = await self._build_unified_area_data(
                        area, 
                        area_coords, 
                        area_traffic, 
                        area_power, 
                        weather_data,
                        area_reports
                    )
                    
                    area_data[area] = area_obj
                
                # Prepare response
                response = {
                    "areas": area_data,
                    "weather": weather_data.get("data", {}),
                    "timestamp": datetime.utcnow(),
                    "total_areas": len(area_data)
                }
                
                # Cache the comprehensive response (disabled)
                # self.area_cache.set(cache_key, response)
                
                return response
                
            except asyncio.TimeoutError:
                logger.warning("Timeout fetching unified area data")
                # Return partial cached data if available
                return {
                    "areas": {},
                    "weather": {},
                    "timestamp": datetime.utcnow(),
                    "error": "Timeout fetching data"
                }

        # Backward compatibility endpoints
        @self.app.get("/map/areas")
        async def get_map_areas():
            """Get area data for map display (backward compatible)"""
            request = UnifiedAreaRequest(areas=[], force_refresh=False)
            result = await get_unified_area_data(request)
            
            # Transform to expected format
            areas_list = []
            for area_name, area_data in result.get("areas", {}).items():
                # Extract just the summary fields needed for map
                areas_list.append({
                    "id": area_data["id"],
                    "name": area_data["name"],
                    "coordinates": area_data["coordinates"],
                    "status": area_data["status"],
                    "color": area_data["color"],
                    "icon": area_data["icon"],
                    "summary": area_data["summary"],
                    "metrics": area_data["metrics"]
                })
            
            return {
                "type": "AreaCollection",
                "areas": areas_list,
                "timestamp": result["timestamp"],
                "weather": result.get("weather", {})
            }

        @self.app.get("/areas/{area_name}/details")
        async def get_area_details(area_name: str):
            """Get detailed information for a specific area (backward compatible)"""
            # Check if we have recent unified data in cache (disabled)
            cache_key = f"area_details:{area_name}"
            cached = None  # Caching disabled
            
            if cached:
                return cached
            
            # Get from unified endpoint
            request = UnifiedAreaRequest(areas=[area_name], force_refresh=False)
            result = await get_unified_area_data(request)
            
            if area_name in result.get("areas", {}):
                area_data = result["areas"][area_name]
                
                # Add predictions if requested
                area_data["details"]["predictions"] = {
                    "next_hour": await self._predict_area_conditions(area_name, "1h"),
                    "next_6_hours": await self._predict_area_conditions(area_name, "6h")
                }
                
                # Flatten structure for backward compatibility
                detailed_response = {
                    **area_data,
                    **area_data["details"],
                    "timestamp": result["timestamp"]
                }
                
                # Cache the detailed response (disabled)
                # self.area_cache.set(cache_key, detailed_response)
                
                return detailed_response
            else:
                raise HTTPException(status_code=404, detail="Area not found")
            

        @self.app.post("/analyze-route")
        async def analyze_route(request: RouteAnalysisRequest):
            """
            Analyze a route using Gemini AI and area traffic data
            """
            try:
                # Prepare context for Gemini
                prompt = f"""
                Analyze this route for traffic conditions and provide recommendations:
                
                Route Details:
                - Route: {request.route_summary if request.route_summary else "Route through Bangalore"}
                - Duration: {request.duration}
                - Distance: {request.distance}
                - Destination: {request.destination}
                - Current Time: {request.time_of_day}
                
                Areas the route passes through:
                {json.dumps(request.affected_areas, indent=2)}
                
                Current traffic issues on route:
                {json.dumps(request.current_issues, indent=2) if request.current_issues else "No specific issues reported"}
                
                Based on this information:
                1. Assess the overall traffic level (low/moderate/heavy)
                2. Provide a recommendation (Recommended route/Use with caution/Avoid this route)
                3. Give a specific reason for your recommendation
                4. Consider time of day and typical traffic patterns in Bangalore
                
                Bangalore traffic patterns to consider:
                - Peak hours: 8-10 AM and 5-8 PM on weekdays
                - Silk Board, Marathahalli, and KR Puram are usually congested
                - IT corridors (Whitefield, Electronic City) have heavy traffic during office hours
                - Weekends see lighter traffic except near malls and entertainment areas
                
                Return your analysis in this exact JSON format:
                {{
                    "recommendation": "your recommendation text",
                    "trafficLevel": "low/moderate/heavy",
                    "reason": "specific reason for the recommendation",
                    "alternativeTimeSlots": ["list of better time slots if applicable"],
                    "specificConcerns": ["list of specific concerns about this route"]
                }}
                """
                
                # Get Gemini response
                response = await asyncio.to_thread(
                    self.mas.gemini_model.generate_content,
                    prompt
                )
                
                # Parse response
                try:
                    json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                    if json_match:
                        analysis = json.loads(json_match.group())
                        
                        # Ensure all required fields are present
                        return {
                            "recommendation": analysis.get("recommendation", "Route analysis available"),
                            "trafficLevel": analysis.get("trafficLevel", "moderate"),
                            "reason": analysis.get("reason", "Based on current traffic conditions"),
                            "alternativeTimeSlots": analysis.get("alternativeTimeSlots", []),
                            "specificConcerns": analysis.get("specificConcerns", [])
                        }
                    else:
                        raise ValueError("Could not parse Gemini response")
                        
                except Exception as e:
                    logger.error(f"Error parsing Gemini response: {e}")
                    
                    # Fallback analysis based on data
                    heavy_traffic_areas = sum(1 for area in request.affected_areas if area.get("traffic") == "heavy")
                    moderate_traffic_areas = sum(1 for area in request.affected_areas if area.get("traffic") == "moderate")
                    total_issues = len(request.current_issues) if request.current_issues else 0
                    
                    if heavy_traffic_areas >= 2 or total_issues >= 3:
                        return {
                            "recommendation": "Avoid this route if possible",
                            "trafficLevel": "heavy",
                            "reason": f"Heavy traffic in {heavy_traffic_areas} areas with {total_issues} active issues",
                            "alternativeTimeSlots": ["Before 7 AM", "After 8 PM", "Mid-afternoon (2-4 PM)"],
                            "specificConcerns": [f"Heavy traffic in {area['name']}" for area in request.affected_areas if area.get("traffic") == "heavy"]
                        }
                    elif moderate_traffic_areas >= 2 or total_issues >= 1:
                        return {
                            "recommendation": "Use with caution - expect delays",
                            "trafficLevel": "moderate",
                            "reason": f"Moderate traffic in {moderate_traffic_areas} areas",
                            "alternativeTimeSlots": ["Early morning", "Late evening"],
                            "specificConcerns": [f"Moderate traffic in {area['name']}" for area in request.affected_areas if area.get("traffic") == "moderate"]
                        }
                    else:
                        return {
                            "recommendation": "Recommended route - good traffic conditions",
                            "trafficLevel": "low",
                            "reason": "Clear traffic conditions in all areas",
                            "alternativeTimeSlots": [],
                            "specificConcerns": []
                        }
                        
            except Exception as e:
                logger.error(f"Error in route analysis: {str(e)}")
                return {
                    "recommendation": "Route analysis unavailable",
                    "trafficLevel": "unknown",
                    "reason": "Unable to analyze route at this time",
                    "alternativeTimeSlots": [],
                    "specificConcerns": [],
                    "error": str(e)
                }
            
        @self.app.post("/predict-route-time")
        async def predict_route_time(request: RouteTimePredictionRequest):
            """
            Predict route conditions at a specific future time using Gemini
            """
            try:
                # Calculate time difference
                selected_time = datetime.fromisoformat(request.selected_time.replace('Z', '+00:00'))
                current_time = datetime.fromisoformat(request.current_time.replace('Z', '+00:00'))
                time_diff_hours = (selected_time - current_time).total_seconds() / 3600
                
                # Get historical patterns from database
                historical_patterns = await self.mas.db.traffic_patterns.find({
                    "day_of_week": request.day_of_week,
                    "hour": selected_time.hour,
                    "areas": {"$in": [area["name"] for area in request.affected_areas]}
                }).to_list(50)
                
                # Extract duration and distance text from dict objects
                duration_text = request.duration.get("text", "Unknown duration")
                distance_text = request.distance.get("text", "Unknown distance")
                
                # Prepare comprehensive prompt for Gemini
                prompt = f"""
                Predict traffic conditions and travel time for a route in Bangalore at a specific future time.
                
                Current Route Information:
                - Current Duration: {duration_text}
                - Distance: {distance_text}
                - Route: {request.route_summary}
                - Destination: {request.destination}
                - Areas passing through: {[area["name"] for area in request.affected_areas]}
                
                Time Analysis:
                - Current time: {current_time.strftime('%I:%M %p')} ({current_time.strftime('%A')})
                - Selected time: {selected_time.strftime('%I:%M %p')} ({selected_time.strftime('%A')})
                - Time difference: {abs(time_diff_hours):.1f} hours {'ahead' if time_diff_hours > 0 else 'ago'}
                
                Historical Patterns Found: {len(historical_patterns)} similar time slots
                
                Bangalore Traffic Patterns to Consider:
                1. Peak Hours:
                - Morning: 8:00 AM - 10:30 AM (office rush)
                - Evening: 5:30 PM - 8:30 PM (return rush)
                - School hours: 7:30 AM - 8:30 AM, 2:00 PM - 3:00 PM
                
                2. Area-Specific Patterns:
                - Silk Board: Always congested, worse during peaks (+20-30 min)
                - Whitefield: IT corridor, heavy on weekdays
                - Koramangala: Shopping/dining traffic on weekends
                - Electronic City: Factory shifts at 6 AM, 2 PM, 10 PM
                - Marathahalli: Perpetual congestion, worse during rains
                
                3. Day-Specific Patterns:
                - Monday mornings: Extra heavy (+15% time)
                - Friday evenings: Extended rush hours
                - Weekends: Lighter morning traffic, heavy near malls/restaurants
                - Holidays: 50% reduced traffic except tourist areas
                
                4. Weather Impact:
                - Rain: +30-50% travel time
                - Heavy rain: +50-100% travel time
                - After rain: Waterlogging adds 20-30 min
                
                5. Event Considerations:
                - Cricket matches at Chinnaswamy Stadium
                - Concerts at Palace Grounds
                - Political rallies
                - Religious festivals
                
                Search for current conditions and predict:
                
                1. Expected travel duration at {selected_time.strftime('%I:%M %p')}
                2. Comparison with current duration
                3. Traffic level (light/moderate/heavy/severe)
                4. Specific issues likely at that time
                5. Confidence level (0-1)
                6. Better alternative times if applicable
                7. Specific recommendations
                
                Also search web for:
                - Any scheduled events on {selected_time.strftime('%B %d')}
                - Planned road work or closures
                - Historical traffic data for similar conditions
                
                Format response as JSON:
                {{
                    "predicted_duration": "X hours Y minutes",
                    "duration_comparison": "Z minutes longer/shorter than now",
                    "traffic_level": "light/moderate/heavy/severe",
                    "traffic_color": "#2ED573 for light, #FFA502 for moderate, #FF6B6B for heavy, #D32F2F for severe",
                    "traffic_description": "Detailed description of expected conditions",
                    "confidence": 0.0-1.0,
                    "expected_issues": [
                        {{
                            "title": "Issue title",
                            "description": "Detailed description",
                            "probability": 0.0-1.0,
                            "icon": "traffic/warning/info",
                            "color": "#colorcode"
                        }}
                    ],
                    "recommendations": ["List of actionable recommendations"],
                    "better_times": [
                        {{
                            "time": "ISO timestamp",
                            "display": "6:30 AM",
                            "time_saved": "Save 20 minutes"
                        }}
                    ],
                    "data_sources": ["Historical patterns", "Real-time data", "Weather forecast", "Event calendar"]
                }}
                """
                
                # Get Gemini prediction with web search
                response = await asyncio.to_thread(
                    self.mas.gemini_model.generate_content,
                    prompt
                )
                
                # Parse response
                try:
                    json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                    if json_match:
                        prediction = json.loads(json_match.group())
                        
                        # Ensure all required fields
                        prediction.setdefault("predicted_duration", duration_text)
                        prediction.setdefault("confidence", 0.7)
                        prediction.setdefault("traffic_level", "moderate")
                        prediction.setdefault("data_sources", ["Historical patterns", "AI analysis"])
                        
                        return prediction
                    else:
                        raise ValueError("Could not parse prediction")
                        
                except Exception as e:
                    logger.error(f"Error parsing time prediction: {e}")
                    
                    # Fallback prediction based on time
                    hour = selected_time.hour
                    is_peak = (8 <= hour <= 10) or (17 <= hour <= 20)
                    
                    return {
                        "predicted_duration": duration_text,
                        "duration_comparison": "Similar to current",
                        "traffic_level": "heavy" if is_peak else "moderate",
                        "traffic_color": "#FF6B6B" if is_peak else "#FFA502",
                        "traffic_description": f"{'Peak hour traffic' if is_peak else 'Normal traffic'} expected",
                        "confidence": 0.6,
                        "expected_issues": [],
                        "recommendations": [
                            "Check real-time updates before travel",
                            "Keep buffer time for unexpected delays"
                        ],
                        "better_times": [],
                        "data_sources": ["Time-based estimation"]
                    }
                    
            except Exception as e:
                logger.error(f"Error in route time prediction: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
            

        @self.app.post("/map/mood-analysis")
        async def analyze_area_moods(request: Dict[str, Any]):
            """
            Analyze the mood/sentiment of areas using already computed data
            """
            try:
                areas_data = request.get("areas_data", [])
                weather = request.get("weather", {})
                
                if not areas_data:
                    raise HTTPException(status_code=400, detail="No area data provided")
                
                area_moods = []
                heatmap_data = []
                
                for area_info in areas_data:
                    area_name = area_info["name"]
                    coordinates = area_info["coordinates"]  # Use exact same coordinates
                    
                    # Prepare summary for Gemini
                    analysis_prompt = f"""
                    Analyze the mood and sentiment of {area_name} based on this current data:
                    
                    Current Status: {area_info['status']}
                    Summary: {area_info['summary']}
                    
                    Metrics:
                    - Traffic Level: {area_info['metrics'].get('traffic_level', 'normal')}
                    - Power Status: {area_info['metrics'].get('power_status', 'normal')}
                    - Active Issues: {area_info['metrics'].get('issue_count', 0)}
                    
                    Issues Present:
                    {json.dumps([{"type": issue.get("type"), "title": issue.get("title")} for issue in area_info.get("issues", [])[:5]], indent=2)}
                    
                    Citizen Reports Summary:
                    {json.dumps(area_info.get("citizen_reports_summary", {}), indent=2) if area_info.get("citizen_reports_summary") else "No citizen reports summary available"}
                    
                    Based on this data, provide:
                    1. Mood score (0-10)
                    2. Sentiment (Excellent/Good/Neutral/Concerned/Critical)
                    3. Key factors affecting mood
                    4. Brief analysis (2-3 sentences)
                    5. Recommendations
                    
                    Return as JSON:
                    {{
                        "mood_score": 0-10,
                        "sentiment": "classification",
                        "mood_color": "#2ED573 for good, #FFA502 for neutral, #FF4757 for bad",
                        "mood_icon": "emoticon-happy/emoticon-neutral/emoticon-sad",
                        "ai_analysis": "2-3 sentence analysis",
                        "key_factors": [
                            {{"category": "Traffic/Power/Issues", "description": "brief", "impact": 0-1, "color": "#hex", "icon": "icon-name"}}
                        ],
                        "sentiment_breakdown": {{"positive": %, "neutral": %, "negative": %}},
                        "mood_trend": [
                            {{"time": "Now", "score": current_score, "color": "#hex"}},
                            {{"time": "-6h", "score": score, "color": "#hex"}},
                            {{"time": "-12h", "score": score, "color": "#hex"}},
                            {{"time": "-18h", "score": score, "color": "#hex"}}
                        ],
                        "recommendations": [{{"text": "recommendation", "icon": "icon"}}],
                        "data_sources": ["Real-time monitoring", "Citizen reports", "AI analysis"]
                    }}
                    """
                    
                    try:
                        # Get Gemini analysis
                        response = await asyncio.to_thread(
                            self.mas.gemini_model.generate_content,
                            analysis_prompt
                        )
                        
                        # Parse response
                        json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                        if json_match:
                            mood_analysis = json.loads(json_match.group())
                        else:
                            raise ValueError("Could not parse")
                            
                    except Exception as e:
                        # Fallback analysis based on existing data
                        mood_score = 7.0
                        
                        # Adjust based on status
                        if area_info["status"] == "critical":
                            mood_score = 3.0
                            sentiment = "Critical"
                            color = "#FF4757"
                            icon = "emoticon-sad"
                        elif area_info["status"] == "warning":
                            mood_score = 5.5
                            sentiment = "Concerned"
                            color = "#FFA502"
                            icon = "emoticon-neutral"
                        else:
                            mood_score = 8.0
                            sentiment = "Good"
                            color = "#2ED573"
                            icon = "emoticon-happy"
                        
                        # Adjust based on metrics
                        if area_info["metrics"].get("traffic_level") == "heavy":
                            mood_score -= 1.5
                        elif area_info["metrics"].get("traffic_level") == "moderate":
                            mood_score -= 0.5
                        
                        if area_info["metrics"].get("issue_count", 0) > 3:
                            mood_score -= 1.0
                        
                        mood_score = max(0, min(10, mood_score))
                        
                        mood_analysis = {
                            "mood_score": round(mood_score, 1),
                            "sentiment": sentiment,
                            "mood_color": color,
                            "mood_icon": icon,
                            "ai_analysis": f"{area_name} is experiencing {sentiment.lower()} conditions. {area_info['summary']}",
                            "key_factors": [
                                {
                                    "category": "Overall Status",
                                    "description": area_info["summary"],
                                    "impact": 0.7,
                                    "color": color,
                                    "icon": "information"
                                }
                            ],
                            "sentiment_breakdown": {
                                "positive": 30 if sentiment == "Good" else 10,
                                "neutral": 50,
                                "negative": 20 if sentiment == "Good" else 40
                            },
                            "mood_trend": [
                                {"time": "Now", "score": mood_score, "color": color},
                                {"time": "-6h", "score": mood_score + 0.5, "color": color},
                                {"time": "-12h", "score": mood_score - 0.5, "color": color},
                                {"time": "-18h", "score": mood_score, "color": color}
                            ],
                            "recommendations": [
                                {"text": "Monitor real-time updates", "icon": "eye"},
                                {"text": "Report new issues via app", "icon": "flag"}
                            ],
                            "data_sources": ["Real-time monitoring", "System metrics"]
                        }
                    
                    # Add area info with exact coordinates
                    mood_analysis.update({
                        "id": area_name.lower().replace(" ", "_"),
                        "name": area_name,
                        "coordinates": coordinates  # Use exact same coordinates from unified data
                    })
                    
                    area_moods.append(mood_analysis)
                    
                    # Add heatmap data
                    heatmap_data.append({
                        "latitude": coordinates["latitude"],
                        "longitude": coordinates["longitude"],
                        "radius": 2000,  # Adjust based on mood score
                        "color": mood_analysis["mood_color"],
                        "intensity": mood_analysis["mood_score"] / 10  # 0-1 range
                    })
                
                # City insights
                avg_mood = sum(a["mood_score"] for a in area_moods) / len(area_moods) if area_moods else 0
                
                return {
                    "mood_areas": area_moods,
                    "heatmap_data": heatmap_data,
                    "city_insights": {
                        "city_mood_score": round(avg_mood, 1),
                        "best_area": max(area_moods, key=lambda x: x["mood_score"])["name"] if area_moods else "N/A",
                        "worst_area": min(area_moods, key=lambda x: x["mood_score"])["name"] if area_moods else "N/A",
                        "summary": f"City mood score: {avg_mood:.1f}/10"
                    },
                    "timestamp": datetime.utcnow()
                }
                
            except Exception as e:
                logger.error(f"Error in mood analysis: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
            

        @self.app.post("/notifications/subscribe")
        async def subscribe_to_notifications(request: NotificationSubscriptionRequest):
            """Subscribe to notifications for a specific area"""
            try:
                # Create subscription document
                subscription_doc = {
                    "id": str(uuid.uuid4()),
                    "userId": request.userId,
                    "area": request.location["area"],
                    "coordinates": request.location["coordinates"],
                    "notificationTypes": request.notificationTypes,
                    "deviceToken": request.deviceToken,
                    "createdAt": datetime.utcnow(),
                    "isActive": True
                }
                
                # Check if subscription already exists
                existing = await self.mas.db.notification_subscriptions.find_one({
                    "userId": request.userId,
                    "area": request.location["area"],
                    "isActive": True
                })
                
                if existing:
                    return {
                        "success": False,
                        "message": "Already subscribed to this area",
                        "subscriptionId": existing["id"]
                    }
                
                # Insert new subscription
                await self.mas.db.notification_subscriptions.insert_one(subscription_doc)
                
                # Log the subscription
                await self.mas.db.notification_logs.insert_one({
                    "type": "subscription_created",
                    "userId": request.userId,
                    "area": request.location["area"],
                    "timestamp": datetime.utcnow()
                })
                
                return {
                    "success": True,
                    "message": "Successfully subscribed to notifications",
                    "subscriptionId": subscription_doc["id"],
                    "area": request.location["area"]
                }
                
            except Exception as e:
                logger.error(f"Error subscribing to notifications: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/notifications/unsubscribe")
        async def unsubscribe_from_notifications(request: NotificationUnsubscribeRequest):
            """Unsubscribe from notifications for a specific area"""
            try:
                # Find and deactivate subscription
                result = await self.mas.db.notification_subscriptions.update_one(
                    {
                        "userId": request.userId,
                        "area": request.area,
                        "isActive": True
                    },
                    {
                        "$set": {
                            "isActive": False,
                            "deactivatedAt": datetime.utcnow()
                        }
                    }
                )
                
                if result.modified_count == 0:
                    return {
                        "success": False,
                        "message": "No active subscription found for this area"
                    }
                
                # Log the unsubscription
                await self.mas.db.notification_logs.insert_one({
                    "type": "subscription_removed",
                    "userId": request.userId,
                    "area": request.area,
                    "timestamp": datetime.utcnow()
                })
                
                return {
                    "success": True,
                    "message": "Successfully unsubscribed from notifications",
                    "area": request.area
                }
                
            except Exception as e:
                logger.error(f"Error unsubscribing from notifications: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/notifications/subscriptions/{user_id}")
        async def get_user_subscriptions(user_id: str):
            """Get all active subscriptions for a user"""
            try:
                subscriptions = await self.mas.db.notification_subscriptions.find({
                    "userId": user_id,
                    "isActive": True
                }).to_list(100)
                
                # Convert ObjectId to string
                for sub in subscriptions:
                    if "_id" in sub:
                        sub["_id"] = str(sub["_id"])
                
                return {
                    "success": True,
                    "subscriptions": subscriptions,
                    "count": len(subscriptions)
                }
                
            except Exception as e:
                logger.error(f"Error fetching subscriptions: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/notifications/send-test")
        async def send_test_notification(area: str, notification_type: str = "test"):
            """Send a test notification to all subscribers of an area"""
            try:
                # Get all active subscriptions for the area
                subscribers = await self.mas.db.notification_subscriptions.find({
                    "area": area,
                    "isActive": True,
                    "notificationTypes": notification_type
                }).to_list(1000)
                
                if not subscribers:
                    return {
                        "success": False,
                        "message": "No active subscribers for this area"
                    }
                
                # In a real implementation, you would send push notifications here
                # For now, we'll just log and return success
                notification_doc = {
                    "id": str(uuid.uuid4()),
                    "area": area,
                    "type": notification_type,
                    "title": f"Test Alert for {area}",
                    "message": f"This is a test {notification_type} notification for {area} area",
                    "timestamp": datetime.utcnow(),
                    "sentTo": len(subscribers),
                    "status": "sent"
                }
                
                await self.mas.db.notifications_sent.insert_one(notification_doc)
                
                return {
                    "success": True,
                    "message": f"Test notification sent to {len(subscribers)} subscribers",
                    "notificationId": notification_doc["id"]
                }
                
            except Exception as e:
                logger.error(f"Error sending test notification: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        

    def _summarize_reports(self, reports: List[Dict]) -> str:
        """Summarize citizen reports for analysis"""
        if not reports:
            return "No recent reports"
        
        summary = []
        for report in reports[:20]:  # Limit to 20 most recent
            summary.append(f"- {report.get('category', 'general')}: {report.get('description', '')[:100]}")
        
        return "\n".join(summary)

    def _get_area_characteristics(self, area: str) -> str:
        """Get known characteristics of an area"""
        characteristics = {
            "Koramangala": "Tech hub, vibrant nightlife, heavy traffic",
            "Whitefield": "IT corridor, international community, infrastructure challenges",
            "Electronic City": "Tech parks, residential growth, connectivity issues",
            "Indiranagar": "Upscale dining, shopping, metro connectivity",
            "Marathahalli": "IT hub, traffic congestion, rapid development",
            "Jayanagar": "Traditional, green spaces, family-friendly",
            "BTM Layout": "Student hub, affordable, good connectivity",
            "HSR Layout": "Planned layout, startups, young professionals"
        }
        return characteristics.get(area, "Mixed residential and commercial")

    def _get_peak_hour_impact(self, area: str) -> str:
        """Get peak hour impact for an area"""
        impacts = {
            "Koramangala": "Severe congestion during office hours",
            "Whitefield": "Major delays during IT shift timings",
            "Electronic City": "Heavy traffic on Hosur Road approach",
            "Marathahalli": "Gridlock during peak hours",
            "Silk Board": "Notorious bottleneck throughout the day"
        }
        return impacts.get(area, "Moderate impact during peak hours")

    async def _get_area_comprehensive_data(self, area: str) -> Dict:
        """Get comprehensive data for mood analysis"""
        try:
            # Get data from various sources
            collector = self.mas.agents.get("rt_collector")
            
            # Collect data for this specific area
            traffic_data = await collector.collect_real_time_traffic([area])
            power_data = await collector.collect_power_data_realtime([area])
            weather_data = await collector.collect_weather_data()
            
            # Extract area-specific data
            area_traffic = self._extract_area_data(traffic_data, area)
            area_power = self._extract_area_data(power_data, area)
            
            # Determine status based on data
            traffic_status = "normal"
            if area_traffic.get("gemini_search"):
                gemini_text = area_traffic["gemini_search"].lower()
                if "heavy traffic" in gemini_text:
                    traffic_status = "heavy"
                elif "moderate traffic" in gemini_text:
                    traffic_status = "moderate"
            
            power_status = "normal"
            if area_power.get("data"):
                outages = [d for d in area_power["data"] if d.get("type") in ["unscheduled", "scheduled"]]
                if outages:
                    power_status = "outage"
            
            # Get citizen reports
            citizen_reports = await self.mas.db.citizen_reports.find({
                "area": area,
                "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
            }).to_list(20)
            
            # Convert to list of dicts
            citizen_reports_list = []
            for report in citizen_reports:
                report_dict = dict(report)
                if '_id' in report_dict:
                    report_dict['_id'] = str(report_dict['_id'])
                citizen_reports_list.append(report_dict)
            
            return {
                "traffic_status": traffic_status,
                "power_status": power_status,
                "issues": [],  # You can populate this from actual issues
                "weather": weather_data.get("data", {}).get("current", {}),
                "metrics": {
                    "traffic_level": traffic_status,
                    "power_status": power_status,
                    "issue_count": 0
                },
                "citizen_reports": citizen_reports_list
            }
            
        except Exception as e:
            logger.error(f"Error getting comprehensive data for {area}: {e}")
            return {
                "traffic_status": "unknown",
                "power_status": "normal",
                "issues": [],
                "weather": {"condition": "Clear", "temperature": 28},
                "metrics": {},
                "citizen_reports": []
            }

    def _calculate_fallback_mood(self, area: str, area_data: Dict, reports: List) -> Dict:
        """Calculate fallback mood when AI analysis fails"""
        # Simple scoring based on data
        base_score = 7.0
        
        # Deduct for issues
        if area_data.get("traffic_status") == "heavy":
            base_score -= 1.5
        elif area_data.get("traffic_status") == "moderate":
            base_score -= 0.5
        
        if area_data.get("power_status") != "normal":
            base_score -= 1.0
        
        # Deduct for negative reports
        negative_reports = sum(1 for r in reports if any(
            word in r.get("description", "").lower() 
            for word in ["bad", "terrible", "worst", "horrible", "pathetic"]
        ))
        base_score -= (negative_reports * 0.1)
        
        # Ensure score is between 0 and 10
        mood_score = max(0, min(10, base_score))
        
        # Determine sentiment and color
        if mood_score >= 7:
            sentiment = "Good"
            color = "#2ED573"
            icon = "emoticon-happy"
        elif mood_score >= 5:
            sentiment = "Neutral"
            color = "#FFA502"
            icon = "emoticon-neutral"
        else:
            sentiment = "Concerned"
            color = "#FF4757"
            icon = "emoticon-sad"
        
        return {
            "mood_score": round(mood_score, 1),
            "sentiment": sentiment,
            "mood_color": color,
            "mood_icon": icon,
            "ai_analysis": f"{area} shows {sentiment.lower()} conditions based on current data.",
            "key_factors": [
                {
                    "category": "Traffic",
                    "description": f"{area_data.get('traffic_status', 'unknown')} traffic conditions",
                    "impact": 0.3,
                    "color": "#FF6B9D",
                    "icon": "car"
                }
            ],
            "sentiment_breakdown": {
                "positive": 30,
                "neutral": 50,
                "negative": 20
            },
            "mood_trend": [
                {"time": f"{i}:00", "score": mood_score + (i % 3 - 1), "color": color}
                for i in range(0, 24, 6)
            ],
            "recommendations": [
                {"text": "Monitor traffic conditions", "icon": "traffic-light"},
                {"text": "Report issues promptly", "icon": "flag"}
            ],
            "data_sources": ["Traffic data", "Citizen reports", "Area metrics"]
        }

    async def _generate_city_insights(self, area_moods: List[Dict]) -> Dict:
        """Generate city-wide insights from area moods"""
        avg_mood = sum(area["mood_score"] for area in area_moods) / len(area_moods)
        
        return {
            "city_mood_score": round(avg_mood, 1),
            "best_mood_area": max(area_moods, key=lambda x: x["mood_score"])["name"],
            "worst_mood_area": min(area_moods, key=lambda x: x["mood_score"])["name"],
            "insights": [
                f"Overall city mood is {avg_mood:.1f}/10",
                f"{sum(1 for a in area_moods if a['mood_score'] >= 7)} areas show positive sentiment",
                f"{sum(1 for a in area_moods if a['mood_score'] < 5)} areas need attention"
            ]
        }
    def _get_area_coordinates_mood(self, area: str) -> Dict[str, float]:
        """Get coordinates for area name"""
        area_coords = {
            "Koramangala": {"latitude": 12.9352, "longitude": 77.6245},
            "Whitefield": {"latitude": 12.9698, "longitude": 77.7500},
            "Indiranagar": {"latitude": 12.9783, "longitude": 77.6408},
            "Electronic City": {"latitude": 12.8399, "longitude": 77.6770},
            "Jayanagar": {"latitude": 12.9308, "longitude": 77.5838},
            "Marathahalli": {"latitude": 12.9562, "longitude": 77.7019},
            "BTM Layout": {"latitude": 12.9165, "longitude": 77.6101},
            "HSR Layout": {"latitude": 12.9121, "longitude": 77.6446}
        }
        
        return area_coords.get(area, {"latitude": 12.9716, "longitude": 77.5946})
    
    class UnifiedAreaRequest(BaseModel):
        areas: List[str] = Field(default=[], description="List of area names. Empty = all areas")
        force_refresh: bool = Field(default=False, description="Force refresh bypassing cache")

    
    async def get_unified_area_data_internal(self, request: UnifiedAreaRequest) -> Dict:
        """Internal method to get unified area data without HTTP call"""
        # Define all areas with coordinates
        all_areas = {
            "Koramangala": {"lat": 12.9352, "lng": 77.6245},
            "Whitefield": {"lat": 12.9698, "lng": 77.7500},
            "Electronic City": {"lat": 12.8399, "lng": 77.6770},
            "Indiranagar": {"lat": 12.9783, "lng": 77.6408},
            "Marathahalli": {"lat": 12.9562, "lng": 77.7019},
            "Jayanagar": {"lat": 12.9308, "lng": 77.5838},
            "BTM Layout": {"lat": 12.9165, "lng": 77.6101},
            "HSR Layout": {"lat": 12.9121, "lng": 77.6446}
        }
        
        # Determine areas to process
        areas_to_process = request.areas if request.areas else list(all_areas.keys())
        
        # Collect all data
        collector = self.mas.agents.get("rt_collector")
        
        try:
            # Parallel data collection for all areas
            traffic_task = collector.collect_real_time_traffic(areas_to_process)
            power_task = collector.collect_power_data_realtime(areas_to_process)
            weather_task = collector.collect_weather_data()
            
            # Wait for all data
            results = await asyncio.gather(
                traffic_task,
                power_task,
                weather_task
            )
            
            traffic_data = results[0]
            power_data = results[1]
            weather_data = results[2]
            
            # Build area data
            area_data = {}
            
            for area in areas_to_process:
                if area not in all_areas:
                    continue
                
                area_coords = all_areas[area]
                
                # Extract area-specific data
                area_traffic = self._extract_area_data(traffic_data, area)
                area_power = self._extract_area_data(power_data, area)
                
                # Build comprehensive area object
                area_obj = await self._build_unified_area_data(
                    area, 
                    area_coords, 
                    area_traffic, 
                    area_power, 
                    weather_data,
                    []  # Empty citizen reports for now
                )
                
                area_data[area] = area_obj
            
            return {
                "areas": area_data,
                "weather": weather_data.get("data", {}),
                "timestamp": datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Error in get_unified_area_data_internal: {e}")
            return {
                "areas": {},
                "weather": {},
                "timestamp": datetime.utcnow()
            }
            
    async def periodic_data_collection(self):
        """Periodically collect data from all sources"""
        while True:
            try:
                # Collect data every 5 minutes
                await asyncio.sleep(300)
                
                # Trigger data collection
                collector = self.mas.agents.get("rt_collector")
                areas = ["Koramangala", "Whitefield", "Electronic City", "Indiranagar"]
                
                asyncio.create_task(collector.collect_real_time_traffic(areas))
                asyncio.create_task(collector.collect_power_data_realtime(areas))
                asyncio.create_task(collector.collect_weather_data())
                
            except Exception as e:
                logger.error(f"Error in periodic collection: {e}")
    
    async def broadcast_updates(self):
        """Broadcast updates to WebSocket clients"""
        while True:
            try:
                await asyncio.sleep(10)  # Check every 10 seconds
                
                # Get latest updates from database
                latest_updates = await self._get_latest_updates()
                
                if latest_updates and self.active_connections:
                    message = json.dumps({
                        "type": "update",
                        "data": latest_updates,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
                    # Broadcast to all connected clients
                    disconnected = []
                    for connection in self.active_connections:
                        try:
                            await connection.send_text(message)
                        except:
                            disconnected.append(connection)
                    
                    # Remove disconnected clients
                    for conn in disconnected:
                        self.active_connections.remove(conn)
                            
            except Exception as e:
                logger.error(f"Error in broadcast: {e}")
    
    async def _build_unified_area_data(self, area: str, coords: Dict, traffic: Dict, 
                                     power: Dict, weather: Dict, reports: List) -> Dict:
        """Build comprehensive area data structure with all levels of detail"""
        
        # Determine overall status
        status = self._determine_area_status(traffic, power)
        
        # Extract issues and highlights
        issues = self._extract_area_issues(traffic, power, reports[:5])  # Recent 5 for summary
        highlights = self._extract_area_highlights(area, weather)
        
        # Build comprehensive object
        area_data = {
            # Essential summary data for map markers
            "id": area.lower().replace(" ", "_"),
            "name": area,
            "coordinates": {
                "latitude": coords["lat"],
                "longitude": coords["lng"]
            },
            "status": status["level"],
            "color": status["color"],
            "icon": status["icon"],
            "summary": status["summary"],
            "metrics": {
                "traffic_level": status.get("traffic_level", "normal"),
                "power_status": status.get("power_status", "normal"),
                "issue_count": status.get("issue_count", 0)
            },
            
            # Additional details (loaded on demand in UI)
            "details": {
                "current_status": {
                    "traffic": self._analyze_traffic_status(traffic),
                    "power": self._analyze_power_status(power),
                    "weather": self._analyze_weather_status(weather)
                },
                "issues": issues,
                "highlights": highlights,
                "citizen_reports": [
                    {
                        "id": str(report["_id"]),
                        "category": report.get("category"),
                        "description": report.get("description"),
                        "timestamp": report.get("timestamp"),
                        "upvotes": report.get("upvotes", 0)
                    }
                    for report in reports
                ],
                "recommendations": self._generate_recommendations(area, traffic, power, weather),
                
                # Predictions can be loaded separately if needed
                "predictions_available": True
            }
        }
        
        return area_data

    def _extract_area_data(self, data: Dict, area: str) -> Dict:
        """Extract data specific to an area from batch results"""
        if not data or not data.get("data"):
            return {}
        
        area_data = {
            "source": data.get("source"),
            "timestamp": data.get("timestamp"),
            "data": []
        }
        
        # Filter data for specific area
        for item in data.get("data", []):
            if isinstance(item, dict):
                # Check if item is related to this area
                item_area = item.get("area", "")
                item_location = item.get("location", "")
                
                if (area.lower() in str(item_area).lower() or 
                    area.lower() in str(item_location).lower() or
                    item.get("source") == area):
                    area_data["data"].append(item)
        
        # Include Gemini search if present and relevant
        if "gemini_search" in data and area.lower() in data["gemini_search"].lower():
            area_data["gemini_search"] = data["gemini_search"]
        
        return area_data
    
    def _determine_area_status(self, traffic: Dict, power: Dict) -> Dict:
        """Determine quick status for map display"""
        issues = 0
        traffic_level = "normal"
        power_status = "normal"
        
        # Check traffic
        if traffic.get("gemini_search"):
            gemini_text = traffic["gemini_search"].lower()
            if "heavy traffic" in gemini_text or "congestion" in gemini_text:
                traffic_level = "heavy"
                issues += 2
            elif "moderate traffic" in gemini_text:
                traffic_level = "moderate"
                issues += 1
        
        # Check power
        if power.get("data"):
            outages = [d for d in power["data"] if d.get("type") in ["unscheduled", "scheduled"]]
            if outages:
                power_status = "outage"
                issues += len(outages)
        
        # Determine overall status
        if issues >= 3:
            return {
                "level": "critical",
                "color": "#FF4757",
                "icon": "alert-octagon-outline",
                "summary": f"{issues} active issues",
                "traffic_level": traffic_level,
                "power_status": power_status,
                "issue_count": issues
            }
        elif issues >= 1:
            return {
                "level": "warning",
                "color": "#FFA502",
                "icon": "alert",
                "summary": f"{issues} minor issues",
                "traffic_level": traffic_level,
                "power_status": power_status,
                "issue_count": issues
            }
        else:
            return {
                "level": "good",
                "color": "#2ED573",
                "icon": "check-circle",
                "summary": "All systems normal",
                "traffic_level": traffic_level,
                "power_status": power_status,
                "issue_count": 0
            }

    def _analyze_traffic_status(self, traffic_data: Dict) -> Dict:
        """Analyze traffic status for an area"""
        if not traffic_data:
            return {"status": "unknown", "description": "No data available"}
        
        # Parse Gemini insights
        if traffic_data.get("gemini_search"):
            gemini_text = traffic_data["gemini_search"].lower()
            if "heavy traffic" in gemini_text:
                return {
                    "status": "heavy",
                    "description": "Heavy traffic reported",
                    "severity": 8,
                    "color": "#FF4757"
                }
            elif "moderate traffic" in gemini_text:
                return {
                    "status": "moderate",
                    "description": "Moderate traffic flow",
                    "severity": 5,
                    "color": "#FFA502"
                }
        
        return {
            "status": "normal",
            "description": "Normal traffic flow",
            "severity": 2,
            "color": "#2ED573"
        }

    def _analyze_power_status(self, power_data: Dict) -> Dict:
        """Analyze power status for an area"""
        if not power_data or not power_data.get("data"):
            return {"status": "unknown", "description": "No data available"}
        
        outages = [d for d in power_data["data"] if d.get("type") in ["unscheduled", "scheduled"]]
        
        if not outages:
            return {
                "status": "normal",
                "description": "Power supply normal",
                "outage_count": 0,
                "color": "#2ED573"
            }
        
        unscheduled = [o for o in outages if o.get("type") == "unscheduled"]
        scheduled = [o for o in outages if o.get("type") == "scheduled"]
        
        return {
            "status": "outage",
            "description": f"{len(unscheduled)} unscheduled, {len(scheduled)} scheduled outages",
            "outage_count": len(outages),
            "outages": outages,
            "color": "#FF4757" if unscheduled else "#FFA502"
        }

    def _analyze_weather_status(self, weather_data: Dict) -> Dict:
        """Analyze weather status"""
        if not weather_data or not weather_data.get("data"):
            return {"status": "unknown", "description": "No data available"}
        
        current = weather_data["data"].get("current", {})
        
        status = {
            "condition": current.get("weather", "Unknown"),
            "temperature": current.get("temperature", 0),
            "description": current.get("description", ""),
            "humidity": current.get("humidity", 0),
            "wind_speed": current.get("wind_speed", 0)
        }
        
        # Determine if weather is good or bad
        if current.get("weather") in ["Clear", "Clouds"]:
            status["rating"] = "good"
            status["color"] = "#2ED573"
        elif current.get("weather") in ["Rain", "Thunderstorm"]:
            status["rating"] = "bad"
            status["color"] = "#FF4757"
        else:
            status["rating"] = "moderate"
            status["color"] = "#FFA502"
        
        return status

    def _extract_area_issues(self, traffic: Dict, power: Dict, reports: List) -> List[Dict]:
        """Extract all issues for an area"""
        issues = []
        
        # Traffic issues
        if traffic.get("gemini_search") and "heavy traffic" in traffic["gemini_search"].lower():
            issues.append({
                "id": "traffic_heavy",
                "type": "traffic",
                "severity": "high",
                "title": "Heavy Traffic",
                "description": "Significant congestion reported in the area",
                "icon": "car",
                "color": "#FF4757",
                "timestamp": datetime.utcnow()
            })
        
        # Power issues
        if power.get("data"):
            for outage in power["data"]:
                if outage.get("type") in ["unscheduled", "scheduled"]:
                    issues.append({
                        "id": f"power_{outage.get('type')}_{outage.get('area')}",
                        "type": "power",
                        "severity": "high" if outage.get("type") == "unscheduled" else "medium",
                        "title": f"{outage.get('type').title()} Power Outage",
                        "description": f"Affecting {', '.join(outage.get('affected_localities', []))}",
                        "icon": "flash-off",
                        "color": "#FF4757" if outage.get("type") == "unscheduled" else "#FFA502",
                        "start_time": outage.get("start_time"),
                        "end_time": outage.get("end_time"),
                        "timestamp": datetime.utcnow()
                    })
        
        # Citizen reports
        for report in reports:
            if report.get("urgency") in ["high", "critical"]:
                issues.append({
                    "id": str(report["_id"]),
                    "type": "citizen_report",
                    "severity": report.get("urgency"),
                    "title": f"Citizen Report: {report.get('category', 'General')}",
                    "description": report.get("description", "")[:100],
                    "icon": "alert-circle",
                    "color": "#FF6B6B",
                    "timestamp": report.get("timestamp")
                })
        
        return issues

    def _extract_area_highlights(self, area_name: str, weather: Dict) -> List[Dict]:
        """Extract positive highlights for an area"""
        highlights = []
        
        # Weather highlights
        if weather.get("data", {}).get("current", {}).get("weather") == "Clear":
            highlights.append({
                "id": "weather_clear",
                "type": "weather",
                "title": "Perfect Weather",
                "description": f"Clear skies and {weather['data']['current']['temperature']}°C",
                "icon": "sunny",
                "color": "#FFA502"
            })
        
        # Area-specific highlights
        area_features = {
            "Koramangala": ["Vibrant food scene", "Shopping hubs", "Startup ecosystem"],
            "Whitefield": ["IT hub", "International schools", "Modern infrastructure"],
            "Electronic City": ["Tech parks", "Affordable housing", "Good connectivity"],
            "Indiranagar": ["Trendy cafes", "Nightlife", "Metro connectivity"],
            "Jayanagar": ["Green spaces", "Traditional markets", "Cultural centers"],
            "BTM Layout": ["Budget friendly", "Student hub", "Good transport"],
            "HSR Layout": ["Planned layout", "Parks", "Residential calm"],
            "Marathahalli": ["IT corridor", "Shopping malls", "Diverse food"]
        }
        
        if area_name in area_features:
            for feature in area_features[area_name][:2]:  # Top 2 features
                highlights.append({
                    "id": f"feature_{feature.lower().replace(' ', '_')}",
                    "type": "amenity",
                    "title": feature,
                    "description": f"Known for {feature.lower()}",
                    "icon": "star",
                    "color": "#4CAF50"
                })
        
        return highlights

    async def _predict_area_conditions(self, area_name: str, timeframe: str) -> Dict:
        """Predict future conditions for an area"""
        # Simplified prediction
        return {
            "traffic": {
                "prediction": "Likely to increase during peak hours",
                "confidence": 0.75
            },
            "power": {
                "prediction": "No outages expected",
                "confidence": 0.85
            }
        }

    def _generate_recommendations(self, area: str, traffic: Dict, power: Dict, weather: Dict) -> List[str]:
        """Generate recommendations for an area"""
        recommendations = []
        
        # Traffic recommendations
        if traffic.get("gemini_search") and "heavy traffic" in traffic["gemini_search"].lower():
            recommendations.append("Consider using metro or work from home during peak hours")
            recommendations.append("Best travel times: Early morning (6-8 AM) or late evening (after 8 PM)")
        
        # Power recommendations
        if power.get("data"):
            outages = [d for d in power["data"] if d.get("type") == "scheduled"]
            if outages:
                recommendations.append("Charge devices before scheduled power cuts")
                recommendations.append("Keep power banks ready")
        
        # Weather recommendations
        if weather.get("data", {}).get("rain_forecast"):
            recommendations.append("Carry an umbrella - rain expected")
            recommendations.append("Allow extra time for commute during rain")
        
        return recommendations

    async def _get_city_weather_summary(self) -> Dict:
        """Get city-wide weather summary"""
        collector = self.mas.agents.get("rt_collector")
        weather_data = await collector.collect_weather_data()
        
        if weather_data and weather_data.get("data"):
            current = weather_data["data"].get("current", {})
            return {
                "condition": current.get("weather", "Unknown"),
                "temperature": current.get("temperature", 0),
                "description": current.get("description", ""),
                "rain_forecast": len(weather_data["data"].get("rain_forecast", [])) > 0
            }
        
        return {"condition": "Unknown", "temperature": 0}
    
    async def _get_latest_updates(self) -> List[Dict]:
        """Get latest updates from the system"""
        updates = []
        
        # Check for recent alerts
        recent_alerts = await self.mas.db.alerts.find({
            "timestamp": {"$gte": datetime.utcnow() - timedelta(minutes=5)}
        }).to_list(10)
        
        for alert in recent_alerts:
            alert["_id"] = str(alert["_id"])
            updates.append(alert)
        
        return updates
    
    async def _get_traffic_hotspots(self) -> List[Dict]:
        """Get traffic hotspots for map display"""
        features = []
        
        # Get recent traffic analysis
        traffic_analysis = await self.mas.db.analysis_results.find({
            "type": "traffic_patterns",
            "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=1)}
        }).to_list(50)
        
        for analysis in traffic_analysis:
            if "hotspots" in analysis.get("patterns", {}):
                for hotspot in analysis["patterns"]["hotspots"]:
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [hotspot["lng"], hotspot["lat"]]
                        },
                        "properties": {
                            "type": "traffic_hotspot",
                            "severity": hotspot.get("severity", "medium"),
                            "description": hotspot.get("description", "Traffic congestion"),
                            "timestamp": analysis["timestamp"].isoformat()
                        }
                    })
        
        return features
    
    async def _get_power_outage_areas(self) -> List[Dict]:
        """Get power outage areas for map display"""
        features = []
        
        # Get recent power data
        power_data = await self.mas.db.power_outages.find({
            "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
        }).to_list(100)
        
        for outage in power_data:
            if "affected_areas" in outage:
                for area in outage["affected_areas"]:
                    # Get approximate coordinates for area
                    coords = self._get_area_coordinates(area)
                    
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [self._create_area_polygon(coords)]
                        },
                        "properties": {
                            "type": "power_outage",
                            "area": area,
                            "start_time": outage.get("start_time", ""),
                            "end_time": outage.get("end_time", ""),
                            "status": outage.get("status", "scheduled")
                        }
                    })
        
        return features
    
    async def _get_citizen_reports_geo(self) -> List[Dict]:
        """Get geolocated citizen reports"""
        features = []
        
        reports = await self.mas.db.citizen_reports.find({
            "location": {"$exists": True},
            "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=12)}
        }).to_list(100)
        
        for report in reports:
            if "location" in report:
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [report["location"]["lng"], report["location"]["lat"]]
                    },
                    "properties": {
                        "type": "citizen_report",
                        "category": report.get("category", "general"),
                        "description": report.get("description", "")[:100],
                        "timestamp": report["timestamp"].isoformat(),
                        "report_id": str(report["_id"])
                    }
                })
        
        return features
    
    def _get_area_coordinates(self, area: str) -> Dict[str, float]:
        """Get coordinates for area name"""
        # Simplified mapping - in production use geocoding
        area_coords = {
            "Koramangala": {"lat": 12.9352, "lng": 77.6245},
            "Whitefield": {"lat": 12.9698, "lng": 77.7500},
            "Indiranagar": {"lat": 12.9783, "lng": 77.6408},
            "Electronic City": {"lat": 12.8399, "lng": 77.6770},
            "Jayanagar": {"lat": 12.9308, "lng": 77.5838},
            "Marathahalli": {"lat": 12.9562, "lng": 77.7019}
        }
        
        return area_coords.get(area, {"lat": 12.9716, "lng": 77.5946})
    
    def _create_area_polygon(self, center: Dict[str, float], radius_km: float = 2) -> List[List[float]]:
        """Create polygon coordinates around center point"""
        # Simplified - creates a square around center
        lat_offset = radius_km / 111  # Rough conversion
        lng_offset = radius_km / (111 * 0.8)  # Adjust for latitude
        
        return [
            [center["lng"] - lng_offset, center["lat"] - lat_offset],
            [center["lng"] + lng_offset, center["lat"] - lat_offset],
            [center["lng"] + lng_offset, center["lat"] + lat_offset],
            [center["lng"] - lng_offset, center["lat"] + lat_offset],
            [center["lng"] - lng_offset, center["lat"] - lat_offset]  # Close polygon
        ]

# ============== PYDANTIC MODELS ==============

class ChatRequest(BaseModel):
    message: str
    user_id: str
    location: Optional[Dict[str, float]] = None

class IssueReport(BaseModel):
    category: str = Field(..., description="Issue category: traffic, power, water, etc.")
    description: str
    location: Dict[str, float] = Field(..., description="Lat/lng coordinates")
    address: Optional[str] = None
    images: Optional[List[str]] = []
    urgency: str = Field("medium", description="low, medium, high, critical")
    contact: Optional[str] = None

class UnifiedAreaRequest(BaseModel):
    areas: List[str] = Field(default=[], description="List of area names. Empty = all areas")
    force_refresh: bool = Field(default=False, description="Force refresh bypassing cache")

class AreaBatchRequest(BaseModel):
    areas: List[str] = Field(default=[], description="List of area names. Empty = all areas")
    detail_level: str = Field(default="summary", description="summary, basic, or full")
    include_weather: bool = Field(default=True, description="Include city-wide weather")


class RouteAnalysisRequest(BaseModel):
    route_summary: Optional[str] = Field(None, description="Route summary from Google")
    duration: str = Field(..., description="Route duration")
    distance: str = Field(..., description="Route distance")
    affected_areas: List[Dict[str, Any]] = Field(..., description="Areas the route passes through")
    current_issues: Optional[List[Dict[str, Any]]] = Field([], description="Current traffic issues")
    destination: str = Field(..., description="Destination name")
    time_of_day: str = Field(..., description="Current time")

class RouteTimePredictionRequest(BaseModel):
    route_summary: Optional[str] = None
    duration: Dict[str, Any]
    distance: Dict[str, Any]
    destination: str
    origin: Dict[str, float]
    selected_time: str
    current_time: str
    route_coordinates: List[Dict[str, float]]
    affected_areas: List[Dict[str, Any]]
    day_of_week: str
    is_holiday: bool = False
    weather_forecast: Optional[Dict[str, Any]] = None

class MoodAnalysisRequest(BaseModel):
    areas: List[str] = Field(default=[], description="Areas to analyze")
    timeframe: str = Field(default="24h", description="Analysis timeframe")
    include_predictions: bool = Field(default=True, description="Include mood predictions")

class UnifiedAreaRequest(BaseModel):
    areas: List[str] = Field(default=[], description="List of area names. Empty = all areas")
    force_refresh: bool = Field(default=False, description="Force refresh bypassing cache")


class NotificationSubscriptionRequest(BaseModel):
    userId: str
    location: Dict[str, Any] = Field(..., description="Area name and coordinates")
    notificationTypes: List[str] = Field(default=["traffic", "power", "emergency", "weather"])
    deviceToken: Optional[str] = Field(None, description="Device token for push notifications")

class NotificationUnsubscribeRequest(BaseModel):
    userId: str
    area: str

class NotificationSubscription(BaseModel):
    id: str
    userId: str
    area: str
    coordinates: Dict[str, float]
    notificationTypes: List[str]
    deviceToken: Optional[str]
    createdAt: datetime
    isActive: bool = True


# ============== MAIN APPLICATION ==============

def create_app() -> FastAPI:
    """Create and configure FastAPI app"""
    api = CityPulseAPI()
    
    # Setup lifespan events
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup
        await api.initialize_system()
        yield
        # Shutdown
        await api.shutdown_system()
    
    api.app.router.lifespan_context = lifespan
    return api.app

# Global app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8005,
        reload=True,  # Enable reload for development
        log_level="info"
    )
