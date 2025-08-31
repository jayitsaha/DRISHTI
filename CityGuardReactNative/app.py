from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os
import json

app = Flask(__name__)
cors = CORS(app)

# Firebase configuration
PROJECT_ID = "cityai-8987c"

# Initialize Firebase Admin SDK
firebase_initialized = False
db = None

def initialize_firebase():
    global firebase_initialized, db
    
    # Method 1: Try using service account file
    if os.path.exists('cityai-8987c-firebase-adminsdk-fbsvc-e8b0bc8fdc.json'):
        try:
            cred = credentials.Certificate('cityai-8987c-firebase-adminsdk-fbsvc-e8b0bc8fdc.json')
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            firebase_initialized = True
            print("Firebase initialized with service account file")
            return
        except Exception as e:
            print(f"Failed to initialize with service account file: {e}")
    
    # Method 2: Try using environment variables
    if os.environ.get("FIREBASE_PRIVATE_KEY"):
        try:
            firebase_config = {
                "type": "service_account",
                "project_id": PROJECT_ID,
                "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID", ""),
                "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
                "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL", ""),
                "client_id": os.environ.get("FIREBASE_CLIENT_ID", ""),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": os.environ.get("FIREBASE_CERT_URL", "")
            }
            cred = credentials.Certificate(firebase_config)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            firebase_initialized = True
            print("Firebase initialized with environment variables")
            return
        except Exception as e:
            print(f"Failed to initialize with environment variables: {e}")
    
    # Method 3: Try using Application Default Credentials (for Google Cloud environments)
    try:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': PROJECT_ID,
        })
        db = firestore.client()
        firebase_initialized = True
        print("Firebase initialized with Application Default Credentials")
        return
    except Exception as e:
        print(f"Failed to initialize with default credentials: {e}")
    
    print("WARNING: Firebase initialization failed. Using mock data only.")
    print("To use real data, please set up Firebase Admin SDK credentials.")
    print("See: https://firebase.google.com/docs/admin/setup#python")

# Initialize Firebase on startup
initialize_firebase()

def format_location(location):
    """Format location data for response"""
    if location:
        return f"{location.get('latitude', 0)}, {location.get('longitude', 0)}"
    return "12.973826, 77.590591"  # Default Bangalore coordinates

def format_timestamp(timestamp):
    """Format timestamp for response"""
    if timestamp:
        try:
            # Handle Firestore timestamp
            if hasattr(timestamp, 'seconds'):
                return datetime.fromtimestamp(timestamp.seconds).strftime('%Y-%m-%d %H:%M:%S')
            # Handle datetime object
            elif isinstance(timestamp, datetime):
                return timestamp.strftime('%Y-%m-%d %H:%M:%S')
            # Handle string
            else:
                return str(timestamp)
        except:
            pass
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def calculate_avatar_text(priority_score):
    """Calculate avatar text based on priority score"""
    if priority_score:
        return str(priority_score * 10)  # Convert 1-10 to 10-100
    return "50"

def get_avatar_color(issue_type):
    """Get avatar color based on issue type"""
    colors = {
        'safety': 'rgba(59, 34, 138, 1)',  # Police Blue
        'fire': 'rgba(192, 108, 90, 1.0)',  # Fire Red
        'cleaning': 'rgba(93, 144, 73, 1.0)',  # Cleaning Green
    }
    return colors.get(issue_type, 'rgba(66, 133, 244, 1)')

@app.route('/api/data_police', methods=['GET'])
def get_items_pol():
    items = []
    
    if firebase_initialized:
        try:
            # Query Firestore for safety issues
            reports_ref = db.collection('citizenReports')
            query = reports_ref.where('issueType', '==', 'safety').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(20)
            
            docs = query.stream()
            
            for idx, doc in enumerate(docs):
                data = doc.to_dict()
                item = {
                    'key': idx,
                    'id': doc.id,
                    'title': data.get('description', 'Safety Issue Reported'),
                    'subTitle': format_location(data.get('location')),
                    'avatarText': calculate_avatar_text(data.get('priorityScore', 5)),
                    'avatarColor': get_avatar_color('safety'),
                    'description': data.get('description', 'No description available'),
                    'severity': data.get('severity', 'Medium'),
                    'status': data.get('status', 'pending'),
                    'timestamp': format_timestamp(data.get('timestamp')),
                    'address': data.get('address', 'Bengaluru, Karnataka'),
                    'responseTime': data.get('responseTime', 'Within 1 hour'),
                    'hasPhoto': data.get('hasPhoto', False),
                    'hasVideo': data.get('hasVideo', False),
                    'hasAudio': data.get('hasAudio', False),
                }
                items.append(item)
                
        except Exception as e:
            print(f"Error fetching police data: {e}")
            # Return mock data on error
            items = get_mock_police_data()
    else:
        items = get_mock_police_data()
    
    return jsonify(items)

