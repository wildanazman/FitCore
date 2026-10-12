"""Import explicitly matched, licensed wger clips. Never infer matches from names."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
MATCHES={
    'gym_leg_press':371, 'gym_leg_curl':366, 'home_db_rdl':507,
    'gym_seated_row':512, 'gym_incline_press':537, 'gym_face_pull':222,
    'gym_shoulder_press':567, 'gym_pullup':475, 'gym_hip_thrust':294,
    'home_db_triceps':211,
}
def get(url):
    if not url.startswith('https://wger.de/'):
        raise ValueError('Unexpected provider')
    request=urllib.request.Request(url,headers={'User-Agent':'FitCore/1.0 licensed-media-import'})
    with urllib.request.urlopen(request,timeout=45) as response:
        data=response.read(100_000_001)
        if len(data)>100_000_000: raise ValueError('Source exceeds import limit')
        return data

def main():
    converter=os.environ['FITCORE_FFMPEG']
    records=json.loads(Path('/private/tmp/fitcore-wger-exercises.json').read_text())['results']
    licenses=json.loads(get('https://wger.de/api/v2/license/?limit=100'))['results']
    license_by_id={item['id']:item for item in licenses}
    assets=ROOT/'public/exercise-demos'
    imported={}; attribution=[]
    with tempfile.TemporaryDirectory(prefix='fitcore-video-import-') as temp:
        for exercise_id,source_id in MATCHES.items():
            record=next(item for item in records if item['id']==source_id)
            videos=[v for v in record['videos'] if v['license'] in license_by_id
                    and '/by-sa/4.0/' in license_by_id[v['license']]['url']
                    and v['license_author'] and v['size']<=100_000_000]
            if not videos: raise ValueError(f'No reviewed license for {exercise_id}')
            source=min(videos,key=lambda item:item['size'])
            original=get(source['video'])
            source_path=Path(temp)/f'{exercise_id}.mov';source_path.write_bytes(original)
            mp4=assets/f'{exercise_id}.mp4';poster=assets/f'{exercise_id}.jpg'
            # Preserve full frame and full movement. No auto-crop or animated still photos.
            subprocess.run([converter,'-hide_banner','-loglevel','error','-y','-i',str(source_path),
                '-an','-vf','scale=640:-2','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p',
                '-movflags','+faststart',str(mp4)],check=True)
            subprocess.run([converter,'-hide_banner','-loglevel','error','-y','-ss','2','-i',str(mp4),
                '-frames:v','1',str(poster)],check=True)
            subprocess.run([converter,'-hide_banner','-loglevel','error','-y','-i',str(mp4),
                '-vf','fps=1/5,scale=240:-2,tile=3x1','-frames:v','1',str(Path(temp)/f'{exercise_id}-review.jpg')],check=True)
            # Review sheets kept outside shipping assets.
            review=ROOT/'.impeccable/review/exercise-videos';review.mkdir(parents=True,exist_ok=True)
            (review/f'{exercise_id}.jpg').write_bytes((Path(temp)/f'{exercise_id}-review.jpg').read_bytes())
            name='Dumbbell Romanian deadlift' if exercise_id=='home_db_rdl' else next(t['name'] for t in record['translations'] if t['language']==2)
            imported[exercise_id]={'name':name,'video':f'/exercise-demos/{exercise_id}.mp4',
                'poster':f'/exercise-demos/{exercise_id}.jpg','sourceUrl':f'https://wger.de/api/v2/exerciseinfo/{source_id}/',
                'author':source['license_author'],'licenseUrl':license_by_id[source['license']]['url']}
            attribution.append({'exerciseId':exercise_id,'sourceId':source_id,'source':source['video'],
                'author':source['license_author'],'license':license_by_id[source['license']]['url'],
                'sourceSha256':hashlib.sha256(original).hexdigest(),
                'mp4Sha256':hashlib.sha256(mp4.read_bytes()).hexdigest(),
                'changes':'Audio removed; full frame and duration retained; resized to 640px wide; H.264 MP4, JPEG poster'})
            print(f'{exercise_id}: imported licensed MP4',flush=True)
    output=ROOT/'src/data/exercise-videos-imported.json';output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(imported,indent=2)+'\n')
    (assets/'imported-attribution.json').write_text(json.dumps(attribution,indent=2)+'\n')

if __name__=='__main__':main()
