#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

const KIE_JOBS_BASE = 'https://api.kie.ai/api/v1/jobs';
const KIE_UPLOAD_BASE = 'https://kieai.redpandaai.co';
const AI_JOBDORI_ENV = path.join(os.homedir(), 'sideProjects', 'ai-jobdori', '.env');
const DEFAULT_OUT_DIR = path.resolve('outputs/kie-tts-lipsync');

const COST = {
  elevenlabsPerChar: 0.000167,
  fishPerByteUsd: 15 / 1_000_000,
  kieInfinitalk480pPerSec: 0.015,
  kieInfinitalk720pPerSec: 0.06,
};

const VOICES = {
  instructor: {
    provider: 'elevenlabs',
    apiKeyEnv: 'ELEVEN_LABS_API_KEY',
    voiceIdEnv: ['ELEVEN_LABS_VOICE_INSTRUCTOR', 'ELEVEN_LABS_VOICE_ID'],
    fallbackVoiceId: 'pNInz6obpgDQGcFmaJgB',
    voiceSettings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.3,
      use_speaker_boost: true,
    },
  },
  student: {
    provider: 'fish',
    apiKeyEnv: 'FISH_AUDIO_API_KEY',
    voiceIdEnv: ['FISH_AUDIO_VOICE_ID'],
    fallbackVoiceId: '',
    voiceSettings: { speed: 1.0 },
  },
};

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }
    const without = arg.slice(2);
    const eq = without.indexOf('=');
    if (eq !== -1) {
      out[without.slice(0, eq)] = without.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[without] = next;
      i += 1;
    } else {
      out[without] = true;
    }
  }
  return out;
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return null;
  const idx = trimmed.indexOf('=');
  const key = trimmed.slice(0, idx).trim().replace(/^export\s+/, '');
  let value = trimmed.slice(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  value = value.replace(/\\n/g, '\n');
  return { key, value };
}

function loadEnvFiles() {
  const loaded = [];
  const seen = new Set();

  const loadOne = (file) => {
    if (!file || seen.has(file)) return;
    seen.add(file);
    if (!fs.existsSync(file)) return;
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const pair = parseEnvLine(line);
      if (!pair) continue;
      if (process.env[pair.key] === undefined) process.env[pair.key] = pair.value;
    }
    loaded.push(file);
  };

  loadOne(path.resolve('.env'));
  if (process.env.KIE_TTS_ENV) loadOne(path.resolve(process.env.KIE_TTS_ENV));
  loadOne(AI_JOBDORI_ENV);

  return loaded;
}

const loadedEnvFiles = loadEnvFiles();

function usage() {
  console.log(`Usage:
  kie-media.mjs env-check
  kie-media.mjs tts --text "..." --speaker instructor --output out.mp3 [--dry-run]
  kie-media.mjs tts --text-file script.txt --provider fish --output out.mp3 [--dry-run]
  kie-media.mjs lipsync --image character.png --audio voice.mp3 --prompt "..." --output scene.mp4 [--resolution 480p] [--dry-run]
  kie-media.mjs encode --input raw.mp4 --output ready.mp4 --aspect shorts

Commands:
  env-check   Report required env var presence without printing values.
  tts         Generate or dry-run ElevenLabs/Fish Audio MP3.
  lipsync     Generate or dry-run KIE Infinitalk from image+audio.
  encode      Re-encode AI video for CapCut/Shorts.
`);
}

function ensureString(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

function ensureFile(file, label) {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) throw new Error(`${label} not found: ${resolved}`);
  return resolved;
}

function boolFlag(args, name) {
  return args[name] === true || args[name] === 'true' || args[name] === '1';
}

function resolveOutput(file, subdir, fallbackName) {
  const out = file ? path.resolve(file) : path.join(DEFAULT_OUT_DIR, subdir, fallbackName);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  return out;
}

function readTextFromArgs(args) {
  if (args.text) return String(args.text);
  if (args['text-file']) return fs.readFileSync(path.resolve(String(args['text-file'])), 'utf8');
  throw new Error('Either --text or --text-file is required');
}

