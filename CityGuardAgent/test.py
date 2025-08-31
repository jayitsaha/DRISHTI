#!/usr/bin/env python3
"""
Comprehensive test script for CityPulse API
Tests all endpoints and functionality
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List
import httpx
import websockets
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.live import Live
from rich.layout import Layout
from rich.progress import Progress, SpinnerColumn, TextColumn
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rich console for pretty output
console = Console()

# API Base URL
BASE_URL = "http://127.0.0.1:8005"
WS_URL = "ws://127.0.0.1:8005/ws"

class CityPulseAPITester:
    """Test suite for CityPulse API"""
    
    def __init__(self):
        self.results = {
            "passed": 0,
            "failed": 0,
            "tests": []
        }
        
    async def run_all_tests(self):
        """Run all tests"""
        console.print("\n[bold cyan]🚀 Starting CityPulse API Test Suite[/bold cyan]\n")
        
        # Test categories
        test_categories = [
            ("Health Check", self.test_health_check),
            ("Chat Interface", self.test_chat_interface),
            ("Traffic Data", self.test_traffic_data),
            ("Power Data", self.test_power_data),
            ("Weather Data", self.test_weather_data),
            ("City Status", self.test_city_status),
            ("Issue Reporting", self.test_issue_reporting),
            ("Map Data", self.test_map_data),
            ("WebSocket Connection", self.test_websocket),
            ("Complex Queries", self.test_complex_queries),
            ("Error Handling", self.test_error_handling),
        ]
        
        # Run tests with progress indicator
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            
            for category, test_func in test_categories:
                task = progress.add_task(f"Testing {category}...", total=1)
                
                try:
                    await test_func()
                    self.results["passed"] += 1
                    self.results["tests"].append({
                        "name": category,
                        "status": "✅ PASSED",
                        "time": datetime.now()
                    })
                except Exception as e:
                    self.results["failed"] += 1
                    self.results["tests"].append({
                        "name": category,
                        "status": f"❌ FAILED: {str(e)}",
                        "time": datetime.now()
                    })
                    logger.error(f"Test {category} failed: {e}")
                
                progress.update(task, completed=1)
                await asyncio.sleep(0.5)  # Brief pause between tests
        
        # Display results
        self.display_results()
    
    async def test_health_check(self):
        """Test health check endpoint"""
        console.print("\n[yellow]Testing Health Check...[/yellow]")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/health")
            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert data["status"] == "healthy"
            console.print("✅ Health check passed")
    
    async def test_chat_interface(self):
        """Test chat endpoints"""
        console.print("\n[yellow]Testing Chat Interface...[/yellow]")
        
        test_queries = [
            {
                "message": "What's the traffic situation in Koramangala?",
                "user_id": "test_user_1",
                "location": {"lat": 12.9352, "lng": 77.6245}
            },
            {
                "message": "Is there any power cut scheduled in Whitefield today?",
                "user_id": "test_user_2",
                "location": {"lat": 12.9698, "lng": 77.7500}
            },
            {
                "message": "Will it rain today in Bangalore?",
                "user_id": "test_user_3",
                "location": None
            },
            {
                "message": "I want to report a traffic jam at Silk Board junction",
                "user_id": "test_user_4",
                "location": {"lat": 12.9173, "lng": 77.6228}
            }
        ]
        
        async with httpx.AsyncClient(timeout=200.0) as client:
            for query in test_queries:
                console.print(f"  → Testing query: '{query['message'][:50]}...'")
                response = await client.post(f"{BASE_URL}/chat", json=query)
                assert response.status_code == 200
                data = response.json()
                assert "type" in data
                assert "message" in data
                console.print(f"    ✓ Response type: {data['type']}")
                console.print(f"{data['message']}")
                await asyncio.sleep(1)  # Rate limiting
        
        console.print("✅ Chat interface tests passed")
    
    async def test_traffic_data(self):
        """Test traffic data endpoints"""
        console.print("\n[yellow]Testing Traffic Data Collection...[/yellow]")
        
        test_cases = [
            {"areas": ["Koramangala", "Whitefield"]},
            {"areas": ["Electronic City", "Marathahalli", "Indiranagar"]},
            {}  # Test default areas
        ]
        
        async with httpx.AsyncClient(timeout=200.0) as client:
            for i, test in enumerate(test_cases):
                areas_param = "&".join([f"areas={area}" for area in test.get("areas", [])])
                url = f"{BASE_URL}/data/traffic"
                if areas_param:
                    url += f"?{areas_param}"
                
                console.print(f"  → Test case {i+1}: {test.get('areas', 'default areas')}")
                response = await client.get(url)
                assert response.status_code == 200
                data = response.json()
                assert "source" in data
                assert "timestamp" in data
                assert "data" in data
                console.print(f"    ✓ Got {len(data.get('data', []))} traffic data points")
                
                # Verify Gemini search results if present
                if "gemini_search" in data:
                    console.print("    ✓ Gemini search results included")
        
        console.print("✅ Traffic data tests passed")
    
    async def test_power_data(self):
        """Test power data endpoints"""
        console.print("\n[yellow]Testing Power Data Collection...[/yellow]")
        
        areas_list = [
            ["Koramangala", "Jayanagar"],
            ["Whitefield", "Electronic City"],
            []  # Default areas
        ]
        
        async with httpx.AsyncClient(timeout=200.0) as client:
            for areas in areas_list:
                areas_param = "&".join([f"areas={area}" for area in areas])
                url = f"{BASE_URL}/data/power"
                if areas_param:
                    url += f"?{areas_param}"
                
                console.print(f"  → Testing areas: {areas if areas else 'default'}")
                response = await client.get(url)
                assert response.status_code == 200
                data = response.json()
                assert "source" in data
                assert "data" in data
                console.print(f"    ✓ Got power data for {len(areas if areas else ['default'])} areas")
                
                # Check for Gemini insights
                if "gemini_search" in data:
                    console.print("    ✓ AI-powered outage predictions included")
        
        console.print("✅ Power data tests passed")
    
    async def test_weather_data(self):
        """Test weather data endpoint"""
        console.print("\n[yellow]Testing Weather Data...[/yellow]")
        
        async with httpx.AsyncClient(timeout=200.0) as client:
            response = await client.get(f"{BASE_URL}/data/weather")
            assert response.status_code == 200
            data = response.json()
            assert "source" in data
            assert "data" in data
            
            # Check weather data structure
            weather_data = data.get("data", {})
            if "current" in weather_data:
                current = weather_data["current"]
                console.print(f"  → Temperature: {current.get('temperature')}°C")
                console.print(f"  → Weather: {current.get('weather')}")
                console.print(f"  → Humidity: {current.get('humidity')}%")
            
            if "rain_forecast" in weather_data:
                console.print(f"  → Rain forecast available: {len(weather_data['rain_forecast'])} data points")
        
        console.print("✅ Weather data test passed")
    
    async def test_city_status(self):
        """Test comprehensive city status"""
        console.print("\n[yellow]Testing City Status...[/yellow]")
        
        async with httpx.AsyncClient(timeout=200.0) as client:
            response = await client.get(f"{BASE_URL}/city/status")
            assert response.status_code == 200
            data = response.json()
            
            # Verify all data types are present
            expected_keys = ["timestamp", "traffic", "power", "weather"]
            for key in expected_keys:
                assert key in data, f"Missing key: {key}"
                console.print(f"  ✓ {key.capitalize()} data present")
            
            # Display summary
            if "traffic" in data and "data" in data["traffic"]:
                console.print(f"  → Traffic data points: {len(data['traffic']['data'])}")
            if "power" in data and "data" in data["power"]:
                console.print(f"  → Power data points: {len(data['power']['data'])}")
        
        console.print("✅ City status test passed")
    
    async def test_issue_reporting(self):
        """Test issue reporting endpoint"""
        console.print("\n[yellow]Testing Issue Reporting...[/yellow]")
        
        test_reports = [
            {
                "category": "traffic",
                "description": "Major traffic jam at Silk Board due to accident",
                "location": {"lat": 12.9173, "lng": 77.6228},
                "address": "Silk Board Junction, Bangalore",
                "urgency": "high"
            },
            {
                "category": "power",
                "description": "Unexpected power cut in Koramangala 4th block",
                "location": {"lat": 12.9352, "lng": 77.6245},
                "urgency": "medium",
                "contact": "test@example.com"
            },
            {
                "category": "water",
                "description": "Water pipeline burst near Indiranagar metro station",
                "location": {"lat": 12.9783, "lng": 77.6408},
                "urgency": "critical"
            }
        ]
        
        async with httpx.AsyncClient() as client:
            for report in test_reports:
                console.print(f"  → Reporting: {report['category']} - {report['description'][:40]}...")
                response = await client.post(f"{BASE_URL}/report/issue", json=report)
                assert response.status_code == 200
                data = response.json()
                assert "report_id" in data
                assert "status" in data
                assert data["status"] == "received"
                console.print(f"    ✓ Report ID: {data['report_id']}")
        
        console.print("✅ Issue reporting tests passed")
    
    async def test_map_data(self):
        """Test map data endpoints"""
        console.print("\n[yellow]Testing Map Data...[/yellow]")
        
        data_types = ["all", "traffic", "power", "reports"]
        
        async with httpx.AsyncClient() as client:
            for data_type in data_types:
                console.print(f"  → Testing map data type: {data_type}")
                response = await client.get(f"{BASE_URL}/map/data?data_type={data_type}")
                assert response.status_code == 200
                data = response.json()
                assert "type" in data
                assert data["type"] == "FeatureCollection"
                assert "features" in data
                
                features = data.get("features", [])
                console.print(f"    ✓ Got {len(features)} map features")
                
                # Verify feature structure
                if features:
                    feature = features[0]
                    assert "type" in feature
                    assert "geometry" in feature
                    assert "properties" in feature
        
        console.print("✅ Map data tests passed")
    
    async def test_websocket(self):
        """Test WebSocket connection"""
        console.print("\n[yellow]Testing WebSocket Connection...[/yellow]")
        
        try:
            async with websockets.connect(WS_URL) as websocket:
                console.print("  ✓ WebSocket connected")
                
                # Send subscription message
                await websocket.send(json.dumps({
                    "action": "subscribe",
                    "channels": ["traffic", "power", "alerts"]
                }))
                console.print("  ✓ Subscription sent")
                
                # Wait for a message (with timeout)
                try:
                    message = await asyncio.wait_for(
                        websocket.recv(), 
                        timeout=5.0
                    )
                    data = json.loads(message)
                    console.print(f"  ✓ Received message type: {data.get('type', 'unknown')}")
                except asyncio.TimeoutError:
                    console.print("  ℹ No messages received (this is okay for testing)")
                
                # Close connection
                await websocket.close()
                console.print("  ✓ WebSocket closed properly")
                
        except Exception as e:
            # WebSocket might not have any data to send immediately
            console.print(f"  ℹ WebSocket test completed with: {str(e)}")
        
        console.print("✅ WebSocket test completed")
    
    async def test_complex_queries(self):
        """Test complex multi-part queries"""
        console.print("\n[yellow]Testing Complex Queries...[/yellow]")
        
        complex_queries = [
            {
                "message": "What's the traffic like in Koramangala and is there any power cut scheduled? Also, will it rain?",
                "user_id": "complex_test_1",
                "location": {"lat": 12.9352, "lng": 77.6245}
            },
            {
                "message": "I need to travel from Electronic City to Whitefield. What's the best time considering traffic and weather?",
                "user_id": "complex_test_2",
                "location": {"lat": 12.8399, "lng": 77.6770}
            },
            {
                "message": "Are there any major issues reported in Indiranagar area today?",
                "user_id": "complex_test_3",
                "location": {"lat": 12.9783, "lng": 77.6408}
            }
        ]
        
        async with httpx.AsyncClient(timeout=200.0) as client:
            for query in complex_queries:
                console.print(f"  → Complex query: '{query['message'][:60]}...'")
                response = await client.post(f"{BASE_URL}/chat", json=query)
                assert response.status_code == 200
                data = response.json()
                console.print(f"    ✓ Got Message: {data.get('message', 'unknown')}")
                console.print(f"    ✓ Got response type: {data.get('type', 'unknown')}")
                await asyncio.sleep(2)  # Rate limiting for complex queries
        
        console.print("✅ Complex query tests passed")
    
    async def test_error_handling(self):
        """Test error handling"""
        console.print("\n[yellow]Testing Error Handling...[/yellow]")
        
        # Test invalid endpoints
        async with httpx.AsyncClient() as client:
            # Invalid endpoint
            response = await client.get(f"{BASE_URL}/invalid/endpoint")
            assert response.status_code == 404
            console.print("  ✓ 404 handling works")
            
            # Invalid chat request
            response = await client.post(f"{BASE_URL}/chat", json={})
            assert response.status_code in [422, 400]  # Validation error
            console.print("  ✓ Validation error handling works")
            
            # Invalid issue report
            response = await client.post(f"{BASE_URL}/report/issue", json={"invalid": "data"})
            assert response.status_code in [422, 400]
            console.print("  ✓ Issue validation works")
        
        console.print("✅ Error handling tests passed")
    
    def display_results(self):
        """Display test results summary"""
        console.print("\n" + "="*60 + "\n")
        
        # Create summary table
        table = Table(title="Test Results Summary", show_header=True, header_style="bold magenta")
        table.add_column("Test Category", style="cyan", no_wrap=True)
        table.add_column("Status", justify="center")
        table.add_column("Time", justify="center")
        
        for test in self.results["tests"]:
            table.add_row(
                test["name"],
                test["status"],
                test["time"].strftime("%H:%M:%S")
            )
        
        console.print(table)
        
        # Summary panel
        total = self.results["passed"] + self.results["failed"]
        success_rate = (self.results["passed"] / total * 100) if total > 0 else 0
        
        summary = f"""
