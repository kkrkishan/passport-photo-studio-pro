package com.kkrkishan.passportphotostudio;

import android.content.ContentValues;
import android.content.Context;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "MediaStoreSaver")
public class MediaStoreSaverPlugin extends Plugin {

    @PluginMethod
    public void saveImageToGallery(PluginCall call) {
        String base64Data = call.getString("base64");
        String fileName = call.getString("fileName", "PassportPhoto_" + System.currentTimeMillis() + ".jpg");
        String format = call.getString("format", "jpg");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("No image data provided");
            return;
        }

        // Strip data:image/...;base64, header if present
        if (base64Data.contains(",")) {
            base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
        }

        try {
            byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();
            String mimeType = "image/png".equalsIgnoreCase(format) || (fileName != null && fileName.endsWith(".png"))
                    ? "image/png"
                    : "image/jpeg";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+) Scoped Storage in Pictures/PassportPhotoStudio
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, mimeType);
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/PassportPhotoStudio");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);

                Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                Uri itemUri = context.getContentResolver().insert(collection, values);

                if (itemUri == null) {
                    call.reject("Could not create MediaStore entry for image");
                    return;
                }

                try (OutputStream out = context.getContentResolver().openOutputStream(itemUri)) {
                    if (out != null) {
                        out.write(imageBytes);
                        out.flush();
                    }
                }

                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                context.getContentResolver().update(itemUri, values, null, null);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("filePath", "Gallery / Pictures/PassportPhotoStudio/" + fileName);
                ret.put("uri", itemUri.toString());
                ret.put("bytes", imageBytes.length);
                call.resolve(ret);
            } else {
                // Android 9 and below
                File picturesDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "PassportPhotoStudio");
                if (!picturesDir.exists()) {
                    picturesDir.mkdirs();
                }
                File outFile = new File(picturesDir, fileName);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(imageBytes);
                    fos.flush();
                }

                MediaScannerConnection.scanFile(context, new String[]{outFile.getAbsolutePath()}, new String[]{mimeType}, null);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("filePath", outFile.getAbsolutePath());
                ret.put("uri", Uri.fromFile(outFile).toString());
                ret.put("bytes", imageBytes.length);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Failed to save image to Gallery: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void savePdfToDownloads(PluginCall call) {
        String base64Data = call.getString("base64");
        String fileName = call.getString("fileName", "PassportPhotoSheet_" + System.currentTimeMillis() + ".pdf");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("No PDF data provided");
            return;
        }

        if (base64Data.contains(",")) {
            base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
        }

        try {
            byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Context context = getContext();
            String mimeType = "application/pdf";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+) Scoped Storage in Download/PassportPhotoStudio
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/PassportPhotoStudio");
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                Uri itemUri = context.getContentResolver().insert(collection, values);

                if (itemUri == null) {
                    call.reject("Could not create MediaStore entry for PDF");
                    return;
                }

                try (OutputStream out = context.getContentResolver().openOutputStream(itemUri)) {
                    if (out != null) {
                        out.write(pdfBytes);
                        out.flush();
                    }
                }

                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                context.getContentResolver().update(itemUri, values, null, null);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("filePath", "Downloads / PassportPhotoStudio/" + fileName);
                ret.put("uri", itemUri.toString());
                ret.put("bytes", pdfBytes.length);
                call.resolve(ret);
            } else {
                // Android 9 and below
                File dlDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "PassportPhotoStudio");
                if (!dlDir.exists()) {
                    dlDir.mkdirs();
                }
                File outFile = new File(dlDir, fileName);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(pdfBytes);
                    fos.flush();
                }

                MediaScannerConnection.scanFile(context, new String[]{outFile.getAbsolutePath()}, new String[]{mimeType}, null);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("filePath", outFile.getAbsolutePath());
                ret.put("uri", Uri.fromFile(outFile).toString());
                ret.put("bytes", pdfBytes.length);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Failed to save PDF to Downloads: " + e.getMessage(), e);
        }
    }
}
