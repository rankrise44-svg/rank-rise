import os,json,subprocess,imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe(); D=114
L=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'narration.json')))['lines']
# ambient pad: slow chord changes (Am - F - C - G), soft sines + octave, lowpassed, gentle swell
ch=[(220,261.63,329.63),(174.61,220,261.63),(130.81,196,261.63),(196,246.94,293.66)]
seg=8.0
def chord_expr():
    parts=[]
    for k,c in enumerate(ch):
        tone='+'.join(f'sin(2*PI*{f}*t)+0.35*sin(2*PI*{f*2}*t)' for f in c)
        parts.append(f'between(mod(t,{seg*4}),{k*seg},{(k+1)*seg})*({tone})')
    return '+'.join(parts)
pad=f"aevalsrc='0.05*({chord_expr()})*(0.75+0.25*sin(2*PI*0.11*t))':s=44100:d={D}"
subprocess.run([FF,'-y','-loglevel','error','-f','lavfi','-i',pad,'-af',
  f'lowpass=f=900,aecho=0.8:0.7:120|260:0.35|0.25,afade=t=in:d=3,afade=t=out:st={D-4}:d=4,volume=0.95','-ac','2','vo/pad.wav'],check=True)
ins=[]; fl=[]
for i,l in enumerate(L):
    ins+=['-i',f'vo/l{i:02d}.mp3']; ms=int(l['at']*1000)
    fl.append(f'[{i}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={ms}|{ms}[v{i}]')
n=len(L)
fl.append(''.join(f'[v{i}]' for i in range(n))+f'amix=inputs={n}:normalize=0,apad=whole_dur={D},atrim=0:{D}[voice]')
fl.append('[voice]asplit[vo1][vo2]')
fl.append(f'[{n}:a][vo1]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=600[duck]')
fl.append('[duck][vo2]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[out]')
subprocess.run([FF,'-y','-loglevel','error',*ins,'-i','vo/pad.wav','-filter_complex',';'.join(fl),'-map','[out]','-ar','48000','-c:a','aac','-b:a','192k','vo/soundtrack.m4a'],check=True)
print('ok')
