chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target === 'offscreen') {
        if (request.action === 'getAcademicYears') {
            console.log('[OFFSCREEN] Received getAcademicYears request');
            fetchAcademicYearOptions()
                .then(data => {
                    console.log('[OFFSCREEN] Academic years fetched successfully:', data.success);
                    sendResponse(data);
                })
                .catch(error => {
                    console.error('[OFFSCREEN] Error fetching academic years (promise chain):', error);
                    sendResponse({ success: false, error: error.message || 'Bilinməyən xəta (tədris illəri)' });
                });
            return true;
        } else if (request.action === 'getSemesters') {
            // ... (getSemesters logic remains the same as your previous version) ...
            console.log('[OFFSCREEN] Received getSemesters request for eduYear:', request.eduYear);
            fetchSemesterOptions(request.eduYear)
                .then(data => {
                    console.log('[OFFSCREEN] Semesters fetched successfully for eduYear:', request.eduYear, data.success);
                    sendResponse(data);
                })
                .catch(error => {
                    console.error('[OFFSCREEN] Error fetching semesters:', error);
                    sendResponse({
                        success: false,
                        error: error.message || 'Bilinməyən xəta baş verdi (semestrlər)'
                    });
                });
            return true;
        } else if (request.action === 'fetchData') {
            // ... (fetchData logic remains the same as your previous version) ...
            console.log('[OFFSCREEN] Received fetchData request for eduYear:', request.eduYear, 'eduSemester:', request.eduSemester);
            fetchCourseData(request.eduYear, request.eduSemester)
                .then(data => {
                    console.log('[OFFSCREEN] Course data fetched successfully for:', request.eduYear, request.eduSemester, data.success);
                    sendResponse(data);
                })
                .catch(error => {
                    console.error('[OFFSCREEN] Error fetching course data:', error);
                    sendResponse({
                        success: false,
                        error: error.message || 'Bilinməyən xəta baş verdi (kurslar)'
                    });
                });
            return true;
        }
    }
});

async function fetchAcademicYearOptions() {
    console.log(`[OFFSCREEN] Fetching academic year options from main evaluation page`);
    try {
        const url = 'https://kabinet.unec.edu.az/az/studentEvaluation';
        console.log(`[OFFSCREEN] GETting from ${url} for academic years`);

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'az,en;q=0.5',
                'Cache-Control': 'no-cache', // Ensure fresh data
                'Pragma': 'no-cache'
            }
        });

        console.log(`[OFFSCREEN] Academic year page fetch response status: ${response.status}`);
        if (!response.ok) {
            const errorText = await response.text().catch(() => "Could not read error response body");
            console.error(`[OFFSCREEN] HTTP error! Status: ${response.status}, URL: ${url}, Response body snippet: ${errorText.substring(0, 200)}`);
            throw new Error(`Server xətası (${response.status}) tədris illərini əldə edərkən.`);
        }

        const pageHtml = await response.text();
        // console.log('[OFFSCREEN] Raw academic year page HTML (first 500 chars):', pageHtml.substring(0, 500));

        const parser = new DOMParser();
        const doc = parser.parseFromString(pageHtml, 'text/html');
        
        const yearSelectElement = doc.querySelector('select#eduYear[name="eduYear"]');
        if (!yearSelectElement) {
            console.error('[OFFSCREEN] Tədris ili (<select id="eduYear">) elementi səhifədə tapılmadı.');
            if (doc.querySelector('form[action*="login"]') || doc.title.toLowerCase().includes('giriş')) {
                 throw new Error('Giriş səhifəsi aşkarlandı. UNEC kabinetinə daxil olun və yenidən cəhd edin.');
            }
            throw new Error('Tədris ili seçimi elementi tapılmadı. Səhifə strukturu dəyişmiş ola bilər.');
        }

        const yearOptions = Array.from(yearSelectElement.querySelectorAll('option'))
            .filter(opt => opt.value !== '') // Exclude the placeholder like "--Tədris ilini seçin--"
            .map(opt => ({
                value: opt.value,
                text: opt.textContent.trim()
            }));
        
        console.log('[OFFSCREEN] Parsed academic year options:', yearOptions.length);

        if (yearOptions.length === 0) {
            console.warn('[OFFSCREEN] Heç bir tədris ili seçimi tapılmadı. Giriş etdiyinizə əmin olun.');
            throw new Error('Heç bir tədris ili seçimi tapılmadı. Giriş etdiyinizə əmin olun və ya səhifə strukturu dəyişmişdir.');
        }

        return { success: true, data: yearOptions };
    } catch (error) {
        console.error('[OFFSCREEN] Exception in fetchAcademicYearOptions:', error);
        return { success: false, error: error.message || 'Tədris ili məlumatlarını əldə etmək mümkün olmadı.' };
    }
}


