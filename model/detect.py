from ultralytics import YOLO
import cv2
import pygame
import os
import socket
import requests
from web3 import Web3
from dotenv import load_dotenv
from eth_account import Account
from datetime import datetime
import math
import json
import subprocess
from twilio.rest import Client
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from collections import deque

# Initialize pygame mixer
pygame.mixer.init()

load_dotenv()

# Pinata API credentials
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

# Blockchain configuration
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
INFURA_URL = os.getenv("INFURA_URL")

# Connect to Ethereum node (e.g., Infura)
web3 = Web3(Web3.HTTPProvider(INFURA_URL))

# Create an account from the private key
account = Account.from_key(PRIVATE_KEY)

# Set default account (sender address)
web3.eth.default_account = account.address

# Load contract ABI
with open("EvidenceStorage.json", "r") as f:
    contract_artifact = json.load(f)
    contract_abi = contract_artifact["abi"]

# Initialize contract
contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)

# Function to validate IPFS hash
def is_valid_ipfs_hash(ipfs_hash):
    return len(ipfs_hash) >= 5

# Function to upload video to IPFS using Pinata
def upload_to_ipfs(video_path):
    print(f"Uploading file: {video_path}")

    if not os.path.exists(video_path):
        print("❌ File does not exist!")
        return None

    # Prepare the file for upload
    with open(video_path, "rb") as file:
        files = {"file": (os.path.basename(video_path), file)}
        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_API_KEY,
        }

        try:
            response = requests.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                files=files,
                headers=headers,
            )
            response.raise_for_status()
            ipfs_hash = response.json()["IpfsHash"]
            print("✅ Uploaded successfully!")
            print(f"IPFS Hash: {ipfs_hash}")
            return ipfs_hash
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return None

# Function to store IPFS hash in the blockchain
def store_in_blockchain(ipfs_hash, file_name):
    if not is_valid_ipfs_hash(ipfs_hash):
        print("⚠️ Invalid IPFS hash, skipping blockchain storage.")
        return

    try:
        # Get correct chain ID from the local node
        chain_id = web3.eth.chain_id  
        print(f"🔗 Connected to blockchain with Chain ID: {chain_id}")

        # Prepare transaction
        nonce = web3.eth.get_transaction_count(web3.eth.default_account)
        tx = contract.functions.storeEvidence(ipfs_hash, file_name).build_transaction({
            "chainId": chain_id,  # Dynamically fetch chain ID
            "gas": 2000000,
            "gasPrice": web3.to_wei("50", "gwei"),
            "nonce": nonce,
            "from": web3.eth.default_account,
        })

        # Sign transaction
        signed_tx = account.sign_transaction(tx)

        # Send transaction (Fixed for Web3.py 6.x+)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        print(f"⏳ Transaction sent. Hash: {web3.to_hex(tx_hash)}")

        # Wait for transaction receipt
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"✅ Transaction mined in block: {tx_receipt.blockNumber}")
        print("✅ Evidence stored successfully in smart contract!")

    except Exception as e:
        print(f"❌ Blockchain storage error: {e}")

# Main function to upload and store video
def upload_and_store_video(video_path):
    ipfs_hash = upload_to_ipfs(video_path)
    if ipfs_hash:
        store_in_blockchain(ipfs_hash, os.path.basename(video_path))
        return ipfs_hash

# Ensure the Detections directory exists
os.makedirs("Detections", exist_ok=True)

# Twilio API credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
ALERT_RECIPIENT = os.getenv("ALERT_RECIPIENT")  # The recipient's phone number

# Initialize Twilio client
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def shorten_url(long_url):
    """Shortens a URL using TinyURL API."""
    try:
        response = requests.get(f"https://tinyurl.com/api-create.php?url={long_url}")
        return response.text if response.status_code == 200 else long_url
    except Exception as e:
        print(f"URL shortening failed: {e}")
        return long_url