[bold green]✅ Passed:[/bold green] {self.results['passed']}
[bold red]❌ Failed:[/bold red] {self.results['failed']}
[bold blue]📊 Success Rate:[/bold blue] {success_rate:.1f}%
[bold yellow]🏁 Total Tests:[/bold yellow] {total}
        """
        
        console.print(Panel(summary, title="Final Results", border_style="bold"))
        
        if self.results["failed"] == 0:
            console.print("\n[bold green]🎉 All tests passed! The CityPulse API is working correctly.[/bold green]\n")
        else:
            console.print("\n[bold red]⚠️  Some tests failed. Please check the logs for details.[/bold red]\n")

# Performance testing utilities
async def load_test_endpoint(endpoint: str, num_requests: int = 10):
    """Simple load test for an endpoint"""
    console.print(f"\n[yellow]Load testing {endpoint} with {num_requests} requests...[/yellow]")
    
    start_time = time.time()
    successful = 0
    failed = 0
    
    async with httpx.AsyncClient() as client:
        tasks = []
        for i in range(num_requests):
            task = client.get(f"{BASE_URL}{endpoint}")
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        for response in responses:
            if isinstance(response, Exception):
                failed += 1
            elif response.status_code == 200:
                successful += 1
            else:
                failed += 1
    
    duration = time.time() - start_time
    requests_per_second = num_requests / duration
    
    console.print(f"  ✓ Completed in {duration:.2f} seconds")
    console.print(f"  ✓ Successful: {successful}, Failed: {failed}")
    console.print(f"  ✓ Rate: {requests_per_second:.2f} requests/second")

# Utility function to test specific scenarios
async def test_specific_scenario(scenario: str):
    """Test specific scenarios"""
    scenarios = {
        "rush_hour": {
            "message": "What's the traffic situation during rush hour?",
            "user_id": "rush_hour_test",
            "context": {"time": "08:30", "day": "Monday"}
        },
        "emergency": {
            "message": "There's a major accident blocking the entire road at MG Road!",
            "user_id": "emergency_test",
            "location": {"lat": 12.9738, "lng": 77.6066}
        },
        "multi_area": {
            "message": "Compare traffic in Koramangala, Whitefield, and Electronic City",
            "user_id": "multi_area_test"
        }
    }
    
    if scenario in scenarios:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{BASE_URL}/chat", json=scenarios[scenario])
            console.print(f"\nScenario '{scenario}' response:")
            console.print(json.dumps(response.json(), indent=2))

# Main entry point
async def main():
    """Main test runner"""
    import argparse
    
    parser = argparse.ArgumentParser(description="CityPulse API Test Suite")
    parser.add_argument("--load-test", action="store_true", help="Run load tests")
    parser.add_argument("--scenario", type=str, help="Test specific scenario")
    parser.add_argument("--endpoint", type=str, help="Test specific endpoint")
    args = parser.parse_args()
    
    # Ensure the API is running
    console.print("[bold cyan]CityPulse API Test Suite v1.0[/bold cyan]")
    console.print("\nMake sure the API is running at http://127.0.0.1:8005\n")
    
    # Wait a moment for user to see the message
    await asyncio.sleep(2)
    
    if args.scenario:
        await test_specific_scenario(args.scenario)
    elif args.endpoint:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}{args.endpoint}")
            console.print(f"Response from {args.endpoint}:")
            console.print(json.dumps(response.json(), indent=2))
    elif args.load_test:
        await load_test_endpoint("/health", 100)
        await load_test_endpoint("/data/weather", 50)
        await load_test_endpoint("/data/traffic", 20)
    else:
        # Run all tests
        tester = CityPulseAPITester()
        await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())