async function fetchSemesterOptions(eduYearId) {
    // ... (This function remains the same as your previous version) ...
    console.log(`[OFFSCREEN] Fetching semester options for eduYear ID: ${eduYearId}`);
    if (!eduYearId) {
        console.warn('[OFFSCREEN] eduYearId is missing for fetchSemesterOptions');
        return { success: false, error: 'Tədris ili ID təyin edilməyib.' };
    }
    try {
        const url = 'https://kabinet.unec.edu.az/az/getEduSemester';
        const payload = `type=eduYear&id=${eduYearId}`;

        console.log(`[OFFSCREEN] POSTing to ${url} with payload: ${payload}`);

        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': '*/*', 
                'X-Requested-With': 'XMLHttpRequest' 
            },
            body: payload
        });

        console.log(`[OFFSCREEN] Semester fetch response status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Server xətası (${response.status}) semestrləri əldə edərkən.`);
        }

        const htmlOptionsString = await response.text();
        // console.log('[OFFSCREEN] Raw semester options HTML:', htmlOptionsString);

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<select>${htmlOptionsString}</select>`, 'text/html');
        const semesterOptions = Array.from(doc.querySelectorAll('option'))
            .filter(opt => opt.value !== '') 
            .map(opt => ({
                value: opt.value,
                text: opt.textContent.trim()
            }));
        
        // console.log('[OFFSCREEN] Parsed semester options:', semesterOptions);
        return { success: true, data: semesterOptions };
    } catch (error) {
        console.error('[OFFSCREEN] Exception in fetchSemesterOptions:', error);
        return { success: false, error: error.message || 'Semestr məlumatlarını əldə etmək mümkün olmadı.' };
    }
}

async function fetchCourseData(eduYear, eduSemester) {
    // ... (This function remains the same as your previous version) ...
    console.log(`[OFFSCREEN] fetchCourseData called with eduYear: ${eduYear}, eduSemester: ${eduSemester}`);
    if (!eduYear || !eduSemester) {
         console.warn('[OFFSCREEN] eduYear or eduSemester is missing for fetchCourseData');
         return { success: false, error: 'Tədris ili və ya semestr ID təyin edilməyib.' };
    }
    try {
        const url = `https://kabinet.unec.edu.az/az/studentEvaluation?eduYear=${eduYear}&eduSemester=${eduSemester}&lessonType=`;
        console.log('[OFFSCREEN] Fetching course data from URL:', url);

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'az,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        console.log(`[OFFSCREEN] Course data fetch response status for ${url}: ${response.status}`);
        if (!response.ok) {
            throw new Error(`Server xətası (${response.status}) kurs məlumatlarını əldə edərkən.`);
        }

        const html = await response.text();
        // console.log(`[OFFSCREEN] Received HTML for courses (first 300 chars): ${html.substring(0, 300)}`);

        const courses = await parseCoursesFromHTML(html, eduYear, eduSemester);

        if (courses.length === 0) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            if (!doc.querySelector('a[href*="logout"]') && !doc.querySelector('.user-name') && !doc.querySelector('#studentEvaluation-grid')) {
                 console.warn('[OFFSCREEN] Indicators of being logged in or course table not found.');
                 throw new Error('Heç bir kurs məlumatı tapılmadı. Giriş etdiyinizə və ya düzgün il/semestr seçdiyinizə əmin olun.');
            }
        }
        return { success: true, data: courses };
    } catch (error) {
        console.error('[OFFSCREEN] Exception in fetchCourseData:', error);
        return { success: false, error: error.message || 'Kurs məlumatlarını əldə etmək mümkün olmadı.' };
    }
}

async function parseCoursesFromHTML(html, eduYear, eduSemester) {
    // ... (This function remains the same as your previous version) ...
    console.log(`[OFFSCREEN] Parsing HTML for courses (eduYear: ${eduYear}, eduSemester: ${eduSemester})`);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const basicCourses = [];
    const mainTable = doc.querySelector('#studentEvaluation-grid table');

    if (!mainTable) {
        console.warn('[OFFSCREEN] Kurs cədvəli (#studentEvaluation-grid table) HTML-də tapılmadı.');
        if (doc.querySelector('form[action*="login"]')) {
            throw new Error('Giriş səhifəsi aşkarlandı. Zəhmət olmasa UNEC kabinetinə daxil olun.');
        }
        throw new Error('Kurs cədvəli tapılmadı. Səhifə strukturu dəyişmiş ola bilər və ya məlumat yoxdur.');
    }

    const rows = mainTable.querySelectorAll('tbody tr');
    // console.log(`[OFFSCREEN] Found ${rows.length} rows in the main course table.`);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        if (cells.length === 1 && cells[0].textContent.trim().toLowerCase().includes('məlumat tapılmadı')) {
            // console.log('[OFFSCREEN] "Məlumat tapılmadı" row detected in table.');
            continue; 
        }
        const lessonId = cells[1] ? cells[1].textContent.trim() : null;
        const eduFormId = cells[5] ? cells[5].textContent.trim() : null;

        if (cells.length >= 6 && lessonId && eduFormId) {
            const courseName = cells[2].textContent.trim();
            const credits = cells[3].textContent.trim();
            if (courseName && credits) {
                basicCourses.push({ name: courseName, credits: credits, lessonId: lessonId, eduFormId: eduFormId, rowIndex: i });
            }
        }
    }

    if (basicCourses.length === 0) {
        console.log('[OFFSCREEN] Heç bir əsas kurs tapılmadı (parseCoursesFromHTML).');
    }

    const detailedCourses = [];
    for (let course of basicCourses) {
        try {
            // console.log(`[OFFSCREEN] Fetching details for course: ${course.name} (LessonID: ${course.lessonId}, EduFormID: ${course.eduFormId})`);
            const detailedInfo = await fetchCourseDetails(course.lessonId, course.eduFormId, eduYear, eduSemester);
            let qaibSayi = '-';
            const qaibFaizi = parseFloat(detailedInfo.qaibFaizi); 
            const courseCredits = parseFloat(course.credits); 
            if (!isNaN(qaibFaizi) && !isNaN(courseCredits) && courseCredits > 0) {
                if (courseCredits >= 4) qaibSayi = Math.floor(qaibFaizi / 3.33);
                else qaibSayi = Math.floor(qaibFaizi / 4.44);
            }
            detailedCourses.push({ ...course, ...detailedInfo, qaibSayi: qaibSayi.toString() });
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`[OFFSCREEN] Error fetching details for course ${course.name}:`, error);
            detailedCourses.push({ ...course, kollokviutOrta: 'Xəta', seminarOrta: 'Xəta', cariQiymet: 'Xəta', qaibFaizi: 'Xəta', qaibSayi: '-' });
        }
    }
    return detailedCourses;
}

async function fetchCourseDetails(lessonId, eduFormId, eduYear, eduSemester) {
    // ... (This function remains the same as your previous version) ...
    try {
        const response = await fetch('https://kabinet.unec.edu.az/az/studentEvaluationPopup', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'text/html, */*; q=0.01', 'Accept-Language': 'az,en;q=0.5' },
            body: `id=${lessonId}&edu_form_id=${eduFormId}&eduYear=${eduYear}&eduSemester=${eduSemester}`
        });
        if (response.ok) {
            const modalHtml = await response.text();
            return parseModalContent(modalHtml);
        } else {
            throw new Error(`HTTP xətası (${response.status}) detal məlumatlarını əldə edərkən.`);
        }
    } catch (error) {
        console.error('[OFFSCREEN] Exception in fetchCourseDetails:', error);
        return { kollokviutOrta: 'Xəta', seminarOrta: 'Xəta', cariQiymet: 'Xəta', qaibFaizi: 'Xəta' };
    }
}

