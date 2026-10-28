# «Чекпоинт за чекпоинтом» — сцены для Dreamina (Seedance 2.5)

10 цельных сцен по 10–15 секунд. Каждая снимается целиком, с запасом действия, и режется под песню на монтаже.
Режим **Omni reference**, если не сказано другое. Формат 16:9. Звук генерации глушим, кладём исходный трек `checkpoint-song-ru.wav` одной дорожкой.
Аудио прикрепляем в каждую сцену: по нему видно, где что происходит, а в сценах с пением по нему двигаются губы. В имени файла — какой кусок песни (например `0-08_0-23`); на монтаже ставьте сцену на это место. Начало вступления 0:00–0:08 закрывается медленным наездом на R1 в CapCut или растянутым началом сцены 1. Файлы: `keyframes/`, `audio/`, `../characters/`.
Порядок прикрепления = номер: первый файл — `@Image1`, второй — `@Image2` и т. д.

**4 листа персонажей** (в сценах с командой прикреплять в этом порядке после кадра):
1. `keyframes/C1-developer-sheet.png` — разработчик
2. `characters/Chibi Artist Turnaround Sheet-2.png` — художница
3. `characters/Chibi Programmer Turnaround Sheet with Props-3.png` — программист
4. `characters/Friendly White Robot Turnaround Sheet-5.png` — робот

| # | Сцена | Где в песне | Длит. | Аудио |
|---|---|---|---|---|
| 1 | Ночь: работа, ошибки, удар кулаком | вступление + куплет 1 (0:08–0:23) | 15 с | S01 |
| 2 | Мечта и сон | пре-припев 1 (0:23–0:33) | 12 с | S02 |
| 3 | Переход: свет → костёр | пауза (0:32–0:35) | 8 с | S03 |
| 4 | Костёр: поют, загорается первый фонарь | припев 1 (0:35–0:53) | 15 с | S04 |
| 5 | Ближний огонёк, путь по фонарям | куплет 2 + пре-припев 2 (0:53–1:10) | 15 с | S05 |
| 6 | Подъём, гора целиком | припев 2 (1:10–1:28) | 15 с | S06 |
| 7 | Свет в двух шагах | бридж (1:28–1:37) | 10 с | S07 |
| 8 | Вершина: кнопка, «Это релиз!» | финальный припев (1:37–1:54) | 15 с | S08 |
| 9 | Рассвет: Enter, откидывается | аутро (1:54–2:12) | 15 с | S09 |
| 10 | Видеозвонок и «Мы дошли» | аутро (2:12–2:29) | 15 с | S10 |

---

## 0 · Одно окно в ночи · 9 с
Прикрепить: `keyframes/R1-room-night.png`, `audio/S00-window-night_0-00_0-09.wav`
```
Opening shot at night, exterior. A quiet sleeping street of small houses in deep blue darkness, all windows dark except one: a single window glowing with cold blue monitor light. Slow, steady camera push-in toward that window; through the glass we start to see the dark room from @Image1 with the man at his desk lit by the monitor. A light drizzle, a lonely streetlamp. Use @Audio1 as the soundtrack and time the movement to it. Soft 3D clay chibi style matching @Image1, same palette. No text, no people on the street.
```
На монтаже: 0:00–0:08, наезд к окну, склейка внутрь — на сцену 1.

## 1 · Ночь: работа, ошибки, удар кулаком · 15 с
Прикрепить: `keyframes/R1-room-night.png`, `keyframes/C1-developer-sheet.png`, `audio/S01-night-slam_0-08_0-23.wav`
```
Use @Image1 as the first frame and keep the exact set: same room, every object in the same place. The man is the developer from @Image2, wearing the dark grey t-shirt from @Image1. Late night, the only light is the cold blue glow of the monitor. One continuous scene with a slow camera push-in from the wide shot to a medium shot of the man. He types with focus; on the monitor a game engine editor shows a small platformer character falling through the floor and red error popups appear inside the screen. He fixes it and types fast and hard, tense; more red errors pop up. He suddenly stops, hands frozen above the keys, stares at the screen for about two seconds, closes his eyes, lets out a heavy breath: he is fed up. Then he slams his fist on the desk: the three coffee mugs jump in place, the sticky notes on the wall flutter, the camera shakes slightly on impact. Use @Audio1 as the soundtrack and time the action to it: the typing during the music, the fist slam at about 14 seconds, on the last sung word. Soft 3D clay chibi style matching @Image1. No readable text, no new objects.
```

