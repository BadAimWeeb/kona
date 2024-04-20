## Kona supported image formats

The following image formats are guaranteed to be supported by Kona:

| Format | Codec        | Code[^1] | Read  | Write[^2] | Notes |
|--------|--------------|----------|-------|-----------|-------|
| PNG    | PNG          | PNG      | ☑     | ☑         |
| PNG    | APNG         | APNG     | ⚠[^3] |           | 
| JPEG   | JPEG         | JPEG     | ☑     | ☑         |
| GIF    | GIF          | GIF      | ⚠[^4] | ⚠[^4]     |
| JXL    | JXL          | JXL      | ⚠[^3] | ⚠[^3]     |
| WEBP   | WEBP         | WEBP     | ⚠[^3] | ⚠[^4]     |
| HEIF   | AV1          | AVIF     | ⚠[^3] |           |
| HEIF   | HEVC         | HEIC     | ⚠[^3] |           |
| TIFF   | TIFF         | TIFF     | ☑     |           |
| SVG    | SVG          | SVG      | ☑     |           | Default output image file is determined by viewport. Output will always be scaled correctly.<br />Embedded text may not be rendered correctly due to missing fonts.
| BMP    | BMP          | BMP3     | ☑     |           | BMP has multiple version. Look out for BMP and BMP2.<br />Only tested with Windows 11 generated BMP files.
| MP4    | *FFmpeg*[^5] | MP4      | ⚠[^3] |           | [^6]
| MOV    | *FFmpeg*[^5] | MOV      | ⚠[^3] |           | [^6]
| 3GP    | *FFmpeg*[^5] | 3GP      | ⚠[^3] |           | [^6]
| 3G2    | *FFmpeg*[^5] | 3G2      | ⚠[^3] |           | [^6]

[^1]: This code is returned on API calls.

[^2]: Work in progress.

[^3]: We do not have support for animated images yet because we don't have a way to transfer animation data from FFmpeg to ImageMagick (ImageMagick WASM does not compile with WebP muxer enabled). This is a limitation of the software.<br />
Non-animated images will still work as expected.

[^4]: We do not have support for animated images yet because of how ImageMagick handles animated images. This is a limitation of the software.<br />
Non-animated images will still work as expected.

[^5]: Kona uses [FFmpeg](https://ffmpeg.org/) to read this format. Video codecs supported by FFmpeg (H.264/AVC, H.265/HEVC, ...) are supported by Kona.<br />
This means that H.266/VVC reading is also available and supported if server has FFmpeg 7.0+.<br />
If possible, do not rely on default FFmpeg included in Kona. Instead, compile your own FFmpeg to get the best results you want.

[^6]: Only the first video stream is read. Any other streams are ignored.

Additionally, Kona may support additional formats that is supported by [ImageMagick](https://imagemagick.org/script/formats.php) and [FFmpeg](https://ffmpeg.org/). However, these formats not included in the list above are not guranteed to be supported.

**USAGE OF FORMATS/CODECS NOT INCLUDED IN THE LIST ABOVE IS AT YOUR OWN RISK.**
