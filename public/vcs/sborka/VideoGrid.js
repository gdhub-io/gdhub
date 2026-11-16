// ui-guard: off — not the app's UI: a Daily VCS component rendered on Daily's servers.
/**
 * The Sborka broadcast picture (GDHUB-207), uploaded as a session asset that
 * replaces the baseline composition's VideoGrid. It draws the whole frame at
 * 1920×1080 design pixels: header, editor grid, the direction rail and the
 * tiles. Frames 03.15.15–20 in docs/design/platform-design.pen.
 *
 * Params (set by the host's browser, see src/lib/live/sborka.ts):
 *   sborka.title    show title
 *   sborka.sources  comma list of session ids, `<id>:screen` for a shared screen
 *   sborka.people   JSON { [sessionId]: { name, role, direction } }
 *   sborka.palette  JSON { [direction]: [tint, vivid] }, rail order
 *   sborka.frameMin cameras on air from which the speaker gets the editing frame
 */
import * as React from 'react';
import { Box, Image, Text, Video } from '#vcs-react/components';
import { RoomContext } from '#vcs-react/contexts';
import { useParams } from '#vcs-react/hooks';

const W = 1920;
const HEADER = 84;
const PAD = 20;
const GAP = 20;
const RAIL_W = 60;
const STAGE = { x: PAD + RAIL_W + GAP, y: HEADER + PAD, w: W - PAD * 3 - RAIL_W, h: 1080 - HEADER - PAD * 2 };
const SIDE_W = 300;
const RADIUS = 16;
const FONT = 'Roboto';

// Every frame below is in design pixels, scaled to the output in one place.
function place(parent, p, ctx) {
  const s = ctx.viewport.w / W;
  return { x: parent.x + p.x * s, y: parent.y + p.y * s, w: p.w * s, h: p.h * s };
}

function within(parent, p, ctx) {
  const s = ctx.viewport.w / W;
  return { x: parent.x + p.x * s, y: parent.y + p.y * s, w: p.w == null ? parent.w : p.w * s, h: p.h * s };
}

function bottomBand(parent, p, ctx) {
  const s = ctx.viewport.w / W;
  const h = p.h * s;
  return { x: parent.x, y: parent.y + parent.h - h, w: parent.w, h };
}

function parse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
}

function gridRows(count) {
  if (count <= 0) return [];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const out = [];
  for (let r = 0; r < rows; r++) out.push(r < rows - 1 ? cols : count - cols * (rows - 1));
  return out;
}

// Mirrors tileFrames() in src/lib/live/sborka.ts: full rows, the last one centred.
function gridFrames(count) {
  const rows = gridRows(count);
  if (!rows.length) return [];
  const cols = rows[0];
  const w = (STAGE.w - GAP * (cols - 1)) / cols;
  const h = (STAGE.h - GAP * (rows.length - 1)) / rows.length;
  const frames = [];
  rows.forEach((n, r) => {
    const offset = (STAGE.w - (n * w + GAP * (n - 1))) / 2;
    for (let i = 0; i < n; i++) frames.push({ x: STAGE.x + offset + i * (w + GAP), y: STAGE.y + r * (h + GAP), w, h });
  });
  return frames;
}

// One shared screen takes the stage; cameras stack in the side column.
function shareFrames(cameraCount) {
  const main = { x: STAGE.x, y: STAGE.y, w: STAGE.w - SIDE_W - GAP, h: STAGE.h };
  const h = cameraCount ? Math.min(224, (STAGE.h - GAP * (cameraCount - 1)) / cameraCount) : 0;
  const side = [];
  for (let i = 0; i < cameraCount; i++) side.push({ x: STAGE.x + STAGE.w - SIDE_W, y: STAGE.y + i * (h + GAP), w: SIDE_W, h });
  return { main, side };
}

function fit(text, width, fontSize) {
  const max = Math.floor(width / (fontSize * 0.55));
  return text.length > max ? text.slice(0, Math.max(1, max - 1)) + '…' : text;
}

