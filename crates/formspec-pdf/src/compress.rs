//! Stream compression for PDF content and appearance streams.
//!
//! Uses zlib (RFC 1950) compression as required by PDF's `/FlateDecode` filter.
//! Raw deflate (RFC 1951) is not sufficient — the PDF spec mandates the zlib wrapper.

use flate2::Compression;
use flate2::write::ZlibEncoder;
use std::io::Write;

/// Compress data using zlib for use with PDF `/FlateDecode` filter.
///
/// Returns the compressed bytes. If the input is too small to benefit from
/// compression (< 64 bytes), returns the input unchanged and the caller
/// should not set the FlateDecode filter.
pub fn zlib_compress(data: &[u8]) -> CompressResult {
    /// Streams shorter than this threshold are not worth compressing —
    /// the zlib header overhead can make them larger.
    const MIN_COMPRESS_LEN: usize = 64;

    if data.len() < MIN_COMPRESS_LEN {
        return CompressResult::Uncompressed(data.to_vec());
    }

    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    // Write cannot realistically fail on a Vec<u8> sink.
    encoder.write_all(data).expect("zlib write to Vec failed");
    let compressed = encoder.finish().expect("zlib finish failed");

    // Only use compression if it actually shrinks the data
    if compressed.len() < data.len() {
        CompressResult::Compressed(compressed)
    } else {
        CompressResult::Uncompressed(data.to_vec())
    }
}

/// Result of a compression attempt — either compressed or left as-is.
pub enum CompressResult {
    Compressed(Vec<u8>),
    Uncompressed(Vec<u8>),
}

impl CompressResult {
    /// Whether the data was actually compressed.
    pub fn is_compressed(&self) -> bool {
        matches!(self, Self::Compressed(_))
    }

    /// Get the (possibly compressed) bytes.
    pub fn as_bytes(&self) -> &[u8] {
        match self {
            Self::Compressed(b) | Self::Uncompressed(b) => b,
        }
    }
}
