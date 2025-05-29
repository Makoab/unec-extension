#unec-extension

UNEC Elektron Jurnal Viewer Chrome Extension
This Chrome extension provides a convenient way to view your UNEC (Azerbaijan State University of Economics) Elektron Jurnal (Electronic Journal) course information directly from your browser popup, without needing to navigate through the UNEC portal. It fetches and displays key details for each course, including grades and attendance.

✨ Features
Dynamic Year & Semester Selection: Automatically fetches and populates the latest academic years and semesters directly from the UNEC portal, ensuring you always have up-to-date options.

Detailed Course Information: Displays comprehensive data for each course:

Fənn Adı (Course Name)

Kredit (Credits)

Kollokvium orta balı (Midterm Average Score)

Seminarın orta balı (Seminar Average Score)

Yekun (Current Assessment / Final Score)

Qaib faizi (Absence Percentage)

Qaib Sayı (Calculated Number of Absences based on credits and absence percentage)

Total Credits Calculation: Shows the sum of credits for all displayed courses.

Persistent Selections: Remembers your last selected academic year and semester.

Error Handling: Provides clear messages if data fetching fails or courses are not found.

Lightweight and Efficient: Utilizes Chrome's Offscreen Documents for background data fetching, keeping the main browser process smooth.

🚀 Installation
To install this extension, you'll need to load it as an "unpacked" extension in Chrome.

Download the Extension Files: Get all the extension files (including manifest.json, popup.html, popup.js, background.js, offscreen.html, offscreen.js, and your icon files like icon16.png, icon48.png, icon128.png) and place them in a single, dedicated folder on your computer.

Open Chrome Extensions Page:

Open your Chrome browser.

Type chrome://extensions into the address bar and press Enter.

Enable Developer Mode:

In the top-right corner of the Extensions page, toggle on the "Developer mode" switch.

Load Unpacked Extension:

Click the "Load unpacked" button that appears.

Navigate to the folder where you saved your extension files and select that folder.

Pin the Extension (Optional but Recommended):

Once loaded, the extension will appear in your list.

Click the puzzle piece icon (Extensions icon) in your Chrome toolbar.

Find "UNEC Elektron Jurnal Viewer" and click the pin icon next to it. This will make the extension icon visible in your toolbar for easy access.

📖 Usage
Click the Extension Icon: Click the "UNEC Elektron Jurnal Viewer" icon (your custom icon, or the default "U" if not set) in your Chrome toolbar.

Select Academic Year: The "Tədris ili" (Academic Year) dropdown will automatically populate with available years. Select the desired academic year.

Select Semester: After selecting an academic year, the "Semestr" (Semester) dropdown will populate with semesters specific to that year. Select your desired semester.

View Data: Click the "Məlumatları Göstər" (Show Data) button.

Results: The extension will fetch and display your course information in a table, along with the calculated "Ümumi Kredit" (Total Credits).

⚠️ Troubleshooting
"Error fetching and populating options: TypeError: Cannot read properties of undefined (reading 'success')" or similar errors:

This often means the extension couldn't fetch the year/semester options from the UNEC portal.

Solution: Ensure you are logged in to kabinet.unec.edu.az in the same Chrome profile where you are using the extension. The extension relies on your active session cookies to access the data.

Solution: Reload the extension from chrome://extensions after ensuring you are logged in.

"Heç bir kurs məlumatı tapılmadı." (No course information found):

This could mean there are no courses for the selected year/semester, or the extension couldn't parse the course list correctly.

Solution: Verify that you are logged into UNEC and that courses are visible for the selected year/semester on the actual UNEC portal.

Extension icon is a "U" letter:

This means your custom icon files are either missing, incorrectly named, or have incorrect dimensions.

Solution: Ensure icon16.png (16x16), icon48.png (48x48), and icon128.png (128x128) are all in the same root directory as your manifest.json and are valid PNG files. Reload the extension.

📄 License
This project is open-source and available under the MIT License.
