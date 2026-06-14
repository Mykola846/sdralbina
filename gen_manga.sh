#!/usr/bin/env bash
# Генерация 13 манга-кадров истории (этаж 6) через Pollinations API (модель nanobanana).
# Кладёт результат в media/story1.jpg ... media/story13.jpg
#
# Запуск:
#   POLLINATIONS_KEY=sk_... ./gen_manga.sh            # все 13
#   POLLINATIONS_KEY=sk_... ./gen_manga.sh 1 3 5      # только указанные номера
#
# Нужны: bash, curl, python3.

set -uo pipefail

KEY="${POLLINATIONS_KEY:-}"
if [[ -z "$KEY" ]]; then echo "Задай POLLINATIONS_KEY=sk_..." >&2; exit 1; fi

MODEL="${MODEL:-nanobanana}"
BASE="https://gen.pollinations.ai/image"
OUT="media"
W=800; H=600   # 4:3 под .panel-photo
mkdir -p "$OUT"

STYLE="Black and white classic Japanese manga panel, clean ink linework, screentone shading, expressive wholesome romantic-comedy style, dynamic composition, no text, no speech bubbles, no watermark, no signature. A young man in his twenties (long dark hair past the shoulders, casual jacket) and a young woman in her twenties (long flowing hair, cute casual outfit). SCENE:"

PROMPTS=(
"their very first meeting, inside a subway / metro train car. The young man confidently holds out and offers a fistful of paper banknotes toward the young woman, as if asking whether she wants some money. She looks back at him shy and embarrassed, blushing, flustered by the strange bold gesture. Awkward, funny and charming first-meeting moment, comedic sweatdrop, metro interior with handrails and windows."
"riding a subway train together. The young man holds the woman's hand with one hand, and with his other hand gently cups and protects the back of her head so it doesn't bump against the metal handrail pole. Tender caring moment inside a moving metro car."
"a park picnic suddenly ruined by a heavy downpour. The couple sits on a picnic blanket, completely soaked through by rain, but laughing and smiling at each other, happy despite being drenched."
"the couple rushing and running down a city street carrying grocery bags and frying pans, hurrying to her apartment because the birthday apartment had no working stove. Energetic comedic dash, motion lines."
"a small birthday cake with candles sitting forgotten inside an open refrigerator, the couple already gone. Bittersweet funny still-life of the cake left behind, soft glow from the fridge light."
"the couple comically fleeing and swatting at a swarm of mosquitoes as if running for their lives, exaggerated panic, motion lines, tiny mosquitoes around them, funny faces."
"the couple dancing together on an empty subway station platform at night, no music, just the two of them holding each other and spinning, romantic and carefree."
"the couple singing loudly together, mouths wide open, carefree and not caring they sing off-key, music notes floating around them, joyful expressions."
"the nervous young man meeting the woman's parents for the first time at a family dinner table, bowing politely, anxious but sincere. Warm family home setting."
"the young man holding a camera up to his eye taking photos of the smiling young woman who poses for him. A photoshoot moment, the camera was a gift from her. Happy creative mood."
"the couple cooking together in a small kitchen, both wearing aprons, chopping and stirring, laughing, ingredients and pots around them. Cozy home-cooking scene."
"the young man introducing the young woman to his group of friends at a lively bar, everyone holding drinks, friendly toasts and smiles, warm social atmosphere."
"the couple walking home at night after the bar, slightly tipsy, leaning on each other and chatting nonstop with animated happy expressions, streetlights and stars above."
)

want=("$@")
[[ ${#want[@]} -eq 0 ]] && want=($(seq 1 13))

ok=0; fail=0
for idx in "${want[@]}"; do
  scene="${PROMPTS[$((idx-1))]}"
  prompt="${STYLE} ${scene}"
  enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$prompt")
  url="${BASE}/${enc}?model=${MODEL}&width=${W}&height=${H}&seed=$((100+idx))&nologo=true"
  echo "[$idx/13] $MODEL -> story${idx}.jpg ..."
  code=$(curl -sS -L --max-time 180 "$url" -H "Authorization: Bearer ${KEY}" \
         -o "/tmp/story${idx}.bin" -w "%{http_code}")
  if [[ "$code" == "200" ]] && file "/tmp/story${idx}.bin" | grep -qiE "image|jpeg|png|webp"; then
    mv "/tmp/story${idx}.bin" "${OUT}/story${idx}.jpg"
    echo "   OK -> ${OUT}/story${idx}.jpg ($(wc -c < ${OUT}/story${idx}.jpg) bytes)"
    ok=$((ok+1))
  else
    echo "   FAIL (HTTP $code): $(head -c 200 /tmp/story${idx}.bin 2>/dev/null)"
    fail=$((fail+1))
  fi
  sleep 3
done
echo "Готово: ok=$ok fail=$fail"