## 2 · Мечта и сон · 12 с
Прикрепить: `keyframes/R1-room-night.png`, `keyframes/C1-developer-sheet.png`, `audio/S02-dream-asleep_0-22_0-34.wav`
```
Same room as @Image1, every object in the same place, late night, monitor glow. One continuous scene. The developer from @Image2, dark grey t-shirt, sits after the outburst, exhausted, leans back and slowly lifts his eyes to the monitor. On the monitor screen, inside its edges, a dark game store page appears with a heart counter climbing fast. Then in the centre of the screen one round warm golden button glows like a distant light. The camera slowly moves to an over-the-shoulder view. He rests his head on his hand, his eyes slowly close, he falls asleep. The golden glow of the screen grows and spreads until it fills the whole dark room with warm golden light. Use @Audio1 as the soundtrack and time the action to it: he falls asleep near the end. Soft 3D clay chibi style matching @Image1. No readable text, no new objects.
```
Сохраните последний кадр — он первый кадр сцены 3.

## 3 · Переход: свет → костёр · 8 с
**Режим: First and last frame.** First = последний кадр сцены 2. Last = `keyframes/K05-campfire-empty.png`. Аудио, если режим разрешает: `audio/S03-into-dream_0-31_0-37.wav`.
```
One continuous shot, no cut. Dreamlike transition: the warm golden glow that fills the room softly dissolves into darkness, and the golden light shrinks into a small campfire burning on a dark hillside at night. A big dark mountain rises behind, with one bright warm golden-white light at its very summit. Sparks rise from the fire. Smooth, magical, slow. Soft 3D clay chibi style. No text.
```

## 4 · Костёр: поют, загорается первый фонарь · 15 с
Прикрепить: `keyframes/K06-campfire-band.png` + 4 листа + `audio/S04-campfire_0-34_0-49.wav`
```
Use @Image1 as the first frame. Exactly four characters: the developer from @Image2, the artist from @Image3, the programmer from @Image4, the robot from @Image5; no one else. One continuous scene around the campfire at night. They sing the song in @Audio1 together, lips in sync: the developer plays the acoustic guitar and sings looking up toward the distant golden summit light, the artist sings beside him, the programmer plays the banjo, the robot sways holding a small brown wooden lantern. The camera slowly moves across their warm firelit faces, then pulls back to a wider view: on a strong beat one small lantern standing alone on the ground a few steps up the dark slope lights up with a soft warm burst. Beyond it the slope stays dark up to the summit light. Soft 3D clay chibi style matching @Image1. No text.
```

## 5 · Ближний огонёк, путь по фонарям · 15 с
Прикрепить: `keyframes/K07-nearest-light.png` + 4 листа + `audio/S05-nearest-light_0-52_1-07.wav`
```
Use @Image1 as the first frame. Exactly four characters: the developer from @Image2, the artist from @Image3, the programmer from @Image4, the robot from @Image5 (half the humans' height). One continuous scene on the dark mountain path, everyone walking toward the left, toward the light. The artist turns to the developer and sings the line in @Audio1, lips in sync, then points forward at the single small lantern glowing on the ground a few steps ahead. They walk to it together; as they pass it, the next small lantern further ahead lights up, then the next. The camera tracks alongside them. The sky at the horizon very slowly starts to lighten; they glance at each other and smile. Each lantern stands alone on the ground, no ropes. The golden summit light always shines on the upper left. Soft 3D clay chibi style. No text.
```

