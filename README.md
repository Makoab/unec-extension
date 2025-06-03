# UNEC Elektron Jurnal Viewer

A Chrome extension that provides convenient access to your UNEC (Azerbaijan State University of Economics) Elektron Jurnal course information directly from your browser, without navigating through the UNEC portal.

![Extension Version](https://img.shields.io/badge/version-1.0-blue)
![Chrome Extension](https://img.shields.io/badge/platform-Chrome-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

## 🌟 Features

### 📊 Comprehensive Course Information
- **Fənn Adı** (Course Name)
- **Kredit** (Credits)
- **Kollokvium orta balı** (Midterm Average Score)
- **Seminarın orta balı** (Seminar Average Score)
- **Giriş balı** (Current Assessment)
- **Qaib faizi** (Absence Percentage)
- **Qaib Sayı** (Calculated Absences based on credits and percentage)

### 🔄 Smart Functionality
- **Dynamic Year & Semester Selection**: Automatically fetches latest academic periods
- **Total Credits Calculation**: Shows sum of credits for all courses
- **Persistent Selections**: Remembers your last chosen year and semester
- **Error Handling**: Clear messages for data fetching issues
- **Lightweight Performance**: Uses Chrome's Offscreen Documents for efficient background processing

## 🚀 Installation

### Prerequisites
- Google Chrome browser
- Active UNEC student account with access to kabinet.unec.edu.az

### Steps

1. **Download the Extension**
   ```
   git clone https://github.com/Makoab/unec-extension.git
   ```
   Or download as ZIP and extract to a folder

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)

3. **Load the Extension**
   - Click **Load unpacked**
   - Select the folder containing the extension files
   - The extension will appear in your extensions list

4. **Pin for Easy Access** (Recommended)
   - Click the puzzle piece icon in Chrome toolbar
   - Find "UNEC Elektron Jurnal Viewer"
   - Click the pin icon to add to toolbar

## 📖 Usage

1. **Login to UNEC Portal**
   - Ensure you're logged in to `kabinet.unec.edu.az` in the same Chrome profile

2. **Open Extension**
   - Click the extension icon in your Chrome toolbar

3. **Select Academic Period**
   - Choose **Tədris ili** (Academic Year) from dropdown
   - Select **Semestr** (Semester) from the populated options

4. **View Your Data**
   - Click **Məlumatları Göstər** (Show Data)
   - View your course information in the organized table
   - Check the **Ümumi Kredit** (Total Credits) summary

## 🛠️ File Structure

```
unec-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main interface
├── popup.js              # Popup functionality
├── background.js         # Background service worker
├── offscreen.html        # Offscreen document
├── offscreen.js          # Background data fetching
└── icons/               
    ├── icon16.png        # 16x16 icon
    ├── icon32.png        # 32x32 icon
    ├── icon48.png        # 48x48 icon
    └── icon128.png       # 128x128 icon  
```

## 🔧 Troubleshooting

### "Heç bir il və ya semestr seçimi tapılmadı"
**Issue**: Cannot fetch year/semester options

**Solutions**:
- Ensure you're logged in to `kabinet.unec.edu.az`
- Use the same Chrome profile for both login and extension
- Reload the extension from `chrome://extensions/`

### "Heç bir kurs məlumatı tapılmadı"
**Issue**: No course information found

**Solutions**:
- Verify login status on UNEC portal
- Check if courses are visible for selected year/semester
- Ensure the selected academic period has enrolled courses

### Extension shows "U" icon
**Issue**: Custom icons not loading

**Solutions**:
- Verify icon files are in correct directory
- Check icon dimensions: 16x16, 48x48, 128x128 pixels
- Ensure files are named correctly: `icon16.png`, `icon48.png`, `icon128.png`
- Reload extension after fixing icons

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you encounter any issues or have questions:
- Create an issue on [GitHub Issues](https://github.com/Makoab/unec-extension/issues)
- Check the troubleshooting section above
- Ensure you're following the installation steps correctly

## 🎯 Roadmap

- [ ] Add grade statistics and analytics
- [ ] Support for multiple semesters comparison
- [ ] Export functionality for course data
- [ ] Dark mode theme
- [ ] Mobile-responsive design improvements

---

**Note**: This extension is not officially affiliated with UNEC. It's a student-developed tool to enhance the user experience of accessing academic information.
