import json
# v8: aggressive hook, pause-rich markup (AK's example pattern), open loop,
# CTA + loop. Ellipses = micro pauses, CAPS = emphasis (IndexTTS2 markup).
B = [
    (1,  "STOP… doing this… every single day.", "❌ STOP DOING THIS", "zoom_in", "bass_hit", "night_scroll"),
    (2,  "It's quietly… KILLING your eyes.", "KILLING YOUR EYES", "zoom_in", "glitch", "red_eye"),
    (3,  "You blink… fifteen times a minute.", "15 BLINKS/MIN", "normal", "pop", "stat"),
    (4,  "On a screen?… Just FIVE.", "NOW: 5", "zoom_in", "glitch", "stat"),
    (5,  "That burning feeling?… That's DAMAGE.", "DAMAGE", "zoom_in", "heartbeat", "red_eye"),
    (6,  "And the BIGGEST mistake… is at the end.", "BIGGEST MISTAKE → END", "normal", "whoosh", "night_scroll"),
    (7,  "Every second you scroll… your eyes dry out.", "EYES DRYING OUT", "normal", "tick", "red_eye"),
    (8,  "Headaches… blurry nights… tired eyes.", "HEADACHES. BLURRY NIGHTS.", "normal", "tick", "night_scroll"),
    (9,  "Here's what doctors actually recommend…", "THE FIX", "normal", "pop", "fix"),
    (10, "Every twenty minutes… look twenty feet away.", "20 MIN = 20 FEET", "zoom_in", "pop", "fix"),
    (11, "For twenty seconds. That's it.", "20 SEC. DONE.", "normal", "pop", "fix"),
    (12, "The mistake most people make?… They never do it.", "⚠️ BIGGEST MISTAKE", "zoom_in", "heartbeat", "red_eye"),
    (13, "Save this… you'll need it later. Follow for more.", "SAVE THIS + FOLLOW", "normal", "whoosh", "fix"),
    (14, "And you're… still scrolling.", "STILL SCROLLING?", "normal", "bass_hit", "night_scroll"),
]
json.dump({'topicId': 'eye_health_viral_v4', 'disclaimer': 'Education only, not medical advice',
           'beats': [dict(id=i, vo=v, caption=c, zoom=z, sfx=s, scene=sc, speaker='narrator')
                     for i, v, c, z, s, sc in B]},
          open('/tmp/convo3/script.json', 'w'), indent=1)
print('script v4: 14 beats, payoff twist b12, open loop b6')
