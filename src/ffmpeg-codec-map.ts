import { MagickFormat } from "@imagemagick/magick-wasm";
import { fileTypeFromBuffer } from "file-type";

export const FFmpegMapping: Record<string, MagickFormat> = {
    "apng": MagickFormat.APng,
    "jpegxl": MagickFormat.Jxl // in case ImageMagick somehow failed to support JXL
}

export const FFmpegMappingFormat: Record<string, MagickFormat | ((buf: Uint8Array) => MagickFormat | Promise<MagickFormat>)> = {
    "mov,mp4,m4a,3gp,3g2,mj2": async (buf) => {
        // Sometimes there are not a lot of difference between these formats (ffmpeg don't really care),
        // so we use file-type to "properly" detect the format.
        let ft = await fileTypeFromBuffer(buf);
        switch (ft?.ext) {
            case "mov": return MagickFormat.Mov;
            case "mp4": return MagickFormat.Mp4;
            case "3gp": return MagickFormat.ThreeGp;
            case "3g2": return MagickFormat.ThreeG2;
            // @ts-ignore heh
            default: return void 0 as unknown as MagickFormat;
        }
    }
}
