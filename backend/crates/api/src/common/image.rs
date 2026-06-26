//! Shared raster-image utilities: format sniffing by magic bytes.
//!
//! Detection only (deterministic, dependency-free). Metadata *stripping* is a
//! swappable concern and lives behind
//! [`MetadataStripper`](crate::providers::MetadataStripper), not here.

/// Detected raster image format: canonical MIME plus storage extension.
///
/// Carries both so a call site does not duplicate the lookup table: the `ext`
/// fields drive any sibling-extension sweep (e.g. avatar re-upload cleanup).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ImageKind {
    /// Canonical IANA MIME type, used as the storage `Content-Type` and the
    /// cross-check against a client-supplied header.
    pub mime: &'static str,
    /// Storage-key extension (no leading dot).
    pub ext: &'static str,
}

impl ImageKind {
    /// PNG.
    pub const PNG: Self = Self {
        mime: "image/png",
        ext: "png",
    };
    /// JPEG.
    pub const JPEG: Self = Self {
        mime: "image/jpeg",
        ext: "jpg",
    };
    /// WebP.
    pub const WEBP: Self = Self {
        mime: "image/webp",
        ext: "webp",
    };
}

/// Sniffs the leading bytes of `payload` and returns the detected image kind,
/// or `None` if it matches no whitelisted format.
///
/// The sniff is intentionally minimal:
///
/// - PNG: 8-byte signature `89 50 4E 47 0D 0A 1A 0A`.
/// - JPEG: 3-byte SOI `FF D8 FF` (covers JFIF, EXIF, and bare-JFIF variants).
/// - WebP: 12-byte composite (`RIFF` + 4-byte size + `WEBP`); the `RIFF` prefix
///   alone collides with AVI/WAV, so the second tag is what pins the format.
///
/// Returning `None` is the only failure mode; callers map it to 415. Trusting
/// the bytes rather than a client MIME header blocks MIME-spoofing (claiming
/// `image/png` while sending an executable).
#[inline]
#[must_use]
pub fn sniff_image_kind(payload: &[u8]) -> Option<ImageKind> {
    const PNG_MAGIC: [u8; 8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    const JPEG_MAGIC: [u8; 3] = [0xFF, 0xD8, 0xFF];

    if payload.len() >= PNG_MAGIC.len() && payload[..PNG_MAGIC.len()] == PNG_MAGIC {
        return Some(ImageKind::PNG);
    }
    if payload.len() >= JPEG_MAGIC.len() && payload[..JPEG_MAGIC.len()] == JPEG_MAGIC {
        return Some(ImageKind::JPEG);
    }
    if payload.len() >= 12 && &payload[0..4] == b"RIFF" && &payload[8..12] == b"WEBP" {
        return Some(ImageKind::WEBP);
    }
    None
}
