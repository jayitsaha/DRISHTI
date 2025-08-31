# CityPulse Multi-Agent Platform - Core Architecture (Redis-free version)
# A truly agentic urban intelligence system with collaborative agents

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple, Callable
from enum import Enum
import httpx
from pydantic import BaseModel, Field
import google.generativeai as genai
from motor.motor_asyncio import AsyncIOMotorClient
import feedparser
from bs4 import BeautifulSoup
import newspaper
from newspaper import Article
import tweepy
import praw
import telethon
from geopy.geocoders import Nominatim
import pandas as pd
import numpy as np
from collections import defaultdict
import re
import pytz
import uuid
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import aiofiles
import pytesseract
from PIL import Image
import io
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== AGENT TYPES AND MESSAGES ==============

class AgentRole(str, Enum):
    DATA_COLLECTOR = "data_collector"
    PATTERN_ANALYZER = "pattern_analyzer"
    PREDICTOR = "predictor"
    VERIFIER = "verifier"
    COORDINATOR = "coordinator"
    REPORTER = "reporter"
    LEARNER = "learner"
    CITIZEN_INTERFACE = "citizen_interface"

class MessageType(str, Enum):
    DATA_REQUEST = "data_request"
    DATA_RESPONSE = "data_response"
    ANALYSIS_REQUEST = "analysis_request"
    ANALYSIS_RESULT = "analysis_result"
    PREDICTION_REQUEST = "prediction_request"
    PREDICTION_RESULT = "prediction_result"
    VERIFICATION_REQUEST = "verification_request"
    VERIFICATION_RESULT = "verification_result"
    TASK_ASSIGNMENT = "task_assignment"
    TASK_COMPLETE = "task_complete"
    ALERT = "alert"
    LEARNING_UPDATE = "learning_update"

@dataclass
class AgentMessage:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    from_agent: str = ""
    to_agent: str = ""
    message_type: MessageType = MessageType.DATA_REQUEST
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    priority: int = 5  # 1-10, 1 being highest

class AgentState(str, Enum):
    INITIAL = "initial"
    IDLE = "idle"
    BUSY = "busy"
    LEARNING = "learning"
    ERROR = "error"
    MAINTENANCE = "maintenance"

# ============== IN-MEMORY MESSAGE BROKER ==============

class InMemoryMessageBroker:
    """Simple in-memory message broker to replace Redis"""
    
    def __init__(self):
        self.queues: Dict[str, asyncio.Queue] = defaultdict(asyncio.Queue)
        self.pubsub_channels: Dict[str, List[asyncio.Queue]] = defaultdict(list)
        self.response_storage: Dict[str, Any] = {}
        self.response_events: Dict[str, asyncio.Event] = {}
    
    async def publish(self, channel: str, message: str):
        """Publish message to a channel"""
        for queue in self.pubsub_channels[channel]:
            await queue.put(message)
    
    def subscribe(self, channel: str) -> asyncio.Queue:
        """Subscribe to a channel"""
        queue = asyncio.Queue()
        self.pubsub_channels[channel].append(queue)
        return queue
    
    async def send_message(self, queue_name: str, message: str):
        """Send message to a specific queue"""
        await self.queues[queue_name].put(message)
    
    async def receive_message(self, queue_name: str, timeout: Optional[float] = None) -> Optional[str]:
        """Receive message from a queue"""
        try:
            if timeout:
                return await asyncio.wait_for(self.queues[queue_name].get(), timeout)
            else:
                return await self.queues[queue_name].get()
        except asyncio.TimeoutError:
            return None
    
    async def store_response(self, key: str, value: Any, expire: int = 300):
        """Store a response with optional expiration"""
        self.response_storage[key] = value
        if key not in self.response_events:
            self.response_events[key] = asyncio.Event()
        self.response_events[key].set()
        
        # Schedule deletion after expiration
        if expire:
            asyncio.create_task(self._expire_key(key, expire))
    
    async def get_response(self, key: str, timeout: Optional[float] = None) -> Optional[Any]:
        """Get a stored response"""
        if key in self.response_events:
            try:
                await asyncio.wait_for(self.response_events[key].wait(), timeout)
                return self.response_storage.get(key)
            except asyncio.TimeoutError:
                return None
        return self.response_storage.get(key)
    
    async def _expire_key(self, key: str, seconds: int):
        """Expire a key after specified seconds"""
        await asyncio.sleep(seconds)
        self.response_storage.pop(key, None)
        self.response_events.pop(key, None)

# ============== BASE AGENT CLASS ==============