function countChars(text) {
  return Array.from(text.trim()).length;
}

function estimateSpeechSeconds(text) {
  const nonSpace = Array.from(text.replace(/\s/g, '')).length;
  return Math.max(1, Math.round((nonSpace / 3.5) * 10) / 10);
}

function estimateTtsCost(provider, chars) {
  if (provider === 'elevenlabs') return chars * COST.elevenlabsPerChar;
  if (provider === 'fish') return chars * 3 * COST.fishPerByteUsd;
  throw new Error(`Unknown TTS provider: ${provider}`);
}

function estimateKieCost(seconds, resolution) {
  if (resolution === '720p') return seconds * COST.kieInfinitalk720pPerSec;
  return seconds * COST.kieInfinitalk480pPerSec;
}

function getVoiceConfig(speaker, providerOverride) {
  const base = VOICES[speaker] || VOICES.instructor;
  const provider = providerOverride && providerOverride !== 'auto' ? providerOverride : base.provider;
  const mapped = Object.values(VOICES).find((v) => v.provider === provider) || base;
  return { ...mapped, provider };
}

function resolveVoiceId(config, customVoiceId) {
  if (customVoiceId) return { value: String(customVoiceId), source: 'custom --voice-id' };
  for (const envName of config.voiceIdEnv || []) {
    if (process.env[envName]) return { value: process.env[envName], source: envName };
  }
  if (config.fallbackVoiceId) return { value: config.fallbackVoiceId, source: 'built-in fallback' };
  throw new Error(`Voice id missing; set one of: ${(config.voiceIdEnv || []).join(', ')}`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

async function writeJson(file, data) {
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

function ffprobeDuration(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim();
    const parsed = Number.parseFloat(out);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
  } catch {
    return null;
  }
}

async function fetchBufferOrThrow(url, init, label) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${label} failed: HTTP ${res.status} ${text.slice(0, 500)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function generateElevenLabs(text, voiceId, settings) {
  const apiKey = requireEnv('ELEVEN_LABS_API_KEY');
  return fetchBufferOrThrow(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: settings,
        speed: 1.0,
      }),
    },
    'ElevenLabs TTS',
  );
}

async function generateFishAudio(text, voiceId, settings) {
  const apiKey = requireEnv('FISH_AUDIO_API_KEY');
  return fetchBufferOrThrow(
    'https://api.fish.audio/v1/tts',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        model: 's1',
      },
      body: JSON.stringify({
        text,
        reference_id: voiceId,
        prosody: {
          speed: settings.speed || 1.0,
          volume: 0,
        },
        format: 'mp3',
        mp3_bitrate: 128,
        latency: 'normal',
      }),
    },
    'Fish Audio TTS',
  );
}

async function commandEnvCheck() {
  console.log('Env files loaded:');
  if (loadedEnvFiles.length === 0) console.log('  none');
  for (const file of loadedEnvFiles) console.log(`  ${file}`);

  const vars = [
    'ELEVEN_LABS_API_KEY',
    'ELEVEN_LABS_VOICE_ID',
    'ELEVEN_LABS_VOICE_INSTRUCTOR',
    'FISH_AUDIO_API_KEY',
    'FISH_AUDIO_VOICE_ID',
    'KIE_AI_API_KEY',
  ];
  console.log('\nEnv status:');
  for (const name of vars) console.log(`  ${name}: ${process.env[name] ? 'set' : 'missing'}`);
}

