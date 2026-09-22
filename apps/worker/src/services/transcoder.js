const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

class VideoTranscoder {
  constructor(options = {}) {
    this.ffmpegPath = options.ffmpegPath || 'ffmpeg';
    this.ffprobePath = options.ffprobePath || 'ffprobe';
  }

  /**
   * Helper to execute a command wrapped in a Promise
   */
  _exec(cmd, args) {
    return new Promise((resolve, reject) => {
      execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(`Command ${cmd} failed: ${err.message}\nStderr: ${stderr}`));
        }
        resolve({ stdout, stderr });
      });
    });
  }

  /**
   * Generates a short synthetic MP4 video (useful for automated testing / fallback)
   */
  async createSyntheticVideo(outputPath, durationSeconds = 3) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const args = [
      '-y',
      '-f', 'lavfi',
      '-i', `testsrc=duration=${durationSeconds}:size=1280x720:rate=30`,
      '-f', 'lavfi',
      '-i', `sine=frequency=1000:duration=${durationSeconds}`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      outputPath
    ];

    await this._exec(this.ffmpegPath, args);
    return outputPath;
  }

  /**
   * Extract video duration and dimensions
   */
  async probe(inputPath) {
    try {
      const args = [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=width,height,codec_name',
        '-of', 'json',
        inputPath
      ];
      const { stdout } = await this._exec(this.ffprobePath, args);
      const data = JSON.parse(stdout);
      const videoStream = (data.streams || []).find(s => s.width && s.height) || {};
      return {
        duration: parseFloat(data.format?.duration || 0),
        width: parseInt(videoStream.width || 1280, 10),
        height: parseInt(videoStream.height || 720),
        codec: videoStream.codec_name || 'h264'
      };
    } catch (err) {
      // Fallback if ffprobe isn't present: default to 720p 16:9
      return { duration: 0, width: 1280, height: 720, codec: 'h264' };
    }
  }

  /**
   * Transcode input MP4 into multi-bitrate HLS (360p, 720p, 1080p + master.m3u8 + poster.jpg)
   */
  async transcodeHLS(inputPath, outputDir, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input video file not found at: ${inputPath}`);
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const profiles = [
      { name: '360p', width: 640, height: 360, videoBitrate: '800k', audioBitrate: '96k', bandwidth: 896000 },
      { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k', bandwidth: 2628000 },
      { name: '1080p', width: 1920, height: 1080, videoBitrate: '4500k', audioBitrate: '192k', bandwidth: 4692000 }
    ];

    const segmentDuration = options.segmentDuration || 4;
    const generatedVariants = [];

    // 1. Transcode each resolution profile
    for (const profile of profiles) {
      const variantDir = path.join(outputDir, profile.name);
      if (!fs.existsSync(variantDir)) fs.mkdirSync(variantDir, { recursive: true });

      const playlistPath = path.join(variantDir, 'index.m3u8');
      const segmentPattern = path.join(variantDir, 'seg-%03d.ts');

      console.log(`[VideoTranscoder] Encoding variant ${profile.name} (${profile.width}x${profile.height})...`);

      const args = [
        '-y',
        '-i', inputPath,
        '-vf', `scale=w=${profile.width}:h=${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', profile.videoBitrate,
        '-maxrate', profile.videoBitrate,
        '-bufsize', `${parseInt(profile.videoBitrate) * 2}k`,
        '-c:a', 'aac',
        '-b:a', profile.audioBitrate,
        '-ar', '44100',
        '-hls_time', String(segmentDuration),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', segmentPattern,
        playlistPath
      ];

      await this._exec(this.ffmpegPath, args);
      generatedVariants.push(profile);
    }

    // 2. Generate master.m3u8 playlist
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';

    for (const v of generatedVariants) {
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.width}x${v.height}\n`;
      masterContent += `${v.name}/index.m3u8\n`;
    }

    fs.writeFileSync(masterPlaylistPath, masterContent, 'utf-8');
    console.log(`[VideoTranscoder] Master playlist written to ${masterPlaylistPath}`);

    // 3. Extract poster thumbnail at 1s mark
    const posterPath = path.join(outputDir, 'poster.jpg');
    const thumbArgs = [
      '-y',
      '-ss', '00:00:01',
      '-i', inputPath,
      '-vframes', '1',
      '-q:v', '2',
      posterPath
    ];

    try {
      await this._exec(this.ffmpegPath, thumbArgs);
      console.log(`[VideoTranscoder] Poster thumbnail saved to ${posterPath}`);
    } catch (thumbErr) {
      console.warn(`[VideoTranscoder] Poster generation warning (using frame 0): ${thumbErr.message}`);
      // Fallback: frame 0
      const fallbackArgs = ['-y', '-i', inputPath, '-vframes', '1', '-q:v', '2', posterPath];
      await this._exec(this.ffmpegPath, fallbackArgs).catch(() => {});
    }

    return {
      masterPlaylistPath,
      posterPath,
      variants: generatedVariants.map(v => ({
        resolution: v.name,
        width: v.width,
        height: v.height,
        bandwidth: v.bandwidth,
        playlistPath: path.join(outputDir, v.name, 'index.m3u8')
      }))
    };
  }
}

module.exports = { VideoTranscoder };
