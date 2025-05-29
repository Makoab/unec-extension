chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target === 'offscreen' && request.action === 'fetchData') {
        fetchCourseData(request.eduYear, request.eduSemester)
            .then(data => sendResponse(data))
            .catch(error => {
                console.error('Offscreen error:', error);
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        return true; // Keep message channel open for async response
    }
});

async function fetchCourseData(eduYear, eduSemester) {
    try {
        const url = `https://kabinet.unec.edu.az/az/studentEvaluation?eduYear=${eduYear}&eduSemester=${eduSemester}&lessonType=`;

        console.log('Fetching data from:', url);

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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();

        const courses = await parseCoursesFromHTML(html, eduYear, eduSemester);

        if (courses.length === 0) {
            throw new Error('Heç bir kurs məlumatı tapılmadı. Giriş etdiyinizə əmin olun.');
        }

        return {
            success: true,
            data: courses
        };

    } catch (error) {
        console.error('Fetch error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function parseCoursesFromHTML(html, eduYear, eduSemester) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const basicCourses = [];

    const mainTable = doc.querySelector('#studentEvaluation-grid table');

    if (!mainTable) {
        throw new Error('Kurs cədvəli tapılmadı');
    }

    const rows = mainTable.querySelectorAll('tbody tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');

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
        }
    }

    if (basicCourses.length === 0) {
        throw new Error('Heç bir kurs tapılmadı');
    }

    const detailedCourses = [];

    for (let course of basicCourses) {
        try {
            console.log(`Fetching details for course: ${course.name} (ID: ${course.lessonId}, EduFormID: ${course.eduFormId})`);
            const detailedInfo = await fetchCourseDetails(course.lessonId, course.eduFormId, eduYear, eduSemester);

            // Calculate "Qaib sayı" based on the rules
            let qaibSayi = '-';
            const qaibFaizi = parseFloat(detailedInfo.qaibFaizi);
            const credits = parseFloat(course.credits);

            if (!isNaN(qaibFaizi) && !isNaN(credits)) {
                if (credits >= 4) {
                    qaibSayi = Math.floor(qaibFaizi / 3.33);
                } else if (credits <= 3) {
                    qaibSayi = Math.floor(qaibFaizi / 4.44);
                }
            }

            detailedCourses.push({
                ...course,
                ...detailedInfo,
                qaibSayi: qaibSayi // Add the new calculated field
            });

            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`Error fetching details for course ${course.name}:`, error);
            detailedCourses.push({
                ...course,
                kollokviutOrta: '-',
                seminarOrta: '-',
                cariQiymet: '-',
                qaibFaizi: '-',
                qaibSayi: '-' // Ensure it's added even on error
            });
        }
    }

    return detailedCourses;
}

async function fetchCourseDetails(lessonId, eduFormId, eduYear, eduSemester) {
    try {
        const response = await fetch('https://kabinet.unec.edu.az/az/studentEvaluationPopup', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'az,en;q=0.5'
            },
            body: `id=${lessonId}&edu_form_id=${eduFormId}&eduYear=${eduYear}&eduSemester=${eduSemester}`
        });

        if (response.ok) {
            const modalHtml = await response.text();
            return parseModalContent(modalHtml);
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

    } catch (error) {
        console.error('Error fetching course details:', error);
        return {
            kollokviutOrta: 'Xəta',
            seminarOrta: 'Xəta',
            cariQiymet: 'Xəta',
            qaibFaizi: 'Xəta'
        };
    }
}

function parseModalContent(html) {
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
        return extractValuesFromAnyContent(html);
    }

    const tbody = finalEvalDiv.querySelector('table tbody');
    if (tbody && tbody.querySelector('tr')) {
        const cells = tbody.querySelector('tr').querySelectorAll('td');
        if (cells.length >= 15) {
            result.kollokviutOrta = cells[4].textContent.trim() || '-';
            result.seminarOrta = cells[5].textContent.trim() || '-';
            result.cariQiymet = cells[9].textContent.trim() || '-';
            result.qaibFaizi = cells[14].textContent.trim() || '-';
        }
    }

    return result;
}

function extractValuesFromAnyContent(html) {
    const result = {
        kollokviutOrta: '-',
        seminarOrta: '-',
        cariQiymet: '-',
        qaibFaizi: '-'
    };

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const tables = doc.querySelectorAll('table');

    for (let table of tables) {
        const rows = table.querySelectorAll('tbody tr');

        for (let row of rows) {
            const cells = row.querySelectorAll('td');

            if (cells.length >= 15) {
                const cell4 = cells[4].textContent.trim();
                const cell5 = cells[5].textContent.trim();
                const cell9 = cells[9].textContent.trim();
                const cell14 = cells[14].textContent.trim();

                if (cell4 && /^\d+(\.\d+)?$/.test(cell4)) result.kollokviutOrta = cell4;
                if (cell5 && /^\d+(\.\d+)?$/.test(cell5)) result.seminarOrta = cell5;
                if (cell9 && /^\d+(\.\d+)?$/.test(cell9)) result.cariQiymet = cell9;
                if (cell14 && /^\d+(\.\d+)?$/.test(cell14)) result.qaibFaizi = cell14;

                if (result.kollokviutOrta !== '-' || result.seminarOrta !== '-' ||
                    result.cariQiymet !== '-' || result.qaibFaizi !== '-') {
                    break;
                }
            }
        }

        if (result.kollokviutOrta !== '-' || result.seminarOrta !== '-' ||
            result.cariQiymet !== '-' || result.qaibFaizi !== '-') {
            break;
        }
    }

    return result;
}