class BaseAgent(ABC):
    """Base class for all agents in the system"""
    
    def __init__(self, agent_id: str, role: AgentRole, gemini_model, db):
        self.agent_id = agent_id
        self.role = role
        self.gemini_model = gemini_model
        self.db = db
        self.state = AgentState.INITIAL
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.message_broker: Optional[InMemoryMessageBroker] = None
        self.knowledge_base = {}
        self.performance_metrics = {
            "tasks_completed": 0,
            "success_rate": 0.0,
            "avg_response_time": 0.0
        }
        self.collaborators: Set[str] = set()
        self.active_tasks: Dict[str, Any] = {}
        
    def set_message_broker(self, broker: InMemoryMessageBroker):
        """Set the message broker for inter-agent communication"""
        self.message_broker = broker
    
    @abstractmethod
    async def process_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Process incoming message and return response if needed"""
        pass
    
    @abstractmethod
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute assigned task"""
        pass
    
    async def send_message(self, recipient: str, message_type: MessageType, 
                          content: Dict[str, Any], priority: int = 5) -> str:
        """Send message to another agent"""
        message = AgentMessage(
            from_agent=self.agent_id,
            to_agent=recipient,
            message_type=message_type,
            data=content,
            priority=priority
        )
        
        # Publish to message broker
        if self.message_broker:
            await self.message_broker.publish(
                f"agent:{recipient}",
                json.dumps({
                    "sender": message.from_agent,
                    "type": message.message_type.value,
                    "content": message.data,
                    "correlation_id": message.correlation_id,
                    "timestamp": message.timestamp.isoformat(),
                    "priority": message.priority
                })
            )
        
        return message.correlation_id
    
    async def learn_from_outcome(self, task_id: str, outcome: Dict[str, Any]):
        """Update agent's knowledge based on task outcome"""
        self.knowledge_base[task_id] = outcome
        
        # Update performance metrics
        if outcome.get("success", False):
            self.performance_metrics["tasks_completed"] += 1
            self.performance_metrics["success_rate"] = (
                self.performance_metrics["success_rate"] * 0.9 + 0.1
            )
        
        # Store learning in database
        await self.db.agent_learning.insert_one({
            "agent_id": self.agent_id,
            "task_id": task_id,
            "outcome": outcome,
            "timestamp": datetime.utcnow(),
            "metrics": self.performance_metrics
        })
    
    async def collaborate_with(self, agent_ids: List[str], task: Dict[str, Any]) -> Dict[str, Any]:
        """Collaborate with other agents on a task"""
        collaboration_id = str(uuid.uuid4())
        results = {}
        
        # Send collaboration requests
        for agent_id in agent_ids:
            await self.send_message(
                agent_id,
                MessageType.TASK_ASSIGNMENT,
                {
                    "collaboration_id": collaboration_id,
                    "task": task,
                    "coordinator": self.agent_id
                }
            )
            self.collaborators.add(agent_id)
        
        # Wait for responses (with timeout)
        try:
            results = await asyncio.wait_for(
                self._collect_collaboration_results(collaboration_id, len(agent_ids)),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            logger.warning(f"Collaboration {collaboration_id} timed out")
        
        return results
    
    async def _collect_collaboration_results(self, collaboration_id: str, expected_count: int) -> Dict:
        """Collect results from collaborating agents"""
        results = {}
        received = 0
        
        while received < expected_count and self.message_broker:
            # Check for results
            result = await self.message_broker.get_response(
                f"collab:{collaboration_id}:{received}", 
                timeout=0.1
            )
            if result:
                results[f"agent_{received}"] = result
                received += 1
            await asyncio.sleep(0.1)
        
        return results

# ============== SPECIALIZED AGENTS ==============

class DataCollectorAgent(BaseAgent):
    """Agent responsible for collecting data from various sources"""
    
    def __init__(self, agent_id: str, gemini_model, db):
        super().__init__(agent_id, AgentRole.DATA_COLLECTOR, gemini_model, db)
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.geolocator = Nominatim(user_agent="citypulse-agent")
        self.data_sources = self._initialize_data_sources()
        self.scraping_strategies = self._initialize_scraping_strategies()
        
    def _initialize_data_sources(self) -> Dict[str, Any]:
        """Initialize various data sources"""
        return {
            "web_scrapers": {
                "bmtc": BMTCWebScraper(),
                "bescom": BESCOMWebScraper(),
                "traffic": TrafficDataScraper(),
                "news": NewsAggregator()
            },
            "social_media": {
                "twitter": TwitterCollector(),
                "reddit": RedditCollector(),
                "telegram": TelegramMonitor()
            },
            "citizen_reports": CitizenReportCollector(self.db),
            "iot_simulators": {
                "traffic_sensors": TrafficSensorSimulator(),
                "power_grid": PowerGridSimulator()
            },
            "public_apis": {
                "weather": WeatherAPICollector(),
                "pollution": PollutionDataCollector()
            }
        }
    
    def _initialize_scraping_strategies(self) -> Dict[str, Callable]:
        """Initialize intelligent scraping strategies"""
        return {
            "adaptive_scraping": self._adaptive_scraping,
            "pattern_based": self._pattern_based_extraction,
            "llm_guided": self._llm_guided_extraction,
            "crowdsourced": self._crowdsourced_validation
        }
    
    async def process_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Process data collection requests"""
        if message.message_type == MessageType.DATA_REQUEST:
            data_type = message.data.get("data_type")
            parameters = message.data.get("parameters", {})
            
            # Execute data collection
            result = await self.execute_task({
                "type": "collect_data",
                "data_type": data_type,
                "parameters": parameters
            })
            
            return AgentMessage(
                from_agent=self.agent_id,
                to_agent=message.from_agent,
                message_type=MessageType.DATA_RESPONSE,
                data=result,
                correlation_id=message.correlation_id
            )
        
        return None
    
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute data collection task"""
        task_type = task.get("type")
        
        if task_type == "collect_data":
            data_type = task.get("data_type")
            parameters = task.get("parameters", {})
            
            # Route to appropriate collector
            if data_type == "bmtc":
                return await self._collect_bmtc_data(parameters)
            elif data_type == "power_grid":
                return await self._collect_power_data(parameters)
            elif data_type == "traffic":
                return await self._collect_traffic_data(parameters)
            elif data_type == "social_media":
                return await self._collect_social_media(parameters)
            elif data_type == "news":
                return await self._collect_news_data(parameters)
            else:
                return await self._collect_general_data(data_type, parameters)
        
        return {"error": "Unknown task type"}
    
    async def _collect_bmtc_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Collect BMTC bus data using multiple strategies"""
        results = {
            "source": "bmtc",
            "timestamp": datetime.utcnow(),
            "data": []
        }
        
        # Strategy 1: Web scraping
        scraper = self.data_sources["web_scrapers"]["bmtc"]
        scraped_data = await scraper.scrape_route_info(parameters.get("routes", []))
        results["data"].extend(scraped_data)
        
        # Strategy 2: Citizen reports
        citizen_reports = await self.data_sources["citizen_reports"].get_recent_reports(
            category="bmtc",
            time_window=timedelta(hours=1)
        )
        results["data"].extend(citizen_reports)
        
        # Strategy 3: Social media monitoring
        social_data = await self._search_social_media(
            "BMTC bus delay Bangalore",
            platforms=["twitter", "reddit"]
        )
        results["data"].extend(social_data)
        
        # Strategy 4: LLM-guided synthesis
        if results["data"]:
            synthesis = await self._llm_guided_extraction(
                results["data"],
                "Extract BMTC bus delays, crowd levels, and route changes"
            )
            results["synthesis"] = synthesis
        
        return results
    
    async def _collect_power_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Collect power grid data"""
        results = {
            "source": "power_grid",
            "timestamp": datetime.utcnow(),
            "data": []
        }
        
        # BESCOM website scraping
        scraper = self.data_sources["web_scrapers"]["bescom"]
        outage_schedule = await scraper.scrape_outage_schedule(
            parameters.get("areas", [])
        )
        results["data"].extend(outage_schedule)
        
        # IoT simulator for real-time data
        simulator = self.data_sources["iot_simulators"]["power_grid"]
        simulated_data = await simulator.generate_readings(
            parameters.get("areas", ["Koramangala", "Indiranagar"])
        )
        results["data"].extend(simulated_data)
        
        # Social media for outage reports
        outage_reports = await self._search_social_media(
            "power cut electricity outage Bangalore BESCOM",
            platforms=["twitter", "telegram"]
        )
        results["data"].extend(outage_reports)
        
        return results
    
    async def _collect_traffic_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Collect traffic data"""
        results = {
            "source": "traffic",
            "timestamp": datetime.utcnow(),
            "data": []
        }
        
        # Get traffic sensor data
        simulator = self.data_sources["iot_simulators"]["traffic_sensors"]
        sensor_data = await simulator.generate_readings(parameters.get("locations"))
        results["data"].extend(sensor_data)
        
        # Social media traffic reports
        traffic_reports = await self._search_social_media(
            "traffic jam Bangalore congestion",
            platforms=["twitter", "reddit"]
        )
        results["data"].extend(traffic_reports)
        
        return results
    
    async def _collect_news_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Collect news data"""
        aggregator = self.data_sources["web_scrapers"]["news"]
        keywords = parameters.get("keywords", ["Bangalore", "Bengaluru"])
        
        articles = await aggregator.fetch_latest_news(keywords)
        
        return {
            "source": "news",
            "timestamp": datetime.utcnow(),
            "data": articles
        }
    
    async def _collect_social_media(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Collect social media data"""
        query = parameters.get("query", "Bangalore")
        platforms = parameters.get("platforms", ["twitter", "reddit"])
        
        results = await self._search_social_media(query, platforms)
        
        return {
            "source": "social_media",
            "timestamp": datetime.utcnow(),
            "data": results
        }
    
    async def _collect_general_data(self, data_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """General data collection fallback"""
        return {
            "source": data_type,
            "timestamp": datetime.utcnow(),
            "data": [],
            "message": f"No specific collector for {data_type}"
        }
    
    async def _search_social_media(self, query: str, platforms: List[str]) -> List[Dict[str, Any]]:
        """Search across social media platforms"""
        results = []
        
        for platform in platforms:
            if platform in self.data_sources["social_media"]:
                collector = self.data_sources["social_media"][platform]
                platform_results = await collector.search(query, limit=10)
                results.extend(platform_results)
        
        return results
    
    async def _adaptive_scraping(self, url: str, target_data: str) -> Dict[str, Any]:
        """Adaptive scraping that learns from failures"""
        strategies = [
            self._direct_scraping,
            self._javascript_rendering,
            self._api_discovery,
            self._screenshot_ocr
        ]
        
        for strategy in strategies:
            try:
                result = await strategy(url, target_data)
                if result and result.get("success"):
                    # Learn successful strategy
                    await self.learn_from_outcome(
                        f"scrape_{hashlib.md5(url.encode()).hexdigest()}",
                        {"strategy": strategy.__name__, "success": True}
                    )
                    return result
            except Exception as e:
                logger.warning(f"Strategy {strategy.__name__} failed: {e}")
                continue
        
        return {"success": False, "error": "All strategies failed"}
    
    async def _direct_scraping(self, url: str, target_data: str) -> Dict[str, Any]:
        """Direct HTTP scraping"""
        response = await self.http_client.get(url)
        if response.status_code == 200:
            return {"success": True, "content": response.text, "method": "direct"}
        return {"success": False, "status_code": response.status_code}
    
    async def _javascript_rendering(self, url: str, target_data: str) -> Dict[str, Any]:
        """JavaScript rendering strategy (placeholder)"""
        # In production, would use Selenium or Playwright
        return {"success": False, "error": "JS rendering not implemented"}
    
    async def _api_discovery(self, url: str, target_data: str) -> Dict[str, Any]:
        """Try to discover API endpoints"""
        # In production, would analyze network traffic
        return {"success": False, "error": "API discovery not implemented"}
    
    async def _screenshot_ocr(self, url: str, target_data: str) -> Dict[str, Any]:
        """Screenshot and OCR strategy (placeholder)"""
        # In production, would use screenshot + OCR
        return {"success": False, "error": "Screenshot OCR not implemented"}
    
    async def _llm_guided_extraction(self, raw_data: List[Dict], extraction_goal: str) -> Dict[str, Any]:
        """Use LLM to extract structured information from unstructured data"""
        prompt = f"""
        Extract structured information based on this goal: {extraction_goal}
        
        Raw data:
        {json.dumps(raw_data, indent=2)[:2000]}  # Limit context
        
        Provide extracted information as JSON with:
        - Key findings
        - Quantitative metrics
        - Temporal patterns
        - Anomalies detected
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            prompt
        )
        
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        
        return {"raw_extraction": response.text}
    
    async def _pattern_based_extraction(self, data: Any, patterns: List[str]) -> Dict[str, Any]:
        """Pattern-based extraction strategy"""
        return {"method": "pattern_based", "patterns_found": []}
    
    async def _crowdsourced_validation(self, data: Any) -> Dict[str, Any]:
        """Crowdsourced validation strategy"""
        return {"method": "crowdsourced", "validated": False}

class PatternAnalyzerAgent(BaseAgent):
    """Agent that analyzes patterns in collected data"""
    
    def __init__(self, agent_id: str, gemini_model, db):
        super().__init__(agent_id, AgentRole.PATTERN_ANALYZER, gemini_model, db)
        self.analysis_algorithms = {
            "temporal": self._temporal_pattern_analysis,
            "spatial": self._spatial_pattern_analysis,
            "correlation": self._correlation_analysis,
            "anomaly": self._anomaly_detection
        }
        self.pattern_memory = defaultdict(list)
        
    async def process_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Process analysis requests"""
        if message.message_type == MessageType.ANALYSIS_REQUEST:
            data = message.data.get("data")
            analysis_type = message.data.get("analysis_type", "all")
            
            result = await self.execute_task({
                "type": "analyze_patterns",
                "data": data,
                "analysis_type": analysis_type
            })
            
            return AgentMessage(
                from_agent=self.agent_id,
                to_agent=message.from_agent,
                message_type=MessageType.ANALYSIS_RESULT,
                data=result,
                correlation_id=message.correlation_id
            )
        
        return None
    
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute pattern analysis task"""
        data = task.get("data", [])
        analysis_type = task.get("analysis_type", "all")
        
        results = {
            "timestamp": datetime.utcnow(),
            "patterns": {}
        }
        
        if analysis_type == "all":
            for algo_name, algo_func in self.analysis_algorithms.items():
                results["patterns"][algo_name] = await algo_func(data)
        else:
            if analysis_type in self.analysis_algorithms:
                results["patterns"][analysis_type] = await self.analysis_algorithms[analysis_type](data)
        
        # Store patterns for learning
        pattern_id = str(uuid.uuid4())
        self.pattern_memory[pattern_id] = results["patterns"]
        
        # Notify learner agent if available
        if self.message_broker:
            await self.send_message(
                "learner_agent",
                MessageType.LEARNING_UPDATE,
                {
                    "pattern_id": pattern_id,
                    "patterns": results["patterns"],
                    "context": task.get("context", {})
                }
            )
        
        return results
    
    async def _temporal_pattern_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze temporal patterns in data"""
        # Convert to time series
        df = pd.DataFrame(data)
        
        patterns = {
            "periodicities": [],
            "trends": [],
            "seasonality": {},
            "anomalous_periods": []
        }
        
        # Use Gemini for intelligent pattern recognition
        prompt = f"""
        Analyze these temporal patterns in urban data:
        
        Data sample (first 10 records):
        {df.head(10).to_json(orient='records') if not df.empty else "No data"}
        
        Identify:
        1. Daily/weekly/monthly patterns
        2. Rush hour patterns
        3. Unusual spikes or drops
        4. Correlations with time of day/week
        
        Provide specific findings with timestamps and confidence levels.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            prompt
        )
        
        patterns["llm_insights"] = response.text
        
        # Statistical analysis
        if not df.empty and 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['hour'] = df['timestamp'].dt.hour
            df['day_of_week'] = df['timestamp'].dt.dayofweek
            
            # Hourly patterns
            hourly_stats = df.groupby('hour').size()
            if not hourly_stats.empty:
                patterns["peak_hours"] = hourly_stats.nlargest(3).index.tolist()
            
        return patterns
    
    async def _spatial_pattern_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze spatial patterns and hotspots"""
        locations = []
        
        for item in data:
            if 'location' in item:
                loc = item['location']
                if isinstance(loc, dict) and 'latitude' in loc:
                    locations.append((loc['latitude'], loc['longitude'], item))
        
        patterns = {
            "hotspots": [],
            "clusters": [],
            "coverage_gaps": [],
            "movement_patterns": []
        }
        
        if locations and len(locations) > 5:
            # Simple clustering
            from sklearn.cluster import DBSCAN
            coords = np.array([(loc[0], loc[1]) for loc in locations])
            
            clustering = DBSCAN(eps=0.01, min_samples=3).fit(coords)
            
            # Identify clusters
            unique_labels = set(clustering.labels_)
            for label in unique_labels:
                if label != -1:  # -1 is noise
                    cluster_points = coords[clustering.labels_ == label]
                    center = cluster_points.mean(axis=0)
                    
                    patterns["clusters"].append({
                        "center": {"lat": center[0], "lon": center[1]},
                        "size": len(cluster_points),
                        "density": len(cluster_points) / 0.01  # points per unit area
                    })
        
        return patterns
    
    async def _correlation_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze correlations between different data types"""
        correlations = {
            "strong_positive": [],
            "strong_negative": [],
            "temporal_correlations": [],
            "causal_hypotheses": []
        }
        
        # Group data by type
        data_by_type = defaultdict(list)
        for item in data:
            if 'type' in item:
                data_by_type[item['type']].append(item)
        
        # Use LLM to identify potential correlations
        prompt = f"""
        Analyze potential correlations in this urban data:
        
        Data types available: {list(data_by_type.keys())}
        Sample sizes: {[f"{k}: {len(v)}" for k, v in data_by_type.items()]}
        
        Consider correlations like:
        - Traffic vs Weather
        - Power usage vs Temperature
        - Accidents vs Time of day
        - Events vs Public transport demand
        
        Identify strong correlations and potential causal relationships.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            prompt
        )
        
        correlations["llm_analysis"] = response.text
        
        return correlations
    
    async def _anomaly_detection(self, data: List[Dict]) -> Dict[str, Any]:
        """Detect anomalies in the data"""
        anomalies = {
            "statistical_outliers": [],
            "pattern_breaks": [],
            "unusual_combinations": [],
            "emerging_trends": []
        }
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(data)
        
        if not df.empty:
            # Statistical anomaly detection
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_columns:
                if col in df:
                    mean = df[col].mean()
                    std = df[col].std()
                    
                    # Find outliers (> 3 std deviations)
                    outliers = df[np.abs(df[col] - mean) > 3 * std]
                    
                    if not outliers.empty:
                        anomalies["statistical_outliers"].append({
                            "column": col,
                            "outliers": outliers[col].tolist(),
                            "threshold": mean + 3 * std
                        })
        
        # Use LLM for semantic anomaly detection
        prompt = f"""
        Identify unusual patterns or anomalies in this urban data:
        
        Data sample:
        {df.head(20).to_json(orient='records') if not df.empty else "No data"}
        
        Look for:
        1. Unusual combinations of events
        2. Breaks in normal patterns
        3. Emerging new trends
        4. Suspicious or concerning patterns
        
        Rate severity: Low/Medium/High/Critical
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            prompt
        )
        
        anomalies["semantic_anomalies"] = response.text
        
        return anomalies

