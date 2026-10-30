import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Universal photo capturer.
 * On Android/iOS Mobile: Opens native camera with hardware focus/flash and asks for camera permission.
 * On Desktop/Web: Falls back to built-in Webcam modal.
 */
export async function capturePhotoOrWebcam({
  onPhotoCaptured,
  openWebcamModal,
}: {
  onPhotoCaptured: (dataUrl: string) => void;
  openWebcamModal: () => void;
}): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      // Use phone's native camera with max quality
      const photo = await Camera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
      });

      if (photo && photo.dataUrl) {
        onPhotoCaptured(photo.dataUrl);
      }
    } catch (err: any) {
      console.warn('Native camera capture cancelled or failed:', err);
      // If user cancelled, don't popup modal, but if permission error or other, fall back
      const msg = err?.message || '';
      if (!msg.toLowerCase().includes('cancel')) {
        openWebcamModal();
      }
    }
  } else {
    // Desktop / Web browser
    openWebcamModal();
  }
}
