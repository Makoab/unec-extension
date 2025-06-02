chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target === 'offscreen') {
        if (request.action === 'getSemesters') {
            console.log('[OFFSCREEN] Received getSemesters request for eduYear:', request.eduYear);
            fetchSemesterOptions(request.eduYear)
                .then(data => {
                    console.log('[OFFSCREEN] Semesters fetched successfully for eduYear:', request.eduYear, data);
                    sendResponse(data);
                })
                .catch(error => {
                    console.error('[OFFSCREEN] Error fetching semesters:', error);
                    sendResponse({
                        success: false,
                        error: error.message || 'Bilinməyən xəta baş verdi (semestrlər)'
                    });
                });
            return true; // Keep message channel open for async response
        } else if (request.action === 'fetchData') {
            console.log('[OFFSCREEN] Received fetchData request for eduYear:', request.eduYear, 'eduSemester:', request.eduSemester);
            fetchCourseData(request.eduYear, request.eduSemester)
                .then(data => {
                    console.log('[OFFSCREEN] Course data fetched successfully for:', request.eduYear, request.eduSemester, data);
                    sendResponse(data);
                })
                .catch(error => {
                    console.error('[OFFSCREEN] Error fetching course data:', error);
                    sendResponse({
                        success: false,
                        error: error.message || 'Bilinməyən xəta baş verdi (kurslar)'
                    });
                });
            return true; // Keep message channel open for async response
        }
    }
});

async function fetchSemesterOptions(eduYearId) {
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
                'Accept': '*/*', // As seen in typical XHR requests for such content
                'X-Requested-With': 'XMLHttpRequest' // Often required by servers for AJAX endpoints
            },
            body: payload
        });

        console.log(`[OFFSCREEN] Semester fetch response status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Server xətası (${response.status}) semestrləri əldə edərkən.`);
        }

        const htmlOptionsString = await response.text();
        console.log('[OFFSCREEN] Raw semester options HTML:', htmlOptionsString);

        // Parse the HTML options string into an array of {value, text} objects
        const parser = new DOMParser();
        // Wrap in a select or div for robust parsing of loose <option> tags
        const doc = parser.parseFromString(`<select>${htmlOptionsString}</select>`, 'text/html');
        const semesterOptions = Array.from(doc.querySelectorAll('option'))
            .filter(opt => opt.value !== '') // Exclude the placeholder like "--Semestri seçin--"
            .map(opt => ({
                value: opt.value,
                text: opt.textContent.trim()
            }));
        
        console.log('[OFFSCREEN] Parsed semester options:', semesterOptions);

        if (semesterOptions.length === 0 && htmlOptionsString.includes('option')) {
             console.warn('[OFFSCREEN] Options found in HTML string, but parsing resulted in zero options. Check filter/map logic or HTML structure.');
        } else if (semesterOptions.length === 0) {
            console.warn('[OFFSCREEN] No valid semester options found in response for eduYearId:', eduYearId);
            // It's possible a year has no semesters, or the user is not logged in properly for this to work.
            // For now, we return success with empty data, popup.js should handle this.
        }


        return {
            success: true,
            data: semesterOptions
        };

    } catch (error) {
        console.error('[OFFSCREEN] Exception in fetchSemesterOptions:', error);
        return {
            success: false,
            error: error.message || 'Semestr məlumatlarını əldə etmək mümkün olmadı.'
        };
    }
}


async function fetchCourseData(eduYear, eduSemester) {
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
        console.log(`[OFFSCREEN] Received HTML for courses (first 300 chars): ${html.substring(0, 300)}`);

        const courses = await parseCoursesFromHTML(html, eduYear, eduSemester);

        if (courses.length === 0) {
            // Basic check if we might not be logged in
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            if (!doc.querySelector('a[href*="logout"]') && !doc.querySelector('.user-name') && !doc.querySelector('#studentEvaluation-grid')) {
                 console.warn('[OFFSCREEN] Indicators of being logged in or course table not found. User might not be logged in to kabinet.unec.edu.az, or page structure changed.');
                 throw new Error('Heç bir kurs məlumatı tapılmadı. Giriş etdiyinizə və ya düzgün il/semestr seçdiyinizə əmin olun.');
            }
            // If table exists but no courses, it's a valid empty result for that semester
            console.log('[OFFSCREEN] Course table found but no courses parsed. This might be normal for the selected period.');
        }

        return {
            success: true,
            data: courses
        };

    } catch (error) {
        console.error('[OFFSCREEN] Exception in fetchCourseData:', error);
        return {
            success: false,
            error: error.message || 'Kurs məlumatlarını əldə etmək mümkün olmadı.'
        };
    }
}

