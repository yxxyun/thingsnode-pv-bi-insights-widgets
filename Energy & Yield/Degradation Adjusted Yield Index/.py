import requests
import time
import math
import random

# CONFIGURATION
THINGSBOARD_HOST = 'https://windforce.thingsnode.cc' # Replace with your host
ACCESS_TOKEN = 'Fy4MIXDzRsnsMrzKLNlD' # Copy from Finance_Dummy device details
TELEMETRY_KEY = 'yield_index'

# SIMULATION PARAMETERS
start_year = 2022
degradation_rate = 0.5 # 0.5% per year
days_to_simulate = 1460 # 4 years

url = f'{THINGSBOARD_HOST}/api/v1/{ACCESS_TOKEN}/telemetry'

data_payload = []
current_time_ms = int(time.time() * 1000)
one_day_ms = 86400 * 1000

print("Generating data points...")

for day in range(days_to_simulate):
    # Calculate timestamp for 'day' days ago (going backwards or forwards)
    # Let's build it from Start Year forward to today
    
    # Actually, simpler: Let's backfill from Today backwards
    ts = current_time_ms - ((days_to_simulate - day) * one_day_ms)
    
    # Calculate "Age" relative to start_year
    # Convert ts to year
    # (Rough approx for simulation)
    years_passed = (day / 365.0)
    
    value = 100 - (years_passed * degradation_rate)
    
    # Add some noise to make it look "Real"
    value += (random.uniform(-0.08, 0.08)) 
    
    payload = {"ts": ts, "values": {TELEMETRY_KEY: round(value, 2)}}
    
    # Send in batches of 1 to avoid complexity, or bulk post
    # For a quick script, posting one by one or small batches is fine
    response = requests.post(url, json=payload)
    
    if day % 100 == 0:
        print(f"Uploaded day {day}/{days_to_simulate}: {response.status_code}")

print("Data backfill complete.")