function initials(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function Tile({ id, frame, source, person, screen, small }) {
  const fontSize = small ? 20 : 26;
  const label = screen
    ? (person.name || '') + ' показывает экран'
    : [person.name, person.role].filter(Boolean).join(' · ');
  const hasVideo = source && !source.paused;
  return (
    <Box id={id} layout={[place, frame]} clip style={{ fillColor: '#26272A', cornerRadius_px: RADIUS }}>
      {hasVideo ? (
        <Video src={source.videoId} scaleMode={screen ? 'fit' : 'fill'} />
      ) : (
        <Box layout={[within, { x: frame.w / 2 - 56, y: frame.h / 2 - 84, w: 112, h: 112 }]} style={{ fillColor: '#3A3B3F', cornerRadius_px: 56 }}>
          <Text layout={[within, { x: 0, y: 26, h: 64 }]} style={{ textColor: '#D8D9DB', fontFamily: FONT, fontWeight: '500', fontSize_px: 52, textAlign: 'center' }}>
            {initials(person.name)}
          </Text>
        </Box>
      )}
      {label ? (
        <Box layout={[bottomBand, { h: small ? 44 : 58 }]} style={{ fillColor: 'rgba(29, 29, 31, 0.9)' }}>
          <Text layout={[within, { x: 16, y: small ? 10 : 14, w: frame.w - 32, h: fontSize * 1.4 }]} clip style={{ textColor: '#D8D9DB', fontFamily: FONT, fontWeight: '500', fontSize_px: fontSize }}>
            {fit(label, frame.w - 32, fontSize)}
          </Text>
        </Box>
      ) : null}
      {/* The hairline goes last, or the video and the label cover it. */}
      <Box style={{ strokeColor: '#4C4E52', strokeWidth_px: 2, cornerRadius_px: RADIUS }} />
    </Box>
  );
}

// The editor-style selection: a square outline with square handles.
function SpeakerFrame({ frame, tint, small }) {
  const stroke = small ? 3 : 5;
  const m = small ? 12 : 20;
  const corners = [
    [frame.x - m / 2, frame.y - m / 2],
    [frame.x + frame.w - m / 2, frame.y - m / 2],
    [frame.x - m / 2, frame.y + frame.h - m / 2],
    [frame.x + frame.w - m / 2, frame.y + frame.h - m / 2],
  ];
  return (
    <Box id="speakerFrame">
      <Box layout={[place, frame]} style={{ strokeColor: tint, strokeWidth_px: stroke }} />
      {corners.map(([x, y], i) => (
        <Box key={'handle' + i} layout={[place, { x, y, w: m, h: m }]} style={{ fillColor: tint }} />
      ))}
    </Box>
  );
}

function Rail({ palette, selected }) {
  const slugs = Object.keys(palette);
  return (
    <Box id="rail">
      <Box layout={[place, { x: PAD, y: STAGE.y, w: RAIL_W, h: STAGE.h }]} style={{ fillColor: 'rgba(28, 29, 31, 0.9)', strokeColor: '#4C4E52', strokeWidth_px: 2, cornerRadius_px: RAIL_W / 2 }} />
      {slugs.map((slug, i) => {
        const on = slug === selected;
        const y = STAGE.y + 24 + i * 48;
        return (
          <Box key={'rail_' + slug}>
            {on ? (
              <Box layout={[place, { x: PAD + 8, y, w: 44, h: 44 }]} style={{ fillColor: palette[slug][1], strokeColor: palette[slug][0], strokeWidth_px: 2, cornerRadius_px: 22 }} />
            ) : null}
            <Image src={'sborka-' + slug + (on ? '-on.png' : '-off.png')} layout={[place, { x: PAD + 16, y: y + 8, w: 28, h: 28 }]} />
          </Box>
        );
      })}
    </Box>
  );
}

export default function VideoGrid(gridProps) {
  const params = useParams();
  const { availablePeers } = React.useContext(RoomContext);
  const descs = gridProps.participantDescs || [];

  const title = params['sborka.title'] || '';
  const people = parse(params['sborka.people'], {});
  const palette = parse(params['sborka.palette'], {});
  const frameMin = Number(params['sborka.frameMin']) || 3;
  const keys = String(params['sborka.sources'] || '').split(',').filter(Boolean);

  // A source key → the video Daily gave us for it, with its paused/speaking state.
  const sources = keys
    .map((key) => {
      const [peerId, kind] = key.split(':');
      const peer = availablePeers.find((p) => p.id === peerId);
      const screen = kind === 'screen';
      const track = peer && (screen ? peer.screenshareVideo : peer.video);
      if (!peer || (screen && !track)) return null;
      const desc = track ? descs.find((d) => d.videoId === track.id) : null;
      return {
        key,
        peerId,
        screen,
        videoId: track ? track.id : null,
        paused: !track || (desc ? desc.paused : track.paused),
        highlighted: !!(desc && desc.highlighted),
      };
    })
    .filter(Boolean);

  const cameras = sources.filter((s) => !s.screen);
  const share = sources.find((s) => s.screen);
  const speaker = cameras.find((s) => s.highlighted);
  const speakerDirection = speaker && people[speaker.peerId] ? people[speaker.peerId].direction : null;
  const tintOf = (peerId) => {
    const dir = people[peerId] && people[peerId].direction;
    return (palette[dir] && palette[dir][0]) || '#DCE9FB';
  };

  let tiles;
  if (share) {
    const { main, side } = shareFrames(cameras.length);
    tiles = [{ source: share, frame: main, small: false }].concat(cameras.map((source, i) => ({ source, frame: side[i], small: true })));
  } else {
    const frames = gridFrames(cameras.length);
    tiles = cameras.map((source, i) => ({ source, frame: frames[i], small: false }));
  }

  const framed = speaker && cameras.length >= frameMin ? tiles.find((t) => t.source === speaker) : null;

  return (
    <Box id="sborka">
      <Image src="sborka-grid.png" layout={[place, { x: 0, y: HEADER, w: W, h: 996 }]} />
      {tiles.map(({ source, frame, small }) => (
        <Tile
          key={'tile_' + source.key}
          id={'tile_' + source.key}
          frame={frame}
          source={source}
          person={people[source.peerId] || {}}
          screen={source.screen}
          small={small}
        />
      ))}
      {framed ? <SpeakerFrame frame={framed.frame} tint={tintOf(framed.source.peerId)} small={framed.small} /> : null}
      <Rail palette={palette} selected={speakerDirection} />
      <Box id="header" layout={[place, { x: 0, y: 0, w: W, h: HEADER }]} style={{ fillColor: '#1C1D1F' }} />
      <Box layout={[place, { x: 0, y: HEADER - 2, w: W, h: 2 }]} style={{ fillColor: '#36373A' }} />
      <Image src="sborka-logo.png" layout={[place, { x: 32, y: 11, w: 186, h: 62 }]} />
      <Text layout={[place, { x: 480, y: 20, w: 960, h: 48 }]} clip style={{ textColor: '#D8D9DB', fontFamily: FONT, fontWeight: '700', fontSize_px: 36, textAlign: 'center' }}>
        {fit(title, 960, 36)}
      </Text>
      <Image src="sborka-gdhub.png" layout={[place, { x: W - 32 - 170, y: 18, w: 170, h: 47 }]} />
    </Box>
  );
}
