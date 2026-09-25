const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const plist = require('plist');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/modify-ipa', upload.fields([{ name: 'ipa', maxCount: 1 }, { name: 'icon', maxCount: 1 }]), (req, res) => {
    if (!req.files || !req.files.ipa) {
        return res.status(400).send('تکایە فایلی IPA بنێرە.');
    }

    const ipaFile = req.files.ipa[0];
    const iconFile = req.files.icon ? req.files.icon[0] : null;
    const workDir = path.join(__dirname, 'temp_' + Date.now());
    
    try {
        fs.mkdirSync(workDir);
        const zip = new AdmZip(ipaFile.path);
        zip.extractAllTo(workDir, true);

        const payloadDir = path.join(workDir, 'Payload');
        if (!fs.existsSync(payloadDir)) {
            throw new Error('فۆڵدەری Payload لەناو IPA نەدۆزرایەوە.');
        }

        const appSubDirs = fs.readdirSync(payloadDir);
        const appFolder = appSubDirs.find(d => d.endsWith('.app'));
        if (!appFolder) {
            throw new Error('فۆڵدەری .app نەدۆزرایەوە.');
        }

        const appPath = path.join(payloadDir, appFolder);

        // ۱. لابردنی PlugIns و Watch بۆ کەمکردنەوەی قەبارە و پاراستن
        const pluginsPath = path.join(appPath, 'PlugIns');
        const watchPath = path.join(appPath, 'Watch');
        if (fs.existsSync(pluginsPath)) fs.rmSync(pluginsPath, { recursive: true, force: true });
        if (fs.existsSync(watchPath)) fs.rmSync(watchPath, { recursive: true, force: true });

        // ۲. دەستکاریکردنی Info.plist (MinimumOSVersion و سڕینەوەی UISupportedDevices و URLSchemes)
        const plistPath = path.join(appPath, 'Info.plist');
        if (fs.existsSync(plistPath)) {
            const plistContent = fs.readFileSync(plistPath, 'utf8');
            let plistData;
            try {
                plistData = plist.parse(plistContent);
            } catch (e) {
                // ئەگەر בינاری بوو دەتوانرێت بە کتابخانەی تر بخوێنرێتەوە، لێرەدا دەخەینە سەر فۆرماتی ئاسایی
            }

            if (plistData) {
                plistData.MinimumOSVersion = "10.0";
                delete plistData.UISupportedDevices;
                delete plistData.CFBundleURLTypes;
                plistData.LSSupportsOpeningDocumentsInPlace = true;
                plistData.UIFileSharingEnabled = true;

                fs.writeFileSync(plistPath, plist.build(plistData));
            }
        }

        // ۳. گۆڕینی ئایکۆن (بۆ چارەسەرکردنی کێشەی سپی بوونی ئایکۆن)
        if (iconFile) {
            const iconDest = path.join(appPath, 'AppIcon60x60@2x.png');
            fs.copyFileSync(iconFile.path, iconDest);
        }

        // ۴. لابردنی mobileprovision کۆن
        const mobileProv = path.join(appPath, 'embedded.mobileprovision');
        if (fs.existsSync(mobileProv)) {
            fs.unlinkSync(mobileProv);
        }

        // ۵. دروستکردنەوەی فایلی نوێی IPA
        const newZip = new AdmZip();
        newZip.addLocalFolder(workDir);
        const outputIpaName = 'modified_' + ipaFile.originalname;
        const outputPath = path.join(__dirname, outputIpaName);
        newZip.writeZip(outputPath);

        // ڕەوانەکردنەوەی فایل بۆ بەکارهێنەر
        res.download(outputPath, outputIpaName, (err) => {
            // پاککردنەوەی فایلە کاتییەکان پاش ناردن
            try {
                fs.rmSync(workDir, { recursive: true, force: true });
                fs.unlinkSync(ipaFile.path);
                if (iconFile) fs.unlinkSync(iconFile.path);
                fs.unlinkSync(outputPath);
            } catch (e) {}
        });

    } catch (error) {
        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