class PredictorAgent(BaseAgent):
    """Agent responsible for making predictions"""
    
    def __init__(self, agent_id: str, gemini_model, db):
        super().__init__(agent_id, AgentRole.PREDICTOR, gemini_model, db)
        self.prediction_models = {
            "short_term": self._short_term_prediction,
            "long_term": self._long_term_prediction,
            "event_impact": self._event_impact_prediction,
            "cascade_effect": self._cascade_effect_prediction
        }
        self.prediction_history = []
        
    async def process_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Process prediction requests"""
        if message.message_type == MessageType.PREDICTION_REQUEST:
            patterns = message.data.get("patterns")
            prediction_type = message.data.get("prediction_type")
            parameters = message.data.get("parameters", {})
            
            result = await self.execute_task({
                "type": "make_prediction",
                "patterns": patterns,
                "prediction_type": prediction_type,
                "parameters": parameters
            })
            
            return AgentMessage(
                from_agent=self.agent_id,
                to_agent=message.from_agent,
                message_type=MessageType.PREDICTION_RESULT,
                data=result,
                correlation_id=message.correlation_id
            )
        
        return None
    
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute prediction task"""
        patterns = task.get("patterns", {})
        prediction_type = task.get("prediction_type", "short_term")
        parameters = task.get("parameters", {})
        
        # Get historical context
        historical_data = await self._fetch_historical_context(
            prediction_type,
            parameters.get("timeframe", "1d")
        )
        
        # Make prediction
        if prediction_type in self.prediction_models:
            prediction = await self.prediction_models[prediction_type](
                patterns,
                historical_data,
                parameters
            )
        else:
            prediction = await self._general_prediction(patterns, historical_data, parameters)
        
        # Store prediction for verification later
        prediction_id = str(uuid.uuid4())
        prediction["prediction_id"] = prediction_id
        prediction["timestamp"] = datetime.utcnow()
        
        await self.db.predictions.insert_one(prediction)
        self.prediction_history.append(prediction_id)
        
        # Schedule verification if broker available
        if self.message_broker:
            await self.send_message(
                "verifier_agent",
                MessageType.VERIFICATION_REQUEST,
                {
                    "prediction_id": prediction_id,
                    "prediction": prediction,
                    "verify_after": prediction.get("timeframe", "1h")
                },
                priority=3
            )
        
        return prediction
    
    async def _short_term_prediction(self, patterns: Dict, historical: List, params: Dict) -> Dict:
        """Make short-term predictions (next few hours)"""
        
        # Prepare context for Gemini
        prompt = f"""
        Make short-term urban predictions based on these patterns and historical data:
        
        Current Patterns:
        {json.dumps(patterns, indent=2)[:1500]}
        
        Historical Context (last 24h):
        - Similar pattern occurrences: {len(historical)}
        - Typical outcomes: [analyze historical data]
        
        Current Conditions:
        - Time: {datetime.now(pytz.timezone('Asia/Kolkata')).strftime('%Y-%m-%d %H:%M IST')}
        - Day: {datetime.now().strftime('%A')}
        - Parameters: {params}
        
        Predict for next 1-3 hours:
        1. Most likely scenarios
        2. Probability of each scenario
        3. Impact severity (1-10)
        4. Affected areas/systems
        5. Recommended preventive actions
        6. Confidence level
        
        Format as detailed JSON.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            prompt
        )
        
        # Parse prediction
        try:
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                prediction_data = json.loads(json_match.group())
            else:
                prediction_data = {"error": "Failed to parse prediction"}
        except:
            prediction_data = {"raw_prediction": response.text}
        
        return {
            "type": "short_term",
            "timeframe": "3h",
            "prediction": prediction_data,
            "patterns_used": list(patterns.keys()),
            "confidence": prediction_data.get("confidence", 0.7)
        }
    
    async def _long_term_prediction(self, patterns: Dict, historical: List, params: Dict) -> Dict:
        """Make long-term predictions"""
        return {
            "type": "long_term",
            "timeframe": "7d",
            "prediction": {"placeholder": "Long-term prediction"},
            "confidence": 0.5
        }
    
    async def _event_impact_prediction(self, patterns: Dict, historical: List, params: Dict) -> Dict:
        """Predict event impacts"""
        return {
            "type": "event_impact",
            "event": params.get("event", {}),
            "predicted_impact": {"placeholder": "Event impact prediction"},
            "confidence": 0.6
        }
    
    async def _cascade_effect_prediction(self, patterns: Dict, historical: List, params: Dict) -> Dict:
        """Predict cascade effects of events"""
        
        initial_event = params.get("initial_event", {})
        
        prompt = f"""
        Analyze potential cascade effects of this urban event:
        
        Initial Event: {json.dumps(initial_event)}
        Current System State: {json.dumps(patterns, indent=2)[:1000]}
        
        Predict cascade effects:
        1. Primary impacts (immediate)
        2. Secondary impacts (within hours)
        3. Tertiary impacts (within days)
        4. System vulnerabilities exposed
        5. Feedback loops that might amplify effects
        6. Natural dampening factors
        
        For each impact level, specify:
        - Affected systems
        - Severity (1-10)
        - Probability
        - Mitigation strategies
        
        Consider interdependencies:
        - Traffic → Emergency services
        - Power → Water supply → Hospitals
        - Events → Transport → Local business
        
        Format as structured JSON.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            prompt
        )
        
        try:
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            cascade_data = json.loads(json_match.group()) if json_match else {}
        except:
            cascade_data = {"analysis": response.text}
        
        return {
            "type": "cascade_effect",
            "initial_event": initial_event,
            "cascade_analysis": cascade_data,
            "critical_paths": cascade_data.get("critical_paths", []),
            "intervention_points": cascade_data.get("intervention_points", [])
        }
    
    async def _general_prediction(self, patterns: Dict, historical: List, params: Dict) -> Dict:
        """General prediction fallback"""
        return {
            "type": "general",
            "prediction": {"placeholder": "General prediction"},
            "confidence": 0.5
        }
    
    async def _fetch_historical_context(self, prediction_type: str, timeframe: str) -> List[Dict]:
        """Fetch relevant historical data for predictions"""
        
        # Convert timeframe to timedelta
        time_map = {
            "1h": timedelta(hours=1),
            "1d": timedelta(days=1),
            "1w": timedelta(weeks=1),
            "1m": timedelta(days=30)
        }
        
        delta = time_map.get(timeframe, timedelta(days=1))
        
        # Fetch from database
        historical = await self.db.predictions.find({
            "type": prediction_type,
            "timestamp": {"$gte": datetime.utcnow() - delta}
        }).to_list(100)
        
        return historical

