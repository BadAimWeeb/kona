## Kona supported image formats

The following image formats are guaranteed to be supported by Kona:

| Format | Codec        | Code[^1] | Read | Write[^2] | Notes |
|--------|--------------|----------|------|-----------|-------|
| PNG    | PNG          | PNG      | ☑    |           |
| PNG    | APNG         | APNG     | ☑    |           | 
| JPEG   | JPEG         | JPEG     | ☑    |           |
| GIF    | GIF          | GIF      | ☑    |           |
| JXL    | JXL          | JXL      | ☑    |           |
| WEBP   | WEBP         | WEBP     | ☑    |           |
| HEIF   | AV1          | AVIF     | ☑    |           |
| HEIF   | HEVC         | HEIC     | ☑    |           |
| TIFF   | TIFF         | TIFF     | ☑    |           |
| SVG    | SVG          | SVG      | ☑    |           | Output image file is determined by viewport.<br />Embedded text may not be rendered correctly due to missing fonts.
| BMP    | BMP          | BMP3     | ☑    |           | BMP has multiple version. Look out for BMP and BMP2.<br />Only tested with Windows 11 generated BMP files.
| MP4    | *FFmpeg*[^3] | MP4      | ☑    |           | [^4]
| MOV    | *FFmpeg*[^3] | MOV      | ☑    |           | [^4]
| 3GP    | *FFmpeg*[^3] | 3GP      | ☑    |           | [^4]
| 3G2    | *FFmpeg*[^3] | 3G2      | ☑    |           | [^4]

[^1]: This code is returned on API calls.

[^2]: Work in progress, there is no output yet.

[^3]: Kona uses [FFmpeg](https://ffmpeg.org/) to read this format. Video codecs supported by FFmpeg (H.264/AVC, H.265/HEVC, ...) are supported by Kona.<br />
This means that H.266/VVC reading is also available and supported if server has FFmpeg 7.0+.<br />
If possible, do not rely on default FFmpeg included in Kona. Instead, compile your own FFmpeg to get the best results you want.

[^4]: Only the first video stream is read. Any other streams are ignored.

Additionally, Kona may support additional formats that is supported by [ImageMagick](https://imagemagick.org/script/formats.php) and [FFmpeg](https://ffmpeg.org/). However, these formats not included in the list above are not guranteed to be supported.

**USAGE OF FORMATS/CODECS NOT INCLUDED IN THE LIST ABOVE IS AT YOUR OWN RISK.**