async function commandTts(args) {
  const dryRun = boolFlag(args, 'dry-run');
  const speaker = String(args.speaker || 'instructor');
  const providerArg = String(args.provider || 'auto');
  const config = getVoiceConfig(speaker, providerArg);
  if (!['elevenlabs', 'fish'].includes(config.provider)) throw new Error(`Unsupported provider: ${config.provider}`);

  const text = readTextFromArgs(args).trim();
  if (!text) throw new Error('TTS text is empty');
  const chars = countChars(text);
  const estSec = estimateSpeechSeconds(text);
  const estCost = estimateTtsCost(config.provider, chars);
  const voice = resolveVoiceId(config, args['voice-id']);
  const output = resolveOutput(args.output, 'audio', `${Date.now()}-${speaker}.mp3`);

  const summary = {
    command: 'tts',
    dry_run: dryRun,
    speaker,
    provider: config.provider,
    voice_id_source: voice.source,
    chars,
    est_sec: estSec,
    cost_estimate_usd: Number(estCost.toFixed(6)),
    output,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (dryRun) {
    console.log('Dry-run: no TTS API call was made.');
    return;
  }

  let buffer;
  if (config.provider === 'elevenlabs') buffer = await generateElevenLabs(text, voice.value, config.voiceSettings);
  else buffer = await generateFishAudio(text, voice.value, config.voiceSettings);

  await fsp.writeFile(output, buffer);
  const actualSec = ffprobeDuration(output);
  await writeJson(`${output}.json`, {
    ...summary,
    dry_run: false,
    bytes: buffer.byteLength,
    actual_sec: actualSec,
    created_at: new Date().toISOString(),
  });
  console.log(`Saved: ${output}`);
  console.log(`Sidecar: ${output}.json`);
}

function extensionMime(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.mp4') return 'video/mp4';
  return 'application/octet-stream';
}

async function uploadKieFile(filePath, uploadPath) {
  const apiKey = requireEnv('KIE_AI_API_KEY');
  const file = ensureFile(filePath, 'Upload file');
  const buffer = await fsp.readFile(file);
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: extensionMime(file) }), path.basename(file));
  form.append('uploadPath', uploadPath);
  form.append('fileName', `${Date.now()}-${path.basename(file).replace(/[^a-zA-Z0-9._-]/g, '_')}`);

  const res = await fetch(`${KIE_UPLOAD_BASE}/api/file-stream-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`KIE upload failed: HTTP ${res.status} ${text.slice(0, 500)}`);
  const parsed = JSON.parse(text);
  const fileUrl = parsed?.data?.fileUrl || parsed?.data?.downloadUrl || parsed?.fileUrl;
  if (!fileUrl) throw new Error(`KIE upload response did not include fileUrl: ${text.slice(0, 500)}`);
  return { fileUrl, response: parsed };
}

async function postJson(url, body, label) {
  const apiKey = requireEnv('KIE_AI_API_KEY');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${label} failed: HTTP ${res.status} ${text.slice(0, 1000)}`);
  return JSON.parse(text);
}