function parseModalContent(html) {
    // ... (This function remains the same as your previous version) ...
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const finalEvalDiv = doc.querySelector('#finalEval');
    const result = { kollokviutOrta: '-', seminarOrta: '-', cariQiymet: '-', qaibFaizi: '-' };

    if (!finalEvalDiv) {
        return extractValuesFromAnyContentInModal(doc, html); 
    }
    const tbody = finalEvalDiv.querySelector('table tbody');
    if (tbody && tbody.querySelector('tr')) {
        const cells = tbody.querySelector('tr').querySelectorAll('td');
        if (cells.length >= 15) {
            result.kollokviutOrta = cells[4].textContent.trim() || '-';
            result.seminarOrta = cells[5].textContent.trim() || '-';
            result.cariQiymet = cells[9].textContent.trim() || '-';
            result.qaibFaizi = cells[14].textContent.trim() || '-';
        } else {
            return extractValuesFromAnyContentInModal(doc, html);
        }
    } else {
        return extractValuesFromAnyContentInModal(doc, html);
    }
    return result;
}

function extractValuesFromAnyContentInModal(doc, htmlForLogging) {
    // ... (This function remains the same as your previous version) ...
    const result = { kollokviutOrta: '-', seminarOrta: '-', cariQiymet: '-', qaibFaizi: '-' };
    let found = false;
    const tables = doc.querySelectorAll('table');
    for (let table of tables) {
        const rows = table.querySelectorAll('tbody tr');
        for (let row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 15) {
                const kollokOrta = cells[4].textContent.trim();
                const semOrta = cells[5].textContent.trim();
                const yekun = cells[9].textContent.trim();
                const qaib = cells[14].textContent.trim();
                if (kollokOrta && kollokOrta !== '-') result.kollokviutOrta = kollokOrta;
                if (semOrta && semOrta !== '-') result.seminarOrta = semOrta;
                if (yekun && yekun !== '-') result.cariQiymet = yekun;
                if (qaib && qaib !== '-') result.qaibFaizi = qaib;
                if (result.kollokviutOrta !== '-' || result.seminarOrta !== '-' || result.cariQiymet !== '-' || result.qaibFaizi !== '-') {
                    found = true; break;
                }
            }
        }
        if (found) break;
    }
    if (!found) console.warn('[OFFSCREEN] Generic extraction from modal did not find plausible data.');
    return result;
}