@app.route('/api/data_fire', methods=['GET'])
def get_items_fire():
    items = []
    
    if firebase_initialized:
        try:
            # Query Firestore for fire issues
            reports_ref = db.collection('citizenReports')
            query = reports_ref.where('issueType', '==', 'fire').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(20)
            
            docs = query.stream()
            
            for idx, doc in enumerate(docs):
                data = doc.to_dict()
                item = {
                    'key': idx,
                    'id': doc.id,
                    'title': data.get('description', 'Fire Hazard Reported'),
                    'subTitle': format_location(data.get('location')),
                    'avatarText': calculate_avatar_text(data.get('priorityScore', 5)),
                    'avatarColor': get_avatar_color('fire'),
                    'description': data.get('description', 'No description available'),
                    'severity': data.get('severity', 'Medium'),
                    'status': data.get('status', 'pending'),
                    'timestamp': format_timestamp(data.get('timestamp')),
                    'address': data.get('address', 'Bengaluru, Karnataka'),
                    'responseTime': data.get('responseTime', 'Immediate'),
                    'hasPhoto': data.get('hasPhoto', False),
                    'hasVideo': data.get('hasVideo', False),
                    'hasAudio': data.get('hasAudio', False),
                }
                items.append(item)
                
        except Exception as e:
            print(f"Error fetching fire data: {e}")
            items = get_mock_fire_data()
    else:
        items = get_mock_fire_data()
    
    return jsonify(items)

@app.route('/api/data_cleaner', methods=['GET'])
def get_items_clean():
    items = []
    
    if firebase_initialized:
        try:
            # Query Firestore for cleaning issues
            reports_ref = db.collection('citizenReports')
            query = reports_ref.where('issueType', '==', 'cleaning').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(20)
            
            docs = query.stream()
            
            for idx, doc in enumerate(docs):
                data = doc.to_dict()
                item = {
                    'key': idx,
                    'id': doc.id,
                    'title': data.get('description', 'Cleaning Required'),
                    'subTitle': format_location(data.get('location')),
                    'avatarText': calculate_avatar_text(data.get('priorityScore', 5)),
                    'avatarColor': get_avatar_color('cleaning'),
                    'description': data.get('description', 'No description available'),
                    'severity': data.get('severity', 'Medium'),
                    'status': data.get('status', 'pending'),
                    'timestamp': format_timestamp(data.get('timestamp')),
                    'address': data.get('address', 'Bengaluru, Karnataka'),
                    'responseTime': data.get('responseTime', 'Within 24 hours'),
                    'hasPhoto': data.get('hasPhoto', False),
                    'hasVideo': data.get('hasVideo', False),
                    'hasAudio': data.get('hasAudio', False),
                }
                items.append(item)
                
        except Exception as e:
            print(f"Error fetching cleaner data: {e}")
            items = get_mock_cleaner_data()
    else:
        items = get_mock_cleaner_data()
    
    return jsonify(items)

