# Google Play Store Submission Guide & Assets
## Passport Photo Studio Pro (Android Edition)

इस गाइड में आपके **Android मोबाइल ऐप** को **Google Play Store (Google Play Console)** पर लाइव करने की पूरी जानकारी और आवश्यक टेक्स्ट दिए गए हैं।

---

## 📦 1. तैयार Android पैकेज फाइल्स (Release Files)

सभी फाइल्स आपके कंप्यूटर के इस फोल्डर में सुरक्षित रखी गई हैं:  
📂 **`C:\Google Antigravity\passport-photo-studio-pro\release\android`**

| फाइल का नाम | प्रारूप (Format) | उद्देश्य (Purpose) | साइज़ |
|:---|:---:|:---|:---:|
| **`PassportPhotoStudioPro.aab`** | **.AAB** | **Google Play Console पर अपलोड करने के लिए** (Google Play Store के लिए अनिवार्य बंडल) | ~3.31 MB |
| **`PassportPhotoStudioPro.apk`** | **.APK** | **अपने या किसी भी Android फोन पर डायरेक्ट इंस्टॉल करने के लिए** (Direct Testing) | ~3.44 MB |
| **`playstore_icon_512x512.png`** | PNG | **Play Store App Icon** (512 × 512 px, 32-bit) | ~195 KB |
| **`playstore_feature_graphic_1024x500.png`** | PNG | **Play Store Feature Graphic** (1024 × 500 px) | ~312 KB |
| **`passport_release.keystore`** | Keystore | **ऐप का डिजिटल हस्ताक्षर सर्टिफिकेट** (Play Store Signing Key) | 2.79 KB |

---

## 🔑 2. Keystore Signing Credentials (सुरक्षित रखें)

यह कीस्टोर आपके ऐप को डिजिटली साइन करने के लिए तैयार किया गया है:
* **Keystore File:** `android/app/passport_release.keystore`
* **Alias Name:** `passportstudio`
* **Keystore Password:** `PassportStudio2026`
* **Key Password:** `PassportStudio2026`
* **Validity:** 10,000 Days (~27 वर्ष)

---

## 📱 3. Play Store Listing Content (सीधे कॉपी-पेस्ट करें)

### A. App Name / Title (अधिकतम 30 अक्षर):
```text
Passport Photo Studio Pro
```

### B. Short Description (अधिकतम 80 अक्षर):
```text
Passport, Visa & ID photo maker, document scanner & target KB photo resizer.
```

### C. Full Description (विस्तृत विवरण):
```text
Passport Photo Studio Pro is a fast, powerful, and 100% offline mobile workstation to create biometric passport photos, scan documents with 4-corner perspective correction, and resize photos/PDFs to exact KB requirements for online exam forms.

🚀 THREE POWERFUL STUDIOS IN ONE MOBILE APP:

1. PASSPORT & VISA PHOTO STUDIO
• Official passport and visa presets: 35×45 mm (India, UK, Schengen, Singapore), 2×2 inch / 51×51 mm (US Visa, OCI, PAN card), 30×40 mm, and custom sizes.
• Biometric face alignment guidelines (chin, eye line, and crown).
• Studio background enhancement (Pure White, Studio Off-White, Light Blue, Light Grey).
• Print sheet maker: Automatically arrange 8 photos on standard 4×6" photo paper or bulk photos on A4 sheet with cutting lines.
• Save directly to phone gallery or share via WhatsApp/Email.

2. DOCUMENT SCANNER STUDIO
• 4-Corner perspective warp with 8-parameter homography: Straighten skewed camera photos into flat, rectangular, scanner-quality documents.
• Smart filters: Crisp Black & White, Grayscale, Color Boost, Magic Contrast, and Invert.
• Dual-page A4 Front + Back ID layout: Place Aadhaar, PAN card, or Driving License front and back side-by-side on a single printable sheet.
• One-click export to clean multi-page PDF documents.

3. PHOTO & DOCUMENT RESIZER PRO
• Target KB Compression: Compress any photo or signature to exact sizes (e.g. Under 50 KB, 20 KB to 50 KB, or 100 KB) with smart binary search optimization.
• 0% to 100% Quality Slider with live, verified byte calculations (1 KiB = 1024 B).
• Manual crop tool with 8 drag handles, zoom controls, and aspect ratio presets.
• Ready-made Indian recruitment exam presets: SSC CGL/CHSL, UPSC, IBPS Bank PO/Clerk, State PSCs, Railway RRB, and NTA NEET/JEE.
• PDF Document Resizer & Compressor with structural reload validation.

🔒 100% PRIVACY & SECURITY GUARANTEE:
All image processing, biometric cropping, perspective transformations, and PDF conversions happen strictly offline on your mobile device. No photos, scans, or documents are ever uploaded to any cloud server. Works completely without an active internet connection.
```

---

## 🛡️ 4. Data Safety (डेटा सुरक्षा) फॉर्म के उत्तर:
Google Play Console पर जब "Data safety" फॉर्म आएगा:
* **Does your app collect or share any user data?** ➔ **`No`**
* **Does your app use third-party analytics/trackers?** ➔ **`No`**
* **Is all data processed locally on the user's device?** ➔ **`Yes`**

---

## 📋 5. Play Console पर अपलोड करने के चरण (Step-by-Step):

1. **[play.google.com/console](https://play.google.com/console)** पर अपने Google Play Developer Account से लॉगिन करें।
2. **"Create app"** पर क्लिक करें:
   * **App name:** `Passport Photo Studio Pro`
   * **Default language:** `English (United States)` या `Hindi`
   * **App or game:** `App`
   * **Free or paid:** `Free`
3. **Dashboard ➔ Set up your app:**
   * **Privacy policy URL:** `https://github.com/kkrkishan/passport-photo-studio-pro/blob/main/PRIVACY.md`
   * **App access:** `All functionality is available without special access` (क्योंकि ऐप में कोई लॉगिन/पासवर्ड नहीं है)।
   * **Ads:** `No, my app does not contain ads`
   * **Target audience:** `18 and over` (या `13+ / All ages`)
   * **News app:** `No`
   * **COVID-19 app:** `No`
   * **Data safety:** ऊपर दिए गए अनुसार **"No data collected"** चुनें।
   * **Category:** `Photography` (या `Tools`)
4. **Main Store Listing (ग्राफिक्स व टेक्स्ट):**
   * Description, Short Description ऊपर से पेस्ट करें।
   * **App icon:** `release/android/playstore_icon_512x512.png` अपलोड करें।
   * **Feature graphic:** `release/android/playstore_feature_graphic_1024x500.png` अपलोड करें।
   * **Phone screenshots:** अपने फोन से या ऐप के 4-6 स्क्रीनशॉट्स अपलोड करें।
5. **Create & Roll out Release:**
   * **Production** (या Internal Testing) ➔ **"Create new release"** पर क्लिक करें।
   * **App bundles:** ड्रैग & ड्रॉप करें `release/android/PassportPhotoStudioPro.aab`!
   * Release notes में लिखें: `Initial official release of Passport Photo Studio Pro`.
   * **"Save"** और **"Review release"** दबाकर **"Start rollout to Production"** पर क्लिक करें!