async function getJson(url, label) {
  const apiKey = requireEnv('KIE_AI_API_KEY');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${label} failed: HTTP ${res.status} ${text.slice(0, 1000)}`);
  return JSON.parse(text);
}

function extractTaskId(payload) {
  return payload?.data?.taskId || payload?.data?.task_id || payload?.taskId || payload?.task_id;
}

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try { return JSON.parse(value); } catch { return null; }
}

function findUrlDeep(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^https?:\/\//.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrlDeep(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of ['resultUrls', 'result_urls', 'urls', 'videoUrls', 'videos']) {
      const found = findUrlDeep(value[key]);
      if (found) return found;
    }
    for (const key of ['url', 'fileUrl', 'downloadUrl']) {
      if (typeof value[key] === 'string' && /^https?:\/\//.test(value[key])) return value[key];
    }
    for (const item of Object.values(value)) {
      const found = findUrlDeep(item);
      if (found) return found;
    }
  }
  return null;
}

function extractResultUrl(payload) {
  const data = payload?.data || payload;
  const resultJson = parseMaybeJson(data?.resultJson);
  return findUrlDeep(resultJson) || findUrlDeep(data?.works) || findUrlDeep(data?.response) || findUrlDeep(data?.result) || findUrlDeep(data);
}

async function createInfinitalkTask({ imageUrl, audioUrl, prompt, resolution, callbackUrl, inputJson }) {
  let body;
  if (inputJson) {
    body = JSON.parse(fs.readFileSync(path.resolve(inputJson), 'utf8'));
  } else {
    body = {
      model: 'infinitalk/from-audio',
      input: {
        image_url: imageUrl,
        audio_url: audioUrl,
        prompt,
        resolution,
      },
    };
    if (callbackUrl) body.callBackUrl = callbackUrl;
  }

  const payload = await postJson(`${KIE_JOBS_BASE}/createTask`, body, 'KIE createTask');
  const taskId = extractTaskId(payload);
  if (!taskId) throw new Error(`KIE createTask did not return taskId: ${JSON.stringify(payload).slice(0, 1000)}`);
  return { taskId, requestBody: body, response: payload };
}

async function pollKieTask(taskId, intervalMs, timeoutMs, sidecarPrefix) {
  const start = Date.now();
  let lastPayload = null;
  while (Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const payload = await getJson(`${KIE_JOBS_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`, 'KIE recordInfo');
    lastPayload = payload;
    const data = payload?.data || payload;
    const stateRaw = String(data?.state || data?.status || '').trim().toLowerCase();
    console.log(`Task ${taskId} state: ${stateRaw || 'unknown'}`);
    await writeJson(`${sidecarPrefix}.poll-latest.json`, payload);

    if (['success', 'completed', 'succeed', 'done'].includes(stateRaw)) {
      const resultUrl = extractResultUrl(payload);
      if (!resultUrl) throw new Error(`KIE task succeeded but no result URL was found. See ${sidecarPrefix}.poll-latest.json`);
      return { resultUrl, payload };
    }
    if (['fail', 'failed', 'error'].includes(stateRaw)) {
      throw new Error(`KIE task failed. See ${sidecarPrefix}.poll-latest.json`);
    }
  }
  await writeJson(`${sidecarPrefix}.timeout-latest.json`, lastPayload || { taskId });
  throw new Error(`KIE task timed out after ${Math.round(timeoutMs / 1000)}s: ${taskId}`);
}

async function downloadFile(url, output) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fsp.writeFile(output, buffer);
  return buffer.byteLength;
}

function encodeVideo(input, output, aspect, keepAudio, crf = '16', preset = 'slow') {
  const filters = {
    shorts: '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:1[bg];[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]',
    landscape: '[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1[v]',
    source: '[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1[v]',
  };
  const filter = filters[aspect] || filters.shorts;
  const args = [
    '-hide_banner', '-y',
    '-i', input,
    '-filter_complex', filter,
    '-map', '[v]',
    '-c:v', 'libx264',
    '-preset', String(preset),
    '-crf', String(crf),
    '-r', '30',
    '-g', '15',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
  ];
  if (keepAudio) args.push('-map', '0:a?', '-c:a', 'aac', '-b:a', '192k');
  else args.push('-an');
  args.push(output);

  const result = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}`);
}

function rawOutputFor(output) {
  const dir = path.dirname(output);
  const ext = path.extname(output) || '.mp4';
  const base = path.basename(output, ext);
  return path.join(dir, `${base}.raw${ext}`);
}

async function commandEncode(args) {
  const input = ensureFile(ensureString(args.input, '--input'), 'Input video');
  const output = resolveOutput(args.output, 'video', `${Date.now()}-encoded.mp4`);
  const aspect = String(args.aspect || 'shorts');
  const keepAudio = boolFlag(args, 'keep-audio');
  encodeVideo(input, output, aspect, keepAudio, args.crf || '16', args.preset || 'slow');
  await writeJson(`${output}.json`, {
    command: 'encode', input, output, aspect, keep_audio: keepAudio, created_at: new Date().toISOString(),
  });
  console.log(`Saved: ${output}`);
}

