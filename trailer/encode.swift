// Joins the filmed frames and the rendered sound into an MP4 with nothing but the system's own AVFoundation
// (no ffmpeg needed): H.264 High profile video in BT.709, AAC sound.
//
//   swift trailer/encode.swift <frames dir> <fps> <sound.wav> <out.mp4> [video bits per second]
//
// The frames are the JPEGs record.mjs writes (f00000.jpg, f00001.jpg, ...), all the same size.
import AVFoundation
import CoreGraphics
import CoreVideo
import Foundation
import ImageIO

let args = CommandLine.arguments
guard args.count >= 5 else { print("usage: encode.swift <frames dir> <fps> <sound.wav> <out.mp4> [bitrate]"); exit(2) }
let dir = URL(fileURLWithPath: args[1]), fps = Int32(args[2]) ?? 60
let soundURL = URL(fileURLWithPath: args[3]), outURL = URL(fileURLWithPath: args[4])
let bitrate = args.count > 5 ? Int(args[5]) ?? 16_000_000 : 16_000_000

let names = try FileManager.default.contentsOfDirectory(atPath: dir.path).filter { $0.hasSuffix(".jpg") }.sorted()
guard let first = names.first, let src0 = CGImageSourceCreateWithURL(dir.appendingPathComponent(first) as CFURL, nil),
      let img0 = CGImageSourceCreateImageAtIndex(src0, 0, nil) else { print("no frames in \(dir.path)"); exit(1) }
let W = img0.width, H = img0.height
try? FileManager.default.removeItem(at: outURL)
let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true

let video = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoColorPropertiesKey: [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
  ],
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: bitrate,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoMaxKeyFrameIntervalKey: Int(fps),
    AVVideoExpectedSourceFrameRateKey: Int(fps),
    AVVideoAllowFrameReorderingKey: true,
  ],
])
video.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: video, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
  kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H,
  kCVPixelBufferCGImageCompatibilityKey as String: true, kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
])
writer.add(video)

// the sound: read back as plain samples and handed to the AAC encoder
let soundAsset = AVURLAsset(url: soundURL)
let soundTrack = try await soundAsset.loadTracks(withMediaType: .audio).first
var reader: AVAssetReader? = nil, readerOut: AVAssetReaderTrackOutput? = nil, audio: AVAssetWriterInput? = nil
if let track = soundTrack {
  let r = try AVAssetReader(asset: soundAsset)
  let o = AVAssetReaderTrackOutput(track: track, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false])
  r.add(o)
  let a = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 44100, AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 256_000])
  a.expectsMediaDataInRealTime = false
  writer.add(a)
  reader = r; readerOut = o; audio = a
}

guard writer.startWriting() else { print("writer: \(String(describing: writer.error))"); exit(1) }
writer.startSession(atSourceTime: .zero)
reader?.startReading()

let space = CGColorSpace(name: CGColorSpace.sRGB)!
var frame = 0, audioDone = audio == nil
for name in names {
  autoreleasepool {
    guard let src = CGImageSourceCreateWithURL(dir.appendingPathComponent(name) as CFURL, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return }
    while !video.isReadyForMoreMediaData { usleep(2000) }
    var pb: CVPixelBuffer? = nil
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
    guard let buf = pb else { return }
    CVPixelBufferLockBaseAddress(buf, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buf), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buf), space: space,
                        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
    CVPixelBufferUnlockBaseAddress(buf, [])
    adaptor.append(buf, withPresentationTime: CMTime(value: CMTimeValue(frame), timescale: fps))
    frame += 1
    // the sound is fed alongside, a little ahead of the picture, so neither input waits on the other
    while !audioDone, let a = audio, a.isReadyForMoreMediaData {
      if let sb = readerOut?.copyNextSampleBuffer() {
        let t = CMSampleBufferGetPresentationTimeStamp(sb).seconds
        a.append(sb)
        if t > Double(frame) / Double(fps) + 1.0 { break }
      } else { a.markAsFinished(); audioDone = true }
    }
  }
}
video.markAsFinished()
while !audioDone, let a = audio {
  if !a.isReadyForMoreMediaData { usleep(2000); continue }
  if let sb = readerOut?.copyNextSampleBuffer() { a.append(sb) } else { a.markAsFinished(); audioDone = true }
}
writer.endSession(atSourceTime: CMTime(value: CMTimeValue(frame), timescale: fps))
await writer.finishWriting()
if writer.status != .completed { print("failed: \(String(describing: writer.error))"); exit(1) }
let size = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? Int) ?? 0
print("wrote \(outURL.path): \(frame) frames at \(fps) fps, \(W)x\(H), \(size / 1_000_000) MB")
