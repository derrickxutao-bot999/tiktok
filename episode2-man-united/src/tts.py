"""Generate narration clips with edge-tts; writes build/vo/<id>.wav and durations.json."""
import asyncio, json, os, ssl, subprocess, sys
import edge_tts, edge_tts.communicate as comm
from script import LINES

comm._SSL_CTX = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE", "/root/.ccr/ca-bundle.crt"))
OUT = os.path.join(os.path.dirname(__file__), "..", "build", "vo")
os.makedirs(OUT, exist_ok=True)

async def one(k, spk, text):
    mp3 = f"{OUT}/{k}.mp3"; wav = f"{OUT}/{k}.wav"
    if not os.path.exists(wav):
        await edge_tts.Communicate(text, spk["voice"], rate=spk["rate"], pitch=spk["pitch"]).save(mp3)
        # trim edge silence, 48k mono
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", mp3, "-af",
                        "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
                        "-ar", "48000", "-ac", "1", wav], check=True)
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]))
    return k, d

async def main():
    res = await asyncio.gather(*[one(k, s, t) for k, (s, t) in LINES.items()])
    json.dump(dict(res), open(f"{OUT}/durations.json", "w"), indent=1)
    tot = sum(d for _, d in res); print(dict(res)); print("total", tot)

asyncio.run(main())