@app.route('/api/all_reports', methods=['GET'])
def get_all_reports():
    """Get all reports with optional filtering"""
    items = []
    
    if firebase_initialized:
        try:
            # Query all reports
            reports_ref = db.collection('citizenReports')
            query = reports_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(50)
            
            docs = query.stream()
            
            for idx, doc in enumerate(docs):
                data = doc.to_dict()
                issue_type = data.get('issueType', 'safety')
                
                item = {
                    'key': idx,
                    'id': doc.id,
                    'title': data.get('description', 'Issue Reported'),
                    'subTitle': format_location(data.get('location')),
                    'avatarText': calculate_avatar_text(data.get('priorityScore', 5)),
                    'avatarColor': get_avatar_color(issue_type),
                    'description': data.get('description', 'No description available'),
                    'issueType': issue_type,
                    'severity': data.get('severity', 'Medium'),
                    'status': data.get('status', 'pending'),
                    'timestamp': format_timestamp(data.get('timestamp')),
                    'address': data.get('address', 'Bengaluru, Karnataka'),
                    'responseTime': data.get('responseTime', 'Within 24 hours'),
                    'priorityScore': data.get('priorityScore', 5),
                    'hasPhoto': data.get('hasPhoto', False),
                    'hasVideo': data.get('hasVideo', False),
                    'hasAudio': data.get('hasAudio', False),
                    'assignedTo': data.get('assignedTo'),
                    'resolvedBy': data.get('resolvedBy'),
                }
                items.append(item)
                
        except Exception as e:
            print(f"Error fetching all reports: {e}")
            items = []
    
    return jsonify(items)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics for dashboard"""
    stats = {
        'total_reports': 0,
        'pending_reports': 0,
        'resolved_reports': 0,
        'by_type': {
            'safety': 0,
            'fire': 0,
            'cleaning': 0
        },
        'by_severity': {
            'Critical': 0,
            'High': 0,
            'Medium': 0,
            'Low': 0
        }
    }
    
    if firebase_initialized:
        try:
            reports_ref = db.collection('citizenReports')
            
            # Get all reports for stats
            all_reports = reports_ref.stream()
            
            for doc in all_reports:
                data = doc.to_dict()
                stats['total_reports'] += 1
                
                # Count by status
                status = data.get('status', 'pending')
                if status == 'pending':
                    stats['pending_reports'] += 1
                elif status == 'resolved':
                    stats['resolved_reports'] += 1
                
                # Count by type
                issue_type = data.get('issueType', 'safety')
                if issue_type in stats['by_type']:
                    stats['by_type'][issue_type] += 1
                
                # Count by severity
                severity = data.get('severity', 'Medium')
                if severity in stats['by_severity']:
                    stats['by_severity'][severity] += 1
                    
        except Exception as e:
            print(f"Error fetching stats: {e}")
    
    return jsonify(stats)

# Mock data functions for fallback
def get_mock_police_data():
    return [
        {
            'key': 0,
            'title': 'Riot Near Cubbon Park',
            'subTitle': '12.973826, 77.590591',
            'avatarText': '50',
            'avatarColor': 'rgba(66, 133, 244, 1)',
            'description': 'A Peaceful Protest By Road Union Workers Turned Into A Frenzy When A Policeman Turned Violent',
            'severity': 'High',
            'status': 'pending',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'key': 1,
            'title': 'Another incident of car vandalism by auto rickshaw drivers in Bangalore',
            'subTitle': '12.973826, 77.590591',
            'avatarText': '5',
            'avatarColor': 'rgba(66, 133, 244, 1)',
            'description': 'They hit our vehicle from the right side and also threw a beer bottle at us. Two incidents have happened in one month!',
            'severity': 'Medium',
            'status': 'pending',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    ]

def get_mock_fire_data():
    return [
        {
            'key': 0,
            'title': 'Shopping Mall Caught Fire',
            'subTitle': '12.973826, 77.590591',
            'avatarText': '40',
            'avatarColor': 'rgba(192, 108, 90, 1.0)',
            'description': 'Shopping Mall In Koramangla Has Caught Fire And People Are Stuck Inside. We Need Immediate Support',
            'severity': 'Critical',
            'status': 'pending',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'key': 1,
            'title': 'Fire Breaks Out At Healthcare Facility In Bengaluru Rajanukunte',
            'subTitle': '12.973826, 77.590591',
            'avatarText': '45',
            'avatarColor': 'rgba(192, 108, 90, 1.0)',
            'description': 'Six fire tenders from multiple stations rushed to Raksha Health Care where the fire broke out.',
            'severity': 'High',
            'status': 'pending',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    ]

def get_mock_cleaner_data():
    return [
        {
            'key': 0,
            'title': 'Garbage getting collected near Tech Park',
            'subTitle': '12.973826, 77.590591',
            'avatarText': '100',
            'avatarColor': 'rgba(93, 144, 73, 1.0)',
            'description': 'Garbage is getting deposited near the back gate of cessna business park.',
            'severity': 'Medium',
            'status': 'pending',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'key': 1,
            'title': 'Cholera alert: PGs take preventive measures',
            'subTitle': '12.973826, 77.590591',
            'avatarText': '45',
            'avatarColor': 'rgba(93, 144, 73, 1.0)',
            'description': 'PGs are prioritising clean food and water along with maintaining hygienic surroundings.',
            'severity': 'High',
            'status': 'pending',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    ]

if __name__ == '__main__':
    # Use environment variable for host or default to localhost
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 3000))
    app.run(host=host, port=port, debug=True)