async function parseCoursesFromHTML(html, eduYear, eduSemester) {
    console.log(`[OFFSCREEN] Parsing HTML for courses (eduYear: ${eduYear}, eduSemester: ${eduSemester})`);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const basicCourses = [];
    const mainTable = doc.querySelector('#studentEvaluation-grid table');

    if (!mainTable) {
        console.warn('[OFFSCREEN] Kurs cədvəli (#studentEvaluation-grid table) HTML-də tapılmadı.');
        // It's possible the page loaded but it's an error page or login page.
        // Check for common login page elements
        if (doc.querySelector('form[action*="login"]')) {
            throw new Error('Giriş səhifəsi aşkarlandı. Zəhmət olmasa UNEC kabinetinə daxil olun.');
        }
        throw new Error('Kurs cədvəli tapılmadı. Səhifə strukturu dəyişmiş ola bilər və ya məlumat yoxdur.');
    }

    const rows = mainTable.querySelectorAll('tbody tr');
    console.log(`[OFFSCREEN] Found ${rows.length} rows in the main course table.`);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');

        // Check for "Məlumat tapılmadı" row
        if (cells.length === 1 && cells[0].textContent.trim().toLowerCase().includes('məlumat tapılmadı')) {
            console.log('[OFFSCREEN] "Məlumat tapılmadı" row detected in table.');
            continue; // Skip this row
        }
        
        const lessonId = cells[1] ? cells[1].textContent.trim() : null;
        const eduFormId = cells[5] ? cells[5].textContent.trim() : null;

        if (cells.length >= 6 && lessonId && eduFormId) {
            const courseName = cells[2].textContent.trim();
            const credits = cells[3].textContent.trim();

            if (courseName && credits) {
                basicCourses.push({
                    name: courseName,
                    credits: credits,
                    lessonId: lessonId,
                    eduFormId: eduFormId,
                    rowIndex: i
                });
            }
        } else {
            // console.log(`[OFFSCREEN] Skipping row ${i} due to insufficient cells or missing IDs: cells=${cells.length}, lessonId=${lessonId}, eduFormId=${eduFormId}`);
        }
    }

    if (basicCourses.length === 0 && rows.length > 0 && !rows[0].textContent.toLowerCase().includes('məlumat tapılmadı')) {
        console.warn('[OFFSCREEN] Rows found in table, but no basic courses extracted. Check parsing logic or table structure for courses.');
    } else if (basicCourses.length === 0) {
        console.log('[OFFSCREEN] Heç bir əsas kurs tapılmadı (parseCoursesFromHTML). Bu, seçilmiş dövr üçün normal ola bilər.');
        // This is not necessarily an error if the semester has no courses.
        // Let it return an empty array, fetchCourseData will handle the "no courses found" message if needed.
    }


    const detailedCourses = [];
    for (let course of basicCourses) {
        try {
            console.log(`[OFFSCREEN] Fetching details for course: ${course.name} (LessonID: ${course.lessonId}, EduFormID: ${course.eduFormId})`);
            const detailedInfo = await fetchCourseDetails(course.lessonId, course.eduFormId, eduYear, eduSemester);

            let qaibSayi = '-';
            const qaibFaizi = parseFloat(detailedInfo.qaibFaizi); // Ensure it's a number
            const courseCredits = parseFloat(course.credits); // Ensure it's a number

            if (!isNaN(qaibFaizi) && !isNaN(courseCredits) && courseCredits > 0) {
                if (courseCredits >= 4) {
                    qaibSayi = Math.floor(qaibFaizi / 3.33);
                } else { // credits <= 3 (assuming credits are positive)
                    qaibSayi = Math.floor(qaibFaizi / 4.44);
                }
            } else {
                // console.log(`[OFFSCREEN] Cannot calculate qaibSayi for ${course.name}: qaibFaizi=${detailedInfo.qaibFaizi}, credits=${course.credits}`);
            }

            detailedCourses.push({
                ...course,
                ...detailedInfo,
                qaibSayi: qaibSayi.toString() // Ensure it's a string for display
            });

            // Optional: shorter delay if things are stable
            await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay
        } catch (error) {
            console.error(`[OFFSCREEN] Error fetching details for course ${course.name}:`, error);
            detailedCourses.push({
                ...course,
                kollokviutOrta: 'Xəta',
                seminarOrta: 'Xəta',
                cariQiymet: 'Xəta',
                qaibFaizi: 'Xəta',
                qaibSayi: '-'
            });
        }
    }
    return detailedCourses;
}

