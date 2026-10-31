/**
 * Universal file saver and downloader for Electron Desktop, Android Mobile (Gallery & Downloads via MediaStore), and Browser environments.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Register native Android MediaStore plugin
const MediaStoreSaver = registerPlugin<{
  saveImageToGallery: (options: { base64: string; fileName: string; format?: string }) => Promise<{ success: boolean; filePath: string; uri: string; bytes: number }>;
  savePdfToDownloads: (options: { base64: string; fileName: string }) => Promise<{ success: boolean; filePath: string; uri: string; bytes: number }>;
}>('MediaStoreSaver');

/**
 * Universal File Naming Rule:
 * Attaches timestamp in format YYYYMMDD_HHMMSS (e.g. 20261031_204512) to filename before extension.
 * This guarantees unique filenames and eliminates "File already exists" errors.
 */
export function attachTimestampToFileName(fileName: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  // If filename already has a timestamp like _\d{8}_\d{6}, don't duplicate
  if (/_\d{8}_\d{6}(\.[a-zA-Z0-9]+)?$/.test(fileName)) {
    return fileName;
  }

  const lastDot = fileName.lastIndexOf('.');
  if (lastDot > 0) {
    const base = fileName.substring(0, lastDot);
    const ext = fileName.substring(lastDot);
    return `${base}_${timestamp}${ext}`;
  }
  return `${fileName}_${timestamp}`;
}

export async function saveOrDownloadFile({
  dataUrl,
  defaultName,
  format,
  sharePrompt = false,
}: {
  dataUrl: string;
  defaultName: string;
  format: 'jpg' | 'jpeg' | 'png' | 'webp' | 'pdf' | 'ppsp';
  sharePrompt?: boolean;
}): Promise<{ success: boolean; filePath?: string; canceled?: boolean; verifiedBytes?: number; error?: string }> {
  try {
    const normalizedFormat: 'pdf' | 'png' | 'jpg' | 'webp' =
      format === 'pdf' ? 'pdf' : format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpg';

    // Apply Universal Timestamp Rule to ensure unique filenames without collisions
    const timeStampedName = attachTimestampToFileName(defaultName);

    // Clean base64 string safely (extract everything after the comma)
    const cleanBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

    // 1. If running in native Electron Desktop app, use native file system via secure IPC
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.saveExport === 'function') {
      const res = await electronAPI.saveExport({
        dataBase64: `data:${normalizedFormat === 'pdf' ? 'application/pdf' : `image/${normalizedFormat}`};base64,${cleanBase64}`,
        defaultName: timeStampedName,
        format: normalizedFormat,
      });

      if (res && res.success) {
        return { success: true, filePath: res.filePath, verifiedBytes: res.verifiedBytes };
      }
      if (res && res.canceled) {
        return { success: false, canceled: true };
      }
    }

    // 2. If running on Mobile (Capacitor Android / iOS)
    if (Capacitor.isNativePlatform()) {
      // A. Try native MediaStoreSaver first (saves directly to Gallery for images, Downloads for PDFs)
      try {
        if (normalizedFormat === 'pdf') {
          const res = await MediaStoreSaver.savePdfToDownloads({
            base64: cleanBase64,
            fileName: timeStampedName,
          });
          if (res && res.success) {
            if (sharePrompt && res.uri) {
              try {
                await Share.share({
                  title: timeStampedName,
                  text: 'PDF exported from Passport Photo Studio Pro',
                  url: res.uri,
                  dialogTitle: `Share or Open ${timeStampedName}`,
                });
              } catch (shareErr) {
                // Ignore share cancellation
              }
            }
            return {
              success: true,
              filePath: res.filePath || `Downloads / ${timeStampedName}`,
              verifiedBytes: res.bytes,
            };
          }
        } else {
          // Image: Save directly to Android Gallery (Pictures/PassportPhotoStudio)
          const res = await MediaStoreSaver.saveImageToGallery({
            base64: cleanBase64,
            fileName: timeStampedName,
            format: normalizedFormat,
          });
          if (res && res.success) {
            if (sharePrompt && res.uri) {
              try {
                await Share.share({
                  title: timeStampedName,
                  text: 'Photo saved to Gallery from Passport Photo Studio Pro',
                  url: res.uri,
                  dialogTitle: `Share ${timeStampedName}`,
                });
              } catch (shareErr) {
                // Ignore share cancellation
              }
            }
            return {
              success: true,
              filePath: res.filePath || `Gallery / Pictures/PassportPhotoStudio / ${timeStampedName}`,
              verifiedBytes: res.bytes,
            };
          }
        }
      } catch (mediaStoreErr) {
        console.warn('MediaStoreSaver failed, falling back to Filesystem plugin:', mediaStoreErr);
      }

      // B. Fallback: Use @capacitor/filesystem to write to Documents / Downloads
      try {
        const targetDir = Directory.Documents;
        const writeRes = await Filesystem.writeFile({
          path: `PassportPhotoStudio/${timeStampedName}`,
          data: cleanBase64,
          directory: targetDir,
          recursive: true,
        });

        if (writeRes && writeRes.uri) {
          try {
            await Share.share({
              title: timeStampedName,
              text: `Saved to phone storage: ${timeStampedName}`,
              url: writeRes.uri,
              dialogTitle: `Save or Share ${timeStampedName}`,
            });
          } catch (e) {
            // Ignore
          }
          return {
            success: true,
            filePath: `Documents / PassportPhotoStudio / ${timeStampedName}`,
          };
        }
      } catch (fsErr: any) {
        console.error('Capacitor Filesystem fallback also failed:', fsErr);
      }
    }

    // 3. Reliable Browser / Webview fallback:
    // Convert Base64 / DataURL to a real binary Blob
    const blob = dataUrlToBlob(dataUrl, format);
    const blobUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.style.position = 'fixed';
    anchor.style.left = '-9999px';
    anchor.style.top = '-9999px';
    anchor.style.opacity = '0';
    anchor.href = blobUrl;
    anchor.download = timeStampedName;

    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    return { success: true, verifiedBytes: blob.size, filePath: timeStampedName };
  } catch (err: any) {
    console.error('File save/download error:', err);
    return { success: false, error: err.message || 'Failed to save file' };
  }
}

/**
 * Converts a data URL to a binary Blob
 */
export function dataUrlToBlob(dataUrl: string, format?: string): Blob {
  if (dataUrl.startsWith('blob:')) {
    throw new Error('Already a blob URL');
  }

  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    return new Blob([dataUrl], { type: 'application/json' });
  }

  const header = parts[0];
  const base64Data = parts[1];

  let mimeType = 'image/jpeg';
  const match = header.match(/:(.*?);/);
  if (match && match[1]) {
    mimeType = match[1];
  } else if (format === 'png') {
    mimeType = 'image/png';
  } else if (format === 'webp') {
    mimeType = 'image/webp';
  } else if (format === 'pdf') {
    mimeType = 'application/pdf';
  }

  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}