class CoordinatorAgent(BaseAgent):
    """Master coordinator agent that orchestrates other agents"""
    
    def __init__(self, agent_id: str, gemini_model, db):
        super().__init__(agent_id, AgentRole.COORDINATOR, gemini_model, db)
        self.agent_registry = {}
        self.active_workflows = {}
        self.task_queue = asyncio.Queue()
        self.scheduler = AsyncIOScheduler()
        
    async def initialize(self):
        """Initialize the coordinator"""
        # Start scheduler
        self.scheduler.start()
        
        # Schedule regular tasks
        self.scheduler.add_job(
            self._health_check_agents,
            IntervalTrigger(minutes=5),
            id="health_check"
        )
        
        self.scheduler.add_job(
            self._optimize_agent_allocation,
            IntervalTrigger(minutes=15),
            id="optimize_allocation"
        )
        
    def register_agent(self, agent_id: str, agent_instance: BaseAgent):
        """Register an agent with the coordinator"""
        self.agent_registry[agent_id] = {
            "instance": agent_instance,
            "role": agent_instance.role,
            "status": AgentState.IDLE,
            "capabilities": self._extract_capabilities(agent_instance),
            "performance": agent_instance.performance_metrics
        }
        
        # Set message broker if available
        if self.message_broker:
            agent_instance.set_message_broker(self.message_broker)
        
        logger.info(f"Registered agent: {agent_id} with role {agent_instance.role}")
    
    async def process_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Process coordinator messages"""
        
        if message.message_type == MessageType.TASK_ASSIGNMENT:
            # New task from external source
            task = message.data.get("task")
            priority = message.data.get("priority", 5)
            
            workflow_id = await self._create_workflow(task, priority)
            
            return AgentMessage(
                from_agent=self.agent_id,
                to_agent=message.from_agent,
                message_type=MessageType.TASK_COMPLETE,
                data={"workflow_id": workflow_id, "status": "initiated"},
                correlation_id=message.correlation_id
            )
        
        return None
    
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a coordinated task"""
        task_type = task.get("type")
        
        if task_type == "urban_monitoring":
            return await self._execute_urban_monitoring(task)
        elif task_type == "incident_response":
            return await self._execute_incident_response(task)
        elif task_type == "predictive_analysis":
            return await self._execute_predictive_analysis(task)
        elif task_type == "health_check":
            return {"status": "healthy", "timestamp": datetime.utcnow()}
        else:
            return await self._execute_general_workflow(task)
    
    async def _create_workflow(self, task: Dict[str, Any], priority: int) -> str:
        """Create a workflow for task execution"""
        workflow_id = str(uuid.uuid4())
        
        # Analyze task requirements
        required_agents = await self._determine_required_agents(task)
        
        # Create workflow plan
        workflow = {
            "id": workflow_id,
            "task": task,
            "priority": priority,
            "agents": required_agents,
            "steps": await self._plan_workflow_steps(task, required_agents),
            "status": "planning",
            "created_at": datetime.utcnow()
        }
        
        self.active_workflows[workflow_id] = workflow
        
        # Start execution
        asyncio.create_task(self._execute_workflow(workflow_id))
        
        return workflow_id
    
    async def _execute_workflow(self, workflow_id: str):
        """Execute a workflow"""
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return
        
        workflow["status"] = "executing"
        results = {}
        
        try:
            for step in workflow["steps"]:
                step_id = step["id"]
                agent_id = step["agent"]
                task = step["task"]
                dependencies = step.get("dependencies", [])
                
                # Wait for dependencies
                for dep in dependencies:
                    while dep not in results:
                        await asyncio.sleep(0.1)
                
                # Add dependency results to task
                if dependencies:
                    task["dependency_results"] = {
                        dep: results[dep] for dep in dependencies
                    }
                
                # Execute step
                agent_info = self.agent_registry.get(agent_id)
                if not agent_info:
                    raise Exception(f"Agent {agent_id} not found")
                
                agent = agent_info["instance"]
                
                # Execute task directly
                result = await agent.execute_task(task)
                results[step_id] = result
                
                # Update workflow status
                workflow["progress"] = len(results) / len(workflow["steps"])
                
        except Exception as e:
            logger.error(f"Workflow {workflow_id} failed: {e}")
            workflow["status"] = "failed"
            workflow["error"] = str(e)
        else:
            workflow["status"] = "completed"
            workflow["results"] = results
            
        # Store workflow results
        await self.db.workflows.insert_one(workflow)
    
    async def _determine_required_agents(self, task: Dict[str, Any]) -> List[str]:
        """Determine which agents are needed for a task"""
        
        # Use Gemini to analyze task requirements
        prompt = f"""
        Analyze this urban monitoring task and determine required agents:
        
        Task: {json.dumps(task)}
        
        Available agent types:
        - data_collector: Collects data from various sources
        - pattern_analyzer: Analyzes patterns in data
        - predictor: Makes predictions based on patterns
        - verifier: Verifies predictions and outcomes
        - reporter: Generates reports and alerts
        - learner: Learns from outcomes to improve system
        
        Determine:
        1. Which agents are essential
        2. Which agents would be helpful but optional
        3. Optimal execution order
        
        Consider task complexity and dependencies.
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            prompt
        )
        
        # For now, return default set based on task type
        task_type = task.get("type", "general")
        
        if task_type == "urban_monitoring":
            return ["collector_1", "analyzer_1", "predictor_1"]
        elif task_type == "incident_response":
            return ["collector_1", "analyzer_1", "predictor_1"]
        else:
            return ["collector_1", "analyzer_1"]
    
    async def _plan_workflow_steps(self, task: Dict[str, Any], agents: List[str]) -> List[Dict]:
        """Plan workflow execution steps"""
        steps = []
        
        # Basic workflow: collect → analyze → predict → report
        if "collector_1" in agents:
            steps.append({
                "id": "collect_data",
                "agent": "collector_1",
                "task": {
                    "type": "collect_data",
                    "data_type": task.get("data_type", "all"),
                    "parameters": task.get("parameters", {})
                },
                "dependencies": []
            })
        
        if "analyzer_1" in agents:
            steps.append({
                "id": "analyze_patterns",
                "agent": "analyzer_1",
                "task": {
                    "type": "analyze_patterns",
                    "analysis_type": "all"
                },
                "dependencies": ["collect_data"] if "collector_1" in agents else []
            })
        
        if "predictor_1" in agents:
            steps.append({
                "id": "make_predictions",
                "agent": "predictor_1",
                "task": {
                    "type": "make_prediction",
                    "prediction_type": task.get("prediction_type", "short_term")
                },
                "dependencies": ["analyze_patterns"] if "analyzer_1" in agents else []
            })
        
        return steps
    
    async def _execute_urban_monitoring(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute urban monitoring task"""
        workflow_id = await self._create_workflow(task, priority=5)
        
        # Wait for completion
        timeout = 60
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < timeout:
            workflow = self.active_workflows.get(workflow_id)
            if workflow and workflow["status"] == "completed":
                return workflow["results"]
            elif workflow and workflow["status"] == "failed":
                return {"error": workflow.get("error", "Workflow failed")}
            await asyncio.sleep(1)
        
        return {"error": "Workflow timed out"}
    
    async def _execute_incident_response(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute incident response task"""
        return {"type": "incident_response", "status": "not_implemented"}
    
    async def _execute_predictive_analysis(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute predictive analysis task"""
        return {"type": "predictive_analysis", "status": "not_implemented"}
    
    async def _execute_general_workflow(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute general workflow"""
        return {"type": "general", "status": "not_implemented"}
    
    async def _health_check_agents(self):
        """Check health of all registered agents"""
        for agent_id, agent_info in self.agent_registry.items():
            try:
                agent = agent_info["instance"]
                # Simple health check
                result = await agent.execute_task({"type": "health_check"})
                
                if result:
                    agent_info["status"] = AgentState.IDLE
                    agent_info["last_health_check"] = datetime.utcnow()
                else:
                    agent_info["status"] = AgentState.ERROR
                    
            except Exception as e:
                logger.warning(f"Health check failed for {agent_id}: {e}")
                agent_info["status"] = AgentState.ERROR
    
    async def _optimize_agent_allocation(self):
        """Optimize agent allocation based on workload"""
        
        # Analyze current workload
        workload_stats = {}
        
        for agent_id, agent_info in self.agent_registry.items():
            agent = agent_info["instance"]
            workload_stats[agent_id] = {
                "queue_size": agent.message_queue.qsize(),
                "active_tasks": len(agent.active_tasks),
                "performance": agent.performance_metrics
            }
        
        # Use Gemini to suggest optimizations
        prompt = f"""
        Optimize agent allocation based on current workload:
        
        Current stats:
        {json.dumps(workload_stats, indent=2)}
        
        Active workflows: {len(self.active_workflows)}
        
        Suggest:
        1. Agents that need scaling up/down
        2. Task redistribution recommendations
        3. Performance bottlenecks
        """
        
        response = await asyncio.to_thread(
            self.gemini_model.generate_content,
            prompt
        )
        
        logger.info(f"Optimization suggestions: {response.text[:200]}...")
    
    def _extract_capabilities(self, agent: BaseAgent) -> List[str]:
        """Extract capabilities from agent"""
        capabilities = []
        
        # Extract from agent methods
        for attr in dir(agent):
            if callable(getattr(agent, attr)) and not attr.startswith("_"):
                capabilities.append(attr)
        
        return capabilities

# ============== DATA COLLECTION COMPONENTS ==============

class TrafficDataScraper:
    """Placeholder for traffic data scraper"""
    pass

class PollutionDataCollector:
    """Placeholder for pollution data collector"""
    pass

class BMTCWebScraper:
    """Scrapes BMTC website and related sources"""
    
    def __init__(self):
        self.session = httpx.AsyncClient()
        self.routes_cache = {}
        
    async def scrape_route_info(self, routes: List[str]) -> List[Dict[str, Any]]:
        """Scrape route information from various sources"""
        results = []
        
        # Try official BMTC site (if available)
        # Fall back to alternative sources
        sources = [
            "https://mybmtc.karnataka.gov.in/new-page/Pushpak/en",
            "https://bmtcwebsite.com/",  # Alternative
            "https://moovitapp.com/bangalore-560/lines/bus/",  # Moovit
        ]
        
        for source in sources:
            try:
                response = await self.session.get(source, timeout=10.0)
                if response.status_code == 200:
                    # Parse HTML
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Extract route information
                    route_data = self._parse_bmtc_page(soup, routes)
                    results.extend(route_data)
                    
                    if results:  # If we got data, don't try other sources
                        break
                        
            except Exception as e:
                logger.warning(f"Failed to scrape {source}: {e}")
                continue
        
        return results
    
    def _parse_bmtc_page(self, soup: BeautifulSoup, target_routes: List[str]) -> List[Dict]:
        """Parse BMTC page for route information"""
        route_data = []
        
        for route in target_routes:
            route_info = {
                "route": route,
                "source": "bmtc_scraper",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {}
            }
            
            # Search for route in page
            route_elements = soup.find_all(text=re.compile(route))
            
            if route_elements:
                # Extract surrounding context
                for element in route_elements:
                    parent = element.parent
                    if parent:
                        route_info["data"]["found"] = True
                        route_info["data"]["context"] = parent.get_text()[:200]
                        
            route_data.append(route_info)
        
        return route_data

class BESCOMWebScraper:
    """Scrapes BESCOM website for power information"""
    
    def __init__(self):
        self.session = httpx.AsyncClient()
        
    async def scrape_outage_schedule(self, areas: List[str]) -> List[Dict[str, Any]]:
        """Scrape scheduled outage information"""
        results = []
        
        # BESCOM URLs
        urls = [
            "https://bescom.karnataka.gov.in/storage-category/power-outage-information/",
            "https://bescom.co.in/power-outage/",
            "https://bescom.karnataka.gov.in/new-page/Scheduled%20Load%20Shedding/en"
        ]
        
        for url in urls:
            try:
                response = await self.session.get(url, timeout=10.0)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Look for PDFs, tables, or announcements
                    outage_data = await self._extract_outage_info(soup, areas)
                    results.extend(outage_data)
                    
            except Exception as e:
                logger.warning(f"Failed to scrape BESCOM: {e}")
        
        return results
    
    async def _extract_outage_info(self, soup: BeautifulSoup, areas: List[str]) -> List[Dict]:
        """Extract outage information from HTML"""
        outages = []
        
        # Look for tables with outage info
        tables = soup.find_all('table')
        for table in tables:
            # Check if table contains area names
            table_text = table.get_text()
            
            for area in areas:
                if area.lower() in table_text.lower():
                    outages.append({
                        "area": area,
                        "source": "bescom_website",
                        "type": "scheduled_outage",
                        "data": self._parse_outage_table(table, area),
                        "timestamp": datetime.utcnow().isoformat()
                    })
        
        return outages
    
    def _parse_outage_table(self, table, area: str) -> Dict:
        """Parse outage table for specific area"""
        data = {
            "schedule": [],
            "affected_areas": [],
            "duration": "Unknown"
        }
        
        rows = table.find_all('tr')
        for row in rows:
            row_text = row.get_text()
            if area.lower() in row_text.lower():
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    data["schedule"].append({
                        "date": cells[0].get_text().strip(),
                        "time": cells[1].get_text().strip() if len(cells) > 1 else "Unknown",
                        "details": cells[2].get_text().strip() if len(cells) > 2 else ""
                    })
        
        return data

class TwitterCollector:
    """Collects data from Twitter/X"""
    
    def __init__(self):
        self.keywords = [
            "#BangaloreTraffic", "#BLRTraffic", "#BMTC", "#BESCOM",
            "Bangalore traffic", "Bengaluru power cut", "BMTC delay"
        ]
        
    async def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search Twitter for relevant posts"""
        results = []
        
        # Simulated data for development
        for i in range(min(limit, 5)):
            results.append({
                "source": "twitter",
                "type": "social_media",
                "content": f"Simulated tweet about {query}",
                "author": f"user_{i}",
                "timestamp": datetime.utcnow().isoformat(),
                "engagement": {
                    "likes": 10 + i * 5,
                    "retweets": 5 + i * 2
                },
                "location": "Bangalore"
            })
        
        return results

class RedditCollector:
    """Collects data from Reddit"""
    
    def __init__(self):
        self.subreddits = ["bangalore", "bengaluru"]
        
    async def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search Reddit for relevant posts"""
        results = []
        
        # Simulated data for development
        for i in range(min(limit, 3)):
            results.append({
                "source": "reddit",
                "type": "social_media",
                "subreddit": "r/bangalore",
                "title": f"Discussion about {query}",
                "content": f"Simulated Reddit post content about {query}",
                "author": f"redditor_{i}",
                "timestamp": datetime.utcnow().isoformat(),
                "upvotes": 50 + i * 10,
                "comments": 10 + i * 5,
                "url": f"https://reddit.com/r/bangalore/post{i}"
            })
        
        return results

class TelegramMonitor:
    """Monitors Telegram channels for city updates"""
    
    def __init__(self):
        self.channels = [
            "BangaloreTrafficUpdates",
            "BLRConnect",
            "BangaloreCityUpdates"
        ]
        
    async def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search Telegram channels"""
        results = []
        
        # Simulated data for development
        for i in range(min(limit, 3)):
            results.append({
                "source": "telegram",
                "type": "social_media",
                "channel": self.channels[i % len(self.channels)],
                "content": f"Update from Telegram about {query}",
                "timestamp": datetime.utcnow().isoformat(),
                "views": 1000 + i * 100,
                "reactions": {
                    "👍": 50 + i * 10,
                    "❤️": 20 + i * 5
                }
            })
        
        return results

class CitizenReportCollector:
    """Collects and validates citizen reports"""
    
    def __init__(self, db):
        self.db = db
        
    async def get_recent_reports(self, category: str = None, 
                               time_window: timedelta = timedelta(hours=1)) -> List[Dict]:
        """Get recent citizen reports"""
        
        query = {
            "timestamp": {"$gte": datetime.utcnow() - time_window}
        }
        
        if category:
            query["category"] = category
        
        reports = await self.db.citizen_reports.find(query).to_list(100)
        
        # Format reports
        formatted_reports = []
        for report in reports:
            formatted_reports.append({
                "source": "citizen_report",
                "type": "user_generated",
                "category": report.get("category", "general"),
                "content": report.get("content", ""),
                "location": report.get("location"),
                "timestamp": report.get("timestamp").isoformat() if report.get("timestamp") else datetime.utcnow().isoformat(),
                "verified": report.get("verified", False),
                "upvotes": report.get("upvotes", 0),
                "images": report.get("images", [])
            })
        
        return formatted_reports

class TrafficSensorSimulator:
    """Simulates IoT traffic sensor data"""
    
    def __init__(self):
        self.sensor_locations = {
            "Silk Board": {"lat": 12.9173, "lon": 77.6228},
            "KR Puram": {"lat": 12.9953, "lon": 77.6807},
            "Marathahalli": {"lat": 12.9562, "lon": 77.7019},
            "Electronic City": {"lat": 12.8399, "lon": 77.6770},
            "Whitefield": {"lat": 12.9698, "lon": 77.7500}
        }
        
    async def generate_readings(self, locations: List[str] = None) -> List[Dict]:
        """Generate simulated traffic sensor readings"""
        
        if not locations:
            locations = list(self.sensor_locations.keys())
        
        readings = []
        current_time = datetime.utcnow()
        
        for location in locations:
            if location in self.sensor_locations:
                # Generate realistic traffic data based on time of day
                hour = current_time.hour
                
                # Peak hours: 8-10 AM, 5-8 PM
                if 8 <= hour <= 10 or 17 <= hour <= 20:
                    congestion_level = np.random.uniform(0.7, 0.95)
                    avg_speed = np.random.uniform(10, 25)
                else:
                    congestion_level = np.random.uniform(0.2, 0.5)
                    avg_speed = np.random.uniform(30, 50)
                
                readings.append({
                    "source": "traffic_sensor",
                    "type": "iot_data",
                    "location": location,
                    "coordinates": self.sensor_locations[location],
                    "timestamp": current_time.isoformat(),
                    "data": {
                        "congestion_level": round(congestion_level, 2),
                        "average_speed_kmh": round(avg_speed, 1),
                        "vehicle_count": int(congestion_level * 1000),
                        "incident_detected": np.random.random() < 0.1  # 10% chance
                    }
                })
        
        return readings

class PowerGridSimulator:
    """Simulates power grid sensor data"""
    
    def __init__(self):
        self.grid_zones = {
            "Koramangala": {"capacity_mw": 50, "baseline_load": 0.7},
            "Indiranagar": {"capacity_mw": 45, "baseline_load": 0.65},
            "Whitefield": {"capacity_mw": 80, "baseline_load": 0.75},
            "Electronic City": {"capacity_mw": 100, "baseline_load": 0.8},
            "Jayanagar": {"capacity_mw": 40, "baseline_load": 0.6}
        }
        
    async def generate_readings(self, areas: List[str] = None) -> List[Dict]:
        """Generate simulated power grid readings"""
        
        if not areas:
            areas = list(self.grid_zones.keys())
        
        readings = []
        current_time = datetime.utcnow()
        hour = current_time.hour
        
        for area in areas:
            if area in self.grid_zones:
                zone_info = self.grid_zones[area]
                
                # Simulate load based on time of day
                if 6 <= hour <= 10 or 18 <= hour <= 22:
                    load_factor = zone_info["baseline_load"] + np.random.uniform(0.1, 0.25)
                else:
                    load_factor = zone_info["baseline_load"] - np.random.uniform(0.1, 0.2)
                
                load_factor = min(0.95, max(0.3, load_factor))
                
                readings.append({
                    "source": "power_grid_sensor",
                    "type": "iot_data",
                    "area": area,
                    "timestamp": current_time.isoformat(),
                    "data": {
                        "capacity_mw": zone_info["capacity_mw"],
                        "current_load_mw": round(zone_info["capacity_mw"] * load_factor, 2),
                        "load_percentage": round(load_factor * 100, 1),
                        "voltage_stability": "stable" if load_factor < 0.85 else "warning",
                        "temperature_celsius": round(25 + load_factor * 20, 1),
                        "predicted_failure_risk": "high" if load_factor > 0.9 else "low"
                    }
                })
        
        return readings

class WeatherAPICollector:
    """Collects weather data from OpenWeatherMap"""
    
    def __init__(self):
        self.api_key = "4aafd94810b358344d8a345224b16abc"
        self.session = httpx.AsyncClient()
        
    async def get_weather(self, lat: float, lon: float) -> Dict[str, Any]:
        """Get current weather data"""
        
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "units": "metric"
        }
        
        try:
            response = await self.session.get(url, params=params)
            data = response.json()
            
            return {
                "source": "openweathermap",
                "type": "weather_data",
                "timestamp": datetime.utcnow().isoformat(),
                "location": {"lat": lat, "lon": lon},
                "data": {
                    "temperature": data["main"]["temp"],
                    "feels_like": data["main"]["feels_like"],
                    "humidity": data["main"]["humidity"],
                    "pressure": data["main"]["pressure"],
                    "weather": data["weather"][0]["main"],
                    "description": data["weather"][0]["description"],
                    "wind_speed": data["wind"]["speed"],
                    "visibility": data.get("visibility", 10000)
                }
            }
        except Exception as e:
            logger.error(f"Weather API error: {e}")
            return {
                "source": "openweathermap",
                "type": "weather_data",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

class NewsAggregator:
    """Aggregates news from multiple sources"""
    
    def __init__(self):
        self.rss_feeds = [
            "https://timesofindia.indiatimes.com/rssfeeds/4118235.cms",
            "https://www.deccanherald.com/rss/bengaluru.xml",
            "https://www.thehindu.com/news/cities/bangalore/?service=rss"
        ]
        self.session = httpx.AsyncClient()
        
    async def fetch_latest_news(self, keywords: List[str] = None) -> List[Dict]:
        """Fetch latest news articles"""
        
        all_articles = []
        
        for feed_url in self.rss_feeds:
            try:
                articles = await self._parse_rss_feed(feed_url, keywords)
                all_articles.extend(articles)
            except Exception as e:
                logger.warning(f"Failed to fetch from {feed_url}: {e}")
        
        # Sort by timestamp
        all_articles.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return all_articles[:20]  # Return latest 20
    
    async def _parse_rss_feed(self, feed_url: str, keywords: List[str] = None) -> List[Dict]:
        """Parse RSS feed for articles"""
        
        response = await self.session.get(feed_url)
        feed = feedparser.parse(response.text)
        
        articles = []
        
        for entry in feed.entries[:10]:
            # Filter by keywords if provided
            if keywords:
                content = f"{entry.title} {entry.get('summary', '')}".lower()
                if not any(keyword.lower() in content for keyword in keywords):
                    continue
            
            articles.append({
                "source": "news_rss",
                "type": "news_article",
                "title": entry.title,
                "summary": entry.get("summary", ""),
                "url": entry.get("link", ""),
                "published": entry.get("published", ""),
                "timestamp": datetime.utcnow().isoformat(),
                "feed_source": feed.feed.title if hasattr(feed, 'feed') and hasattr(feed.feed, 'title') else "Unknown"
            })
        
        return articles

# ============== MAIN MULTI-AGENT SYSTEM ==============

class CityPulseMultiAgentSystem:
    """Main multi-agent system orchestrator"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.agents = {}
        self.coordinator = None
        self.db = None
        self.message_broker = InMemoryMessageBroker()
        self.gemini_model = None
        
    async def initialize(self):
        """Initialize the multi-agent system"""
        
        # Initialize Gemini
        genai.configure(api_key=self.config["gemini_api_key"])
        self.gemini_model = genai.GenerativeModel('gemini-2.5-pro')
        
        # Initialize MongoDB
        motor_client = AsyncIOMotorClient(self.config["mongodb_url"])
        self.db = motor_client[self.config["database_name"]]
        
        # Create agents
        await self._create_agents()
        
        # Initialize coordinator
        self.coordinator = CoordinatorAgent(
            "coordinator",
            self.gemini_model,
            self.db
        )
        self.coordinator.set_message_broker(self.message_broker)
        await self.coordinator.initialize()
        
        # Register all agents with coordinator
        for agent_id, agent in self.agents.items():
            self.coordinator.register_agent(agent_id, agent)
        
        logger.info("Multi-agent system initialized successfully")
    
    async def _create_agents(self):
        """Create all system agents"""
        
        # Data Collectors
        self.agents["collector_1"] = DataCollectorAgent(
            "collector_1",
            self.gemini_model,
            self.db
        )
        
        # Pattern Analyzers
        self.agents["analyzer_1"] = PatternAnalyzerAgent(
            "analyzer_1",
            self.gemini_model,
            self.db
        )
        
        # Predictors
        self.agents["predictor_1"] = PredictorAgent(
            "predictor_1",
            self.gemini_model,
            self.db
        )
        
        # Set message broker for all agents
        for agent in self.agents.values():
            agent.set_message_broker(self.message_broker)
        
        # Create message processing tasks for each agent
        for agent_id, agent in self.agents.items():
            asyncio.create_task(self._agent_message_loop(agent_id, agent))
    
    async def _agent_message_loop(self, agent_id: str, agent: BaseAgent):
        """Message processing loop for an agent"""
        
        # Subscribe to agent's channel
        queue = self.message_broker.subscribe(f"agent:{agent_id}")
        
        while True:
            try:
                # Get message from queue
                message_data = await queue.get()
                
                if message_data:
                    message_dict = json.loads(message_data)
                    
                    # Create AgentMessage
                    message = AgentMessage(
                        from_agent=message_dict["sender"],
                        to_agent=agent_id,
                        message_type=MessageType(message_dict["type"]),
                        data=message_dict["content"],
                        correlation_id=message_dict["correlation_id"]
                    )
                    
                    # Process message
                    response = await agent.process_message(message)
                    
                    # If response, store it
                    if response:
                        response_key = f"response:{message.correlation_id}"
                        await self.message_broker.store_response(
                            response_key,
                            response.data,
                            expire=300  # 5 minute TTL
                        )
                
            except Exception as e:
                logger.error(f"Error in message loop for {agent_id}: {e}")
                await asyncio.sleep(1)
    
    async def execute_urban_monitoring(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute comprehensive urban monitoring"""
        
        task = {
            "type": "urban_monitoring",
            "parameters": parameters,
            "data_types": ["traffic", "power_grid", "bmtc", "weather", "news"],
            "prediction_types": ["short_term", "cascade_effect"],
            "report_type": "comprehensive"
        }
        
        # Send to coordinator
        workflow_id = await self.coordinator._create_workflow(task, priority=5)
        
        # Wait for completion (with timeout)
        timeout = 60  # seconds
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < timeout:
            workflow = self.coordinator.active_workflows.get(workflow_id)
            
            if workflow and workflow["status"] == "completed":
                return workflow["results"]
            elif workflow and workflow["status"] == "failed":
                raise Exception(f"Workflow failed: {workflow.get('error', 'Unknown error')}")
            
            await asyncio.sleep(1)
        
        raise TimeoutError("Urban monitoring workflow timed out")
    
    async def shutdown(self):
        """Shutdown the multi-agent system"""
        
        # Stop all agents
        for agent_id, agent in self.agents.items():
            agent.state = AgentState.MAINTENANCE
        
        logger.info("Multi-agent system shut down")

# ============== USAGE EXAMPLE ==============

async def main():
    """Example usage of the multi-agent system"""
    
    config = {
        "gemini_api_key": "YOUR_API_KEY",
        "mongodb_url": "mongodb://localhost:27017",
        "database_name": "citypulse_multiagent"
    }
    
    # Initialize system
    mas = CityPulseMultiAgentSystem(config)
    await mas.initialize()
    
    # Execute urban monitoring
    try:
        results = await mas.execute_urban_monitoring({
            "areas": ["Koramangala", "Whitefield", "Electronic City"],
            "focus": ["traffic", "power"],
            "time_window": "1h"
        })
        
        print("Urban Monitoring Results:")
        print(json.dumps(results, indent=2))
        
    finally:
        await mas.shutdown()

if __name__ == "__main__":
    asyncio.run(main())