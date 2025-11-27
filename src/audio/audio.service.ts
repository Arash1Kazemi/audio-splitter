import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
const ffmpeg = require('fluent-ffmpeg');

export interface SplitOptions {
  segmentDuration: number;
  overlapDuration: number;
}

interface Segment {
  start: number;
  duration: number;
  name: string;
}

@Injectable()
export class AudioService {
  async splitAudio(
    inputPath: string,
    options: SplitOptions,
  ): Promise<string[]> {
    const outputDir = path.join(__dirname, '../../uploads/output');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const totalDuration = await this.getAudioDuration(inputPath);

    const segments = this.calculateSegments(
      totalDuration,
      options.segmentDuration,
      options.overlapDuration,
    );

    console.log(`Total duration: ${totalDuration}s`);
    console.log(`Creating ${segments.length} segments:`, segments);

    const outputPaths: string[] = [];

    for (const segment of segments) {
      const outputPath = path.join(outputDir, segment.name);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(segment.start)
          .setDuration(segment.duration)
          .output(outputPath)
          .on('end', () => {
            outputPaths.push(outputPath);
            resolve();
          })
          .on('error', (err: Error) => reject(err))
          .run();
      });
    }

    return outputPaths;
  }

  private calculateSegments(
    totalDuration: number,
    segmentDuration: number,
    overlapDuration: number,
  ): Segment[] {
    const segments: Segment[] = [];
    let currentStart = 0;
    let partNumber = 1;

    while (currentStart < totalDuration) {
      const remainingDuration = totalDuration - currentStart;
      const actualDuration = Math.min(segmentDuration, remainingDuration);

      segments.push({
        start: currentStart,
        duration: actualDuration,
        name: `part_${partNumber}.mp3`,
      });

      currentStart += segmentDuration - overlapDuration;
      partNumber++;

      if (
        currentStart + overlapDuration >= totalDuration &&
        segments.length > 1
      ) {
        break;
      }
    }

    return segments;
  }

  async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err: Error, metadata: any) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata?.format?.duration;
          if (duration !== undefined) {
            resolve(Math.floor(duration));
          } else {
            reject(new Error('Could not determine audio duration'));
          }
        }
      });
    });
  }

  async cleanupOutputDirectory(): Promise<void> {
    const outputDir = path.join(__dirname, '../../uploads/output');
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      for (const file of files) {
        fs.unlinkSync(path.join(outputDir, file));
      }
    }
  }
}