async function commandLipsync(args) {
  const dryRun = boolFlag(args, 'dry-run');
  const imagePath = args.image ? ensureFile(String(args.image), 'Image') : null;
  const audioPath = args.audio ? ensureFile(String(args.audio), 'Audio') : null;
  const imageUrlArg = args['image-url'] ? String(args['image-url']) : null;
  const audioUrlArg = args['audio-url'] ? String(args['audio-url']) : null;
  if (!imagePath && !imageUrlArg) throw new Error('Either --image or --image-url is required');
  if (!audioPath && !audioUrlArg) throw new Error('Either --audio or --audio-url is required');

  const prompt = String(args.prompt || 'A webtoon character speaks to camera with natural lip sync and subtle head motion.');
  const resolution = String(args.resolution || '480p');
  if (!['480p', '720p'].includes(resolution)) throw new Error('--resolution must be 480p or 720p');
  const audioSec = audioPath ? ffprobeDuration(audioPath) : null;
  const duration = args.duration ? Number.parseFloat(String(args.duration)) : audioSec;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Could not determine duration; pass --duration seconds');
  const estCost = estimateKieCost(duration, resolution);
  const output = resolveOutput(args.output, 'video', `${Date.now()}-lipsync.mp4`);
  const postprocess = String(args.postprocess || 'shorts');
  const sidecarPrefix = output;

  const summary = {
    command: 'lipsync',
    dry_run: dryRun,
    model: 'infinitalk/from-audio',
    image: imagePath ? '[local file]' : '[url provided]',
    audio: audioPath ? '[local file]' : '[url provided]',
    prompt,
    resolution,
    duration_sec: Math.round(duration * 100) / 100,
    cost_estimate_usd: Number(estCost.toFixed(6)),
    postprocess,
    output,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (dryRun) {
    console.log('Dry-run: no upload and no KIE generation call were made.');
    return;
  }

  requireEnv('KIE_AI_API_KEY');
  let imageUrl = imageUrlArg;
  let audioUrl = audioUrlArg;
  const uploadResponses = {};
  if (!imageUrl && imagePath) {
    const uploaded = await uploadKieFile(imagePath, 'capcut-cli/kie-tts-lipsync/images');
    imageUrl = uploaded.fileUrl;
    uploadResponses.image = uploaded.response;
    console.log('Uploaded image to KIE temporary storage.');
  }
  if (!audioUrl && audioPath) {
    const uploaded = await uploadKieFile(audioPath, 'capcut-cli/kie-tts-lipsync/audio');
    audioUrl = uploaded.fileUrl;
    uploadResponses.audio = uploaded.response;
    console.log('Uploaded audio to KIE temporary storage.');
  }

  const created = await createInfinitalkTask({
    imageUrl,
    audioUrl,
    prompt,
    resolution,
    callbackUrl: args['callback-url'] ? String(args['callback-url']) : undefined,
    inputJson: args['input-json'] ? String(args['input-json']) : undefined,
  });
  console.log(`Task created: ${created.taskId}`);

  await writeJson(`${sidecarPrefix}.create.json`, {
    ...summary,
    dry_run: false,
    task_id: created.taskId,
    request_body: created.requestBody,
    response: created.response,
    upload_responses: uploadResponses,
    created_at: new Date().toISOString(),
  });

  const polled = await pollKieTask(
    created.taskId,
    Number.parseInt(String(args['poll-interval-ms'] || '5000'), 10),
    Number.parseInt(String(args['timeout-ms'] || `${10 * 60 * 1000}`), 10),
    sidecarPrefix,
  );

  const rawOutput = postprocess === 'none' ? output : rawOutputFor(output);
  const bytes = await downloadFile(polled.resultUrl, rawOutput);
  console.log(`Downloaded raw result: ${rawOutput}`);

  if (postprocess !== 'none') {
    encodeVideo(rawOutput, output, postprocess, boolFlag(args, 'keep-audio'), args.crf || '16', args.preset || 'slow');
  }

  await writeJson(`${output}.json`, {
    ...summary,
    dry_run: false,
    task_id: created.taskId,
    result_url: polled.resultUrl,
    raw_output: rawOutput,
    downloaded_bytes: bytes,
    output,
    actual_sec: ffprobeDuration(output),
    completed_at: new Date().toISOString(),
  });
  console.log(`Saved: ${output}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';
  try {
    if (command === 'help' || command === '--help' || boolFlag(args, 'help')) return usage();
    if (command === 'env-check') return await commandEnvCheck(args);
    if (command === 'tts') return await commandTts(args);
    if (command === 'lipsync') return await commandLipsync(args);
    if (command === 'encode') return await commandEncode(args);
    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main();
