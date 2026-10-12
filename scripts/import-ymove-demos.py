"""Import the explicitly free YMove app-use clips, never the paid library.

Run after inspecting each generated contact sheet. Requires FITCORE_FFMPEG.
The free terms permit app use, not resale as a standalone media library.
"""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://ymove.app/free-exercise-videos'
MATCHES = {
    'gym_lat_pulldown': 'Lat Pulldown',
    'gym_chest_press': 'Seated Machine Chest Press',
    'gym_cable_fly': 'Cable Crossover (Mid)',
    'gym_triceps_pushdown': 'Cable Tricep Pushdown',
    'gym_leg_extension': 'Leg Extension',
    'home_kb_swing': 'Kettlebell swing',
    'home_kb_rdl': 'Kettlebell Romanian Deadlift',
    'home_kb_goblet': 'Goblet Squat with Kettlebell',
}

def download(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'FitCore/1.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read(50_000_001)
    if len(data) > 50_000_000:
        raise ValueError('Media exceeds limit')
    return data

def main():
    html = download(SOURCE).decode()
    objects = []
    for match in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html):
        record = json.loads(match[1])
        if not isinstance(record, dict):
            continue
        record = record.get('mainEntity', record)
        if isinstance(record, dict) and record.get('@type') == 'ItemList':
            objects.extend(row['item'] for row in record['itemListElement'])
    assets = ROOT / 'public/exercise-demos'
    reviews = ROOT / '.impeccable/review/exercise-videos'
    reviews.mkdir(parents=True, exist_ok=True)
    converter = os.environ['FITCORE_FFMPEG']
    def import_one(pair):
        exercise_id, name = pair
        record = next(row for row in objects if row['name'] == name)
        url = record['contentUrl']
        if not url.startswith('https://ymove.app/api/free/'):
            raise ValueError('Not an explicitly free source')
        original = download(url)
        temp = Path('/private/tmp') / f'fitcore-ymove-{exercise_id}.mp4'
        temp.write_bytes(original)
        target = assets / f'{exercise_id}.mp4'
        subprocess.run([converter,'-hide_banner','-loglevel','error','-y','-i',str(temp),'-an','-vf','scale=-2:640','-c:v','libx264','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],check=True)
        poster = assets / f'{exercise_id}.jpg'
        subprocess.run([converter,'-hide_banner','-loglevel','error','-y','-ss','1','-i',str(target),'-frames:v','1',str(poster)],check=True)
        subprocess.run([converter,'-hide_banner','-loglevel','error','-y','-i',str(target),'-vf','fps=1,scale=-2:240,tile=5x1','-frames:v','1',str(reviews/f'{exercise_id}-ymove.jpg')],check=True)
        print(f'{exercise_id}: downloaded for visual review',flush=True)
        return exercise_id, {'name':name,'video':f'/exercise-demos/{exercise_id}.mp4','poster':f'/exercise-demos/{exercise_id}.jpg','sourceUrl':SOURCE,'author':'Your Move','licenseUrl':SOURCE+'#licence'}, {'exerciseId':exercise_id,'source':url,'author':'Your Move','license':SOURCE+'#licence','sourceSha256':hashlib.sha256(original).hexdigest(),'mp4Sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'changes':'Full frame and duration retained; muted; resized to 640px high H.264 MP4; JPEG poster extracted'}
    results = list(concurrent.futures.ThreadPoolExecutor(max_workers=3).map(import_one,MATCHES.items()))
    (ROOT/'src/data/exercise-videos-ymove.json').write_text(json.dumps({key:demo for key,demo,_ in results},indent=2)+'\n')
    (assets/'ymove-attribution.json').write_text(json.dumps([credit for _,_,credit in results],indent=2)+'\n')

if __name__ == '__main__': main()