## 6 · Подъём, гора целиком · 15 с
Прикрепить: `keyframes/K09-climb.png` + 4 листа, `audio/S06-climb_1-09_1-24.wav`
```
Use @Image1 as the first frame. Camera behind the team: exactly four characters, the developer from @Image2, the artist from @Image3, the programmer from @Image4, the robot from @Image5, climb the path straight up toward the golden summit light. Rhythmically, one by one, the next small lantern ahead of them on the ground lights up, each standing alone, no ropes; beyond the newest lantern the path stays dark. Then the camera slowly cranes up and back, revealing the whole mountain: a winding chain of separate glowing lanterns from the far campfire at the bottom up to the team, well past the middle; above them only a short dark stretch remains before the bright summit light. Use @Audio1 as the soundtrack: each lantern lights up on a strong beat. Epic, slow. Soft 3D clay chibi style. No text.
```

## 7 · Свет в двух шагах · 10 с
Прикрепить: `keyframes/K10-two-steps.png`, `keyframes/C1-developer-sheet.png`, `audio/S07-two-steps_1-27_1-37.wav`
```
Use @Image1 as the first frame: low-angle close-up of the developer from @Image2 looking up, his face lit by a huge warm golden light just above. Quietly, almost whispering, he sings the line in @Audio1, lips in sync; his eyes glisten, a trembling hopeful smile. Then the camera turns up toward the light: the last three small lanterns between him and the golden summit flash on one after another, closing the final dark gap. Rising energy. Soft 3D clay chibi style. No text.
```

## 8 · Вершина: кнопка, «Это релиз!» · 15 с
Прикрепить: `keyframes/K11-summit.png` + 4 листа + `audio/S08-summit_1-37_1-52.wav`
```
Exactly four characters: the developer from @Image2, the artist from @Image3, the programmer from @Image4, the robot from @Image5. One continuous scene at dawn: they run up the last steps onto the mountain summit, singing the chorus in @Audio1 at full voice, lips in sync, and find the large round glowing golden button on a stone pedestal from @Image1. They put their hands on it together, laughing, tears of joy, the camera circling slowly around them, warm sparks rising. At the end they press it down together and a blinding burst of warm golden light fills the whole frame to pure white-gold. The lantern chain winds all the way down the mountain behind them. Soft 3D clay chibi style. No text.
```

## 9 · Рассвет: Enter, откидывается · 15 с
Прикрепить: `keyframes/R1-room-night.png`, `keyframes/C1-developer-sheet.png`, `audio/S09-dawn-enter_1-52_2-07.wav`
```
One continuous scene. The white-gold light fades into the same room as @Image1, every object in the same place, but now at early dawn: warm golden sunlight through the window, the monitor glows warm gold. It starts on an extreme close-up of the developer's finger from @Image2 pressing the Enter key on the dark keyboard. The camera slowly pulls back to the wide shot: the developer, dark grey t-shirt, slowly leans back in his chair, lets out a long breath, rubs his eyes, and a quiet tired smile appears. Use @Audio1 as the soundtrack and time the action to it. Soft 3D clay chibi style matching @Image1. No readable text, no new objects.
```
Сохраните удачный кадр широкого плана — это `D1`, рассветная комната для сцены 10.

## 10 · Видеозвонок и «Мы дошли» · 15 с
Прикрепить: `D1` (кадр из сцены 9), `keyframes/C1-developer-sheet.png`, `characters/Chibi Artist Turnaround Sheet-2.png`, `characters/Chibi Programmer Turnaround Sheet with Props-3.png`, `characters/Friendly White Robot Turnaround Sheet-5.png`, `audio/S10-we-made-it_2-14_2-29.wav`
```
Same dawn room as @Image1, every object in the same place. One continuous scene. Over-the-shoulder shot: on the monitor screen, inside its edges, a video call opens with three tiles: the artist from @Image3, the programmer from @Image4 and the robot from @Image5, each cheering, clapping, the robot waving. The developer from @Image2, dark grey t-shirt, laughs, waves back, wipes a tear. Then the camera slowly moves around to a close-up of his face in the warm golden light: he leans back and quietly, almost whispering, says "we made it" in sync with the last words of @Audio1, with a slight, tired, happy smile. Hold on his face. Soft 3D clay chibi style matching @Image1. No readable text, no new objects.
```

