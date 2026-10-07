import os,json,subprocess,imageio_ffmpeg,re
FF=imageio_ffmpeg.get_ffmpeg_exe()
V={'narrator':('en-US-AndrewNeural','+0%','+0Hz'),'hermus':('en-GB-RyanNeural','+0%','-6Hz'),'you':('en-US-BrianNeural','+0%','+0Hz')}
L=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'narration.json')))['lines']
for i,l in enumerate(L):
    v,r,p=V[l['voice']]; out=f'vo/l{i:02d}.mp3'
    subprocess.run(['python3',os.path.join(os.path.dirname(os.path.abspath(__file__)),'tts.py'),v,l['text'],out,r,p],check=True)
    d=subprocess.run([FF,'-i',out],capture_output=True,text=True).stderr
    m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',d); dur=int(m[2])*60+float(m[3])
    nxt=L[i+1]['at'] if i+1<len(L) else 114
    print(f"{i:2d} {l['voice']:8s} at {l['at']:6.1f} dur {dur:5.2f} ends {l['at']+dur:6.1f} next {nxt:6.1f} {'OVER' if l['at']+dur>nxt-0.2 else ''}")
