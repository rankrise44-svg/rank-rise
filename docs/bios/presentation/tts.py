import sys, certifi; certifi.where=lambda:'/root/.ccr/ca-bundle.crt'
import asyncio, edge_tts
async def main(voice,text,out,rate='+0%',pitch='+0Hz'):
    await edge_tts.Communicate(text,voice,rate=rate,pitch=pitch).save(out)
asyncio.run(main(*sys.argv[1:]))