---

# Дубли с другого ракурса

То же действие, что в основной сцене, но другой крупностью или с другой точки. На монтаже переключаемся между дублем A (основная сцена) и B.

## 1B · Ночь: крупно лицо, удар · 15 с
Прикрепить: `keyframes/R1-room-night.png`, `keyframes/C1-developer-sheet.png`
```
Same room as @Image1. Medium close-up of the developer from @Image2, dark grey t-shirt, filmed from the monitor's side, looking straight at his face. The monitor screen itself is never visible; only its cold blue glow lights his face, with red flickering light from error popups reflecting on his face and eyes. Behind him the dark room from @Image1: the shelf with books and the plant. In the foreground at the bottom of the frame his hands on the dark keyboard and the red coffee mug. One continuous scene: he types fast and hard, tense; he suddenly stops, hands frozen above the keys, stares at the screen for about two seconds, closes his eyes, lets out a heavy breath: he is fed up. Right after that he slams his fist on the desk: the red mug jumps, the camera shakes slightly on impact. Soft 3D clay chibi style matching @Image1. No text, no new objects.
```

## 4B · Костёр: крупные планы лиц · 15 с
Прикрепить: `keyframes/K06-campfire-band.png` + 4 листа + `audio/S04-campfire_0-34_0-49.wav`
```
Same campfire scene as @Image1 with exactly four characters: the developer from @Image2, the artist from @Image3, the programmer from @Image4, the robot from @Image5. Close-ups, the camera slowly drifting from face to face in warm firelight while they sing the song in @Audio1, lips in sync: the developer singing with the guitar, looking up with hope; the artist smiling as she sings; the programmer with closed eyes playing the banjo, red headphones on his head; the robot's screen face glowing, swaying with its lantern. Sparks drift through the frame, shallow depth of field. Soft 3D clay chibi style. No text.
```

## 5B · Ноги и фонари сбоку · 12 с
Прикрепить: `keyframes/K08-feet-lanterns.png`, `characters/Friendly White Robot Turnaround Sheet-5.png`
```
Use @Image1 as the first frame: low side view at ground level, legs walking left to right on a dark rocky mountain path, the robot from @Image2 walking among them, half the humans' height. The camera tracks along with them. Rhythmically, every few steps, the next small brown wooden lantern on the ground ahead of the leading foot lights up with a soft warm burst; behind them the passed lanterns keep glowing, each standing alone, no ropes. Soft 3D clay chibi style. No text.
```

## 8B · Вершина: крупно руки и лица · 15 с
Прикрепить: `keyframes/K11-summit.png` + 4 листа + `audio/S08-summit_1-37_1-52.wav`
```
Same summit at dawn as @Image1, exactly four characters: the developer from @Image2, the artist from @Image3, the programmer from @Image4, the robot from @Image5. Close-ups: their faces one by one singing the chorus in @Audio1, lips in sync, laughing with tears of joy; then a close-up of four hands, including the robot's black claw hand, placed together on the glowing golden button; at the end they press it down and a blinding burst of warm golden light fills the frame to pure white-gold. Soft 3D clay chibi style. No text.
```

## 10B · «Мы дошли»: только крупный план · 12 с
Прикрепить: `D1` (кадр из сцены 9), `keyframes/C1-developer-sheet.png`, `audio/S10-we-made-it_2-14_2-29.wav`
```
Same dawn room as @Image1. Static close-up of the developer from @Image2, dark grey t-shirt, leaning back in his chair, warm golden morning light on his face, the monitor glowing softly beside him. He looks at the screen, eyes glistening, and quietly, almost whispering, says "we made it" in sync with the words of @Audio1, twice; a slight, tired, happy smile slowly appears. Hold on his face. Soft 3D clay chibi style matching @Image1. No text.
```
