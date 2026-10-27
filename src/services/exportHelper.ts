/**
 * Universal file saver and downloader for Electron Desktop and Browser environments.
 * Converts Data URLs into Blobs with Object URLs to prevent browsers from opening "Save Page As" or blank pages.
 */
export async function saveOrDownloadFile({
  dataUrl,
  defaultName,
  format,
}: {
  dataUrl: string;
  defaultName: string;
  format: 'jpg' | 'jpeg' | 'png' | 'webp' | 'pdf' | 'ppsp';
}): Promise<{ success: boolean; filePath?: string; canceled?: boolean; verifiedBytes?: number; error?: string }> {
  try {
    // 1. If running in native Electron Desktop app, use native file system via secure IPC
    const electronAPI = (window as any).electronAPI;
    const normalizedFormat: 'pdf' | 'png' | 'jpg' | 'webp' =
      format === 'pdf' ? 'pdf' : format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpg';

    if (electronAPI && typeof electronAPI.saveExport === 'function') {
      const res = await electronAPI.saveExport({
        dataBase64: dataUrl,
        defaultName,
        format: normalizedFormat,
      });

      if (res && res.success) {
        return { success: true, filePath: res.filePath, verifiedBytes: res.verifiedBytes };
      }
      if (res && res.canceled) {
        return { success: false, canceled: true };
      }
    }

    // 2. Reliable Browser / Webview fallback:
    // Convert Base64 / DataURL to a real binary Blob
    // This strictly avoids Chrome/Edge opening a "Save As Page" (data: navigation blocked)
    const blob = dataUrlToBlob(dataUrl, format);
    const blobUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.style.position = 'fixed';
    anchor.style.left = '-9999px';
    anchor.style.top = '-9999px';
    anchor.style.opacity = '0';
    anchor.href = blobUrl;
    anchor.download = defaultName;

    document.body.appendChild(anchor);
    anchor.click();

    // Clean up DOM and memory
    setTimeout(() => {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(blobUrl);
    }, 500);

    return { success: true, verifiedBytes: blob.size };
  } catch (err: any) {
    console.error('File save/download error:', err);
    return { success: false, error: err.message || 'Failed to save file' };
  }
}

/**
 * Converts a data URL to a binary Blob
 */
export function dataUrlToBlob(dataUrl: string, format?: string): Blob {
  // If already a Blob or blob URL, return appropriate
  if (dataUrl.startsWith('blob:')) {
    throw new Error('Already a blob URL');
  }

  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    // Plain text or JSON
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