def send_sms_alert(incident_type, latitude, longitude, ipfs_hash):
    """
    Sends an SMS alert via Twilio when an incident is detected.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    map_url = f"https://www.google.com/maps?q={latitude},{longitude}" if latitude and longitude else None
    short_map_url = shorten_url(map_url) if map_url else "Location unknown"

    message_body = (
        f"🚨 {incident_type} detected!\n"
        f"Time: {timestamp}\n"
        f"📍 View on Map: {short_map_url}\n"
        f"🔗 Hash: {ipfs_hash}"
    )
    
    # Debugging: Print message length
    print(f"📏 SMS Length: {len(message_body)} characters")
    print(message_body)
    try:
        message = twilio_client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=ALERT_RECIPIENT
        )
        print(f"📩 SMS alert sent successfully! SID: {message.sid}")
    except Exception as e:
        print(f"❌ Failed to send SMS alert: {e}")

def get_gps_location():
    try:
        result = subprocess.run(["powershell", "-File", "get_loc.ps1"], capture_output=True, text=True)
        location = result.stdout.strip()
        
        if "Error" in location:
            print(location)  # Print error message
            return None, None
        
        lat, lon = map(float, location.split(", "))
        return lat, lon
    except Exception as e:
        print("Error fetching GPS location:", e)
        return None, None

def get_device_info():
    """
    Returns the device name.
    """
    try:
        return socket.gethostname()
    except Exception as e:
        print("Error fetching device info:", e)
        return "Unknown Device"

def generate_metadata(incident_type):
    """
    Generates metadata including date, location, and device info.
    """
    latitude, longitude = get_gps_location()
    metadata = {
        "Incident": incident_type,
        "Location": f"{latitude}, {longitude}" if latitude and longitude else "Unknown",
        "Date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "Device": get_device_info()
    }
    return metadata, latitude, longitude

def put_text_rect(img, text, pos, font=cv2.FONT_HERSHEY_SIMPLEX, scale=1, thickness=2, color=(255, 255, 255), bg_color=(0, 0, 255), padding=5):
    """
    Draw text with a rectangular background in OpenCV (cvzone alternative).
    """
    text_size, _ = cv2.getTextSize(text, font, scale, thickness)
    x, y = pos
    rect_x1, rect_y1 = x - padding, y - text_size[1] - padding
    rect_x2, rect_y2 = x + text_size[0] + padding, y + padding

    # Draw filled rectangle for text background
    cv2.rectangle(img, (rect_x1, rect_y1), (rect_x2, rect_y2), bg_color, cv2.FILLED)
    
    # Put text on top
    cv2.putText(img, text, (x, y), font, scale, color, thickness)

    return img

# Initialize YOLO models
accident_model = YOLO('accident.pt')  # Accident detection model
fire_model = YOLO('fire.pt')  # Fire detection model

# Load the violence detection model
violence_model = load_model("violence.h5")
IMG_SIZE = 128  # Image size expected by the violence model
QUEUE_SIZE = 128  # Number of frames to average predictions for violence detection

# Load the alarm sound
alarm_sound = pygame.mixer.Sound("alarm.wav")

# Function to preprocess frames for violence detection
def preprocess_frame(frame):
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)  # Convert to RGB
    frame = cv2.resize(frame, (IMG_SIZE, IMG_SIZE)).astype("float32")  # Resize
    frame /= 255.0  # Normalize pixel values (0-1)
    return np.expand_dims(frame, axis=0)  # Add batch dimension

while True:
    # Ask the user to enter the video file name
    video_path = input("Enter the video file name (or 'quit' to exit): ")
    if video_path.lower() == 'quit':
        break

    if not os.path.exists(video_path):
        print(f"❌ File '{video_path}' does not exist!")
        continue

    cap = cv2.VideoCapture(video_path)

    # Get input video properties
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))

    # Initialize variables
    accident_detected = False
    fire_detected = False
    violence_detected = False
    accident_video_writer = None
    fire_video_writer = None
    violence_video_writer = None
    Q = deque(maxlen=QUEUE_SIZE)  # Queue for violence detection predictions

    while cap.isOpened():
    # Read a frame from the video
        success, frame = cap.read()

        if success:
            # Run YOLOv8 inference on the frame for accident and fire detection
            accident_results = accident_model(frame)
            fire_results = fire_model(frame)

            # Check for accident detection
            for result in accident_results:
                boxes = result.boxes.cpu().numpy()
                for box in boxes:
                    if box.conf[0] > 0.65:
                        if not accident_detected:
                            accident_detected = True
                            # Initialize video writer when accident is first detected
                            metadata, latitude, longitude = generate_metadata("Accident")
                            lat_str = f"{latitude:.6f}" if latitude else "Unknown"
                            lon_str = f"{longitude:.6f}" if longitude else "Unknown"
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                            filename = f"Detections/ACCIDENT_{lat_str}_{lon_str}_{timestamp}.mp4"
                            fourcc = cv2.VideoWriter_fourcc(*'avc1')  # H.264 codec
                            accident_video_writer = cv2.VideoWriter(filename, fourcc, fps, (frame_width, frame_height))
                            print("🚨 Accident detected! Starting video recording.")

                        # Draw bounding box on the frame
                        frame = accident_results[0].plot()

                        # Display "ACCIDENT DETECTED!" message at the top
                        frame = put_text_rect(frame, "ACCIDENT DETECTED!", (200, 50), scale=2, thickness=3, bg_color=(0, 0, 255))

                        # Play the alarm sound
                        
                        alarm_sound.play()

            # Check for fire detection
            for result in fire_results:
                boxes = result.boxes
                for box in boxes:
                    confidence = box.conf[0]
                    confidence = math.ceil(confidence * 100)
                    Class = int(box.cls[0])
                    
                    if confidence > 70:
                        if not fire_detected:
                            fire_detected = True
                            # Initialize video writer when fire is first detected
                            metadata, latitude, longitude = generate_metadata("Fire")
                            lat_str = f"{latitude:.6f}" if latitude else "Unknown"
                            lon_str = f"{longitude:.6f}" if longitude else "Unknown"
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                            filename = f"Detections/FIRE_{lat_str}_{lon_str}_{timestamp}.mp4"
                            fourcc = cv2.VideoWriter_fourcc(*'avc1')  # H.264 codec
                            fire_video_writer = cv2.VideoWriter(filename, fourcc, fps, (frame_width, frame_height))
                            print("🔥 Fire detected! Starting video recording.")
                        
                        # Draw bounding box on the frame
                        frame = fire_results[0].plot()

                        # Display "FIRE DETECTED!" message at the top
                        frame = put_text_rect(frame, "FIRE DETECTED!", (200, 50), scale=2, thickness=3, bg_color=(0, 0, 255))

                        # Play the alarm sound
                        
                        alarm_sound.play()

            # Check for violence detection
            if len(Q) % 5 == 0:  # Process every 5th frame for efficiency
                processed_frame = preprocess_frame(frame)
                preds = violence_model.predict(processed_frame)[0][0]  # Get probability
                Q.append(preds)

            # Compute average prediction for violence
            avg_prediction = np.mean(Q) if len(Q) > 0 else 0
            label = ""
            if avg_prediction >= 0.87:
                label = "Violence Detected"
                text_color = (0, 0, 255) if label == "Violence Detected" else (0, 255, 0)
                cv2.putText(frame, f"{label}: {avg_prediction:.2f}", (35, 100),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, text_color, 3)

                # Initialize video writer for violence detection
                if not violence_detected and not fire_detected and not accident_detected:
                    violence_detected = True
                    metadata, latitude, longitude = generate_metadata("Violence")
                    lat_str = f"{latitude:.6f}" if latitude else "Unknown"
                    lon_str = f"{longitude:.6f}" if longitude else "Unknown"
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"Detections/VIOLENCE_{lat_str}_{lon_str}_{timestamp}.mp4"
                    fourcc = cv2.VideoWriter_fourcc(*'avc1')  # H.264 codec
                    violence_video_writer = cv2.VideoWriter(filename, fourcc, fps, (frame_width, frame_height))
                    print("🔪 Violence detected! Starting video recording.")

            # Write the frame with bounding boxes to the output video if any incident is detected
            if accident_detected:
                accident_video_writer.write(frame)
            if fire_detected:
                fire_video_writer.write(frame)
            if violence_detected and not fire_detected and not accident_detected:
                violence_video_writer.write(frame)

            # Display the frame with bounding boxes
            cv2.imshow("Video", frame)

            # Break the loop if 'q' is pressed
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        else:
            # Break the loop if the end of the video is reached
            break

    # Release the video capture object, close the display window, and release the VideoWriter objects
    cap.release()
    if accident_video_writer is not None:
        accident_video_writer.release()
        print(f"🚨 Accident incident video saved.")
        ipfs_hash = upload_and_store_video(filename)
        send_sms_alert("Accident", latitude, longitude, ipfs_hash)

    if fire_video_writer is not None:
        fire_video_writer.release()
        print(f"🔥 Fire incident video saved.")
        pfs_hash = upload_and_store_video(filename)
        send_sms_alert("Fire", latitude, longitude, ipfs_hash)

    if violence_video_writer is not None:
        violence_video_writer.release()
        print(f"🔪 Violence incident video saved.")
        ipfs_hash = upload_and_store_video(filename)
        send_sms_alert("Violence", latitude, longitude, ipfs_hash)

    cv2.destroyAllWindows()

print("Exiting the program.")