async function fetchCourseDetails(lessonId, eduFormId, eduYear, eduSemester) {
    // console.log(`[OFFSCREEN] fetchCourseDetails called for lessonId: ${lessonId}, eduFormId: ${eduFormId}, eduYear: ${eduYear}, eduSemester: ${eduSemester}`);
    try {
        const response = await fetch('https://kabinet.unec.edu.az/az/studentEvaluationPopup', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'text/html, */*; q=0.01', // Adjusted accept
                'Accept-Language': 'az,en;q=0.5'
            },
            body: `id=${lessonId}&edu_form_id=${eduFormId}&eduYear=${eduYear}&eduSemester=${eduSemester}`
        });

        if (response.ok) {
            const modalHtml = await response.text();
            // console.log(`[OFFSCREEN] Modal HTML for ${lessonId}: ${modalHtml.substring(0,200)}...`);
            return parseModalContent(modalHtml);
        } else {
            console.error(`[OFFSCREEN] HTTP error fetching course details for ${lessonId}: ${response.status}`);
            throw new Error(`HTTP xətası (${response.status}) detal məlumatlarını əldə edərkən.`);
        }

    } catch (error) {
        console.error('[OFFSCREEN] Exception in fetchCourseDetails:', error);
        // Return error state for this specific course's details
        return {
            kollokviutOrta: 'Xəta',
            seminarOrta: 'Xəta',
            cariQiymet: 'Xəta',
            qaibFaizi: 'Xəta'
        };
    }
}

function parseModalContent(html) {
    // console.log('[OFFSCREEN] Parsing modal content...');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const finalEvalDiv = doc.querySelector('#finalEval');
    const result = {
        kollokviutOrta: '-',
        seminarOrta: '-',
        cariQiymet: '-',
        qaibFaizi: '-'
    };

    if (!finalEvalDiv) {
        console.warn('[OFFSCREEN] #finalEval div not found in modal content. Trying generic extraction.');
        // If specific structure not found, try the more generic extraction
        return extractValuesFromAnyContentInModal(doc, html); 
    }

    const tbody = finalEvalDiv.querySelector('table tbody');
    if (tbody && tbody.querySelector('tr')) {
        const cells = tbody.querySelector('tr').querySelectorAll('td');
        if (cells.length >= 15) {
            result.kollokviutOrta = cells[4].textContent.trim() || '-';
            result.seminarOrta = cells[5].textContent.trim() || '-';
            result.cariQiymet = cells[9].textContent.trim() || '-'; // Yekun
            result.qaibFaizi = cells[14].textContent.trim() || '-';
        } else {
            console.warn('[OFFSCREEN] Not enough cells (expected >=15, got ' + cells.length + ') in #finalEval table. Modal structure might have changed.');
            return extractValuesFromAnyContentInModal(doc, html); // Fallback
        }
    } else {
        console.warn('[OFFSCREEN] No tbody or tr found in #finalEval table. Modal structure might have changed.');
        return extractValuesFromAnyContentInModal(doc, html); // Fallback
    }
    // console.log('[OFFSCREEN] Parsed modal content from #finalEval:', result);
    return result;
}

// Renamed to avoid conflict and clarify it's for modal fallback
function extractValuesFromAnyContentInModal(doc, htmlForLogging) {
    console.log('[OFFSCREEN] Attempting generic extraction from modal content...');
    const result = {
        kollokviutOrta: '-',
        seminarOrta: '-',
        cariQiymet: '-',
        qaibFaizi: '-'
    };
    let found = false;

    const tables = doc.querySelectorAll('table');
    if (tables.length === 0) {
        console.warn('[OFFSCREEN] No tables found in modal for generic extraction.');
    }

    for (let table of tables) {
        const rows = table.querySelectorAll('tbody tr');
        for (let row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 15) { // Check for the row with many cells, indicative of the detailed score row
                const kollokOrta = cells[4].textContent.trim();
                const semOrta = cells[5].textContent.trim();
                const yekun = cells[9].textContent.trim(); // Yekun
                const qaib = cells[14].textContent.trim();

                // Check if these look like valid numbers or are not empty
                if (kollokOrta && kollokOrta !== '-') result.kollokviutOrta = kollokOrta;
                if (semOrta && semOrta !== '-') result.seminarOrta = semOrta;
                if (yekun && yekun !== '-') result.cariQiymet = yekun;
                if (qaib && qaib !== '-') result.qaibFaizi = qaib;
                
                // If we found at least one non-default value from a plausible row, assume it's the one.
                if (result.kollokviutOrta !== '-' || result.seminarOrta !== '-' || result.cariQiymet !== '-' || result.qaibFaizi !== '-') {
                    found = true;
                    break;
                }
            }
        }
        if (found) break;
    }
    if (!found) {
        console.warn('[OFFSCREEN] Generic extraction from modal did not find plausible data. HTML snippet:', htmlForLogging.substring(0, 500));
    } else {
        // console.log('[OFFSCREEN] Generic extraction from modal found:', result);
    }
    return result;
}
