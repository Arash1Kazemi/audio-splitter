import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Res,
  Param,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AudioService, SplitOptions } from './audio.service';
import type { Response } from 'express';
import * as path from 'path';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
        },
      }),
    }),
  )
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    try {
      await this.audioService.cleanupOutputDirectory();

      const duration = await this.audioService.getAudioDuration(file.path);

      const segmentDuration = parseInt(body.segmentDuration) || 20;
      const overlapDuration = parseInt(body.overlapDuration) || 5;

      const options: SplitOptions = {
        segmentDuration,
        overlapDuration,
      };

      const outputPaths = await this.audioService.splitAudio(
        file.path,
        options,
      );

      return {
        success: true,
        message: 'Audio split successfully',
        duration: duration,
        settings: options,
        parts: outputPaths.map((p, i) => ({
          name: `part_${i + 1}.mp3`,
          path: `/audio/download/part_${i + 1}.mp3`,
          startTime: i * (segmentDuration - overlapDuration),
        })),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('download/:filename')
  downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(__dirname, '../../uploads/output', filename);
    res.download(filePath);
  }
}
