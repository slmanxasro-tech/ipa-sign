import os
import shutil
import zipfile
import plistlib

def process_ipa(input_path: str, output_path: str, new_icon_path: str = None):
    extract_dir = input_path + "_extracted"
    if os.path.exists(extract_dir):
        shutil.rmtree(extract_dir)
    os.makedirs(extract_dir)

    # کردنەوەی IPA
    with zipfile.ZipFile(input_path, 'r') as zf:
        zf.extractall(extract_dir)

    payload_dir = os.path.join(extract_dir, "Payload")
    app_folder = next((os.path.join(payload_dir, d) for d in os.listdir(payload_dir) if d.endswith(".app")), None)
    
    if not app_folder:
        raise Exception("فۆڵدەری .app نەدۆزرایەوە.")

    # لابردنی پلاگین و واتچ ئەپ (بۆ کەمکردنەوەی قەبارە)
    for folder_to_remove in ["PlugIns", "Watch"]:
        path = os.path.join(app_folder, folder_to_remove)
        if os.path.exists(path):
            shutil.rmtree(path)

    # دەستکاریکردنی Info.plist
    plist_path = os.path.join(app_folder, "Info.plist")
    if os.path.exists(plist_path):
        with open(plist_path, 'rb') as f:
            plist_data = plistlib.load(f)
        
        plist_data['MinimumOSVersion'] = "10.0"
        plist_data.pop('UISupportedDevices', None)
        plist_data.pop('CFBundleURLTypes', None)
        plist_data['LSSupportsOpeningDocumentsInPlace'] = True
        plist_data['UIFileSharingEnabled'] = True

        with open(plist_path, 'wb') as f:
            plistlib.dump(plist_data, f)

    # گۆڕینی ئایکۆن ئەگەر هەبێت
    if new_icon_path and os.path.exists(new_icon_path):
        icon_dest = os.path.join(app_folder, "AppIcon60x60@2x.png")
        shutil.copy(new_icon_path, icon_dest)

    # لابردنی mobileprovision کۆن
    mobile_prov = os.path.join(app_folder, "embedded.mobileprovision")
    if os.path.exists(mobile_prov):
        os.remove(mobile_prov)

    # دروستکردنەوەی فایلی IPA
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf_out:
        for foldername, subfolders, filenames in os.walk(extract_dir):
            for filename in filenames:
                file_path = os.path.join(foldername, filename)
                arcname = os.path.relpath(file_path, extract_dir)
                zf_out.write(file_path, arcname)

    shutil.rmtree(extract_dir)
