chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchAcademicYears') {
        handleFetchAcademicYears(sendResponse);
        return true;
    } else if (request.action === 'fetchSemesters') {
        handleFetchSemesters(request, sendResponse);
        return true;
    } else if (request.action === 'fetchCourseData') {
        handleFetchCourseData(request, sendResponse);
        return true;
    }
    return false;
});

async function handleFetchAcademicYears(sendResponse) {
    try {
        await setupOffscreenDocumentIfNeeded();
        console.log('Background: Requesting academic years from offscreen.');
        const response = await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'getAcademicYears'
        });
        sendResponse(response);
    } catch (error) {
        console.error('Background script error (fetchAcademicYears):', error);
        sendResponse({
            success: false,
            error: 'Tədris illərini əldə edərkən xəta: ' + error.message
        });
    }
}

async function handleFetchSemesters(request, sendResponse) {
    try {
        await setupOffscreenDocumentIfNeeded();
        console.log('Background: Requesting semesters from offscreen for year:', request.eduYear);
        const response = await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'getSemesters',
            eduYear: request.eduYear
        });
        sendResponse(response);
    } catch (error) {
        console.error('Background script error (fetchSemesters):', error);
        sendResponse({
            success: false,
            error: 'Semestrləri əldə edərkən xəta: ' + error.message
        });
    }
}

async function handleFetchCourseData(request, sendResponse) {
    try {
        await setupOffscreenDocumentIfNeeded();
        console.log('Background: Requesting course data from offscreen for year:', request.eduYear, 'semester:', request.eduSemester);
        const response = await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'fetchData',
            eduYear: request.eduYear,
            eduSemester: request.eduSemester
        });
        sendResponse(response);
    } catch (error) {
        console.error('Background script error (fetchCourseData):', error);
        sendResponse({
            success: false,
            error: 'Kurs məlumatlarını əldə edərkən xəta: ' + error.message
        });
    }
}

async function setupOffscreenDocumentIfNeeded() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length > 0) {
        // console.log('Offscreen document already exists.');
        return;
    }

    // console.log('Creating offscreen document...');
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_SCRAPING', 'IFRAME_SCRIPTING'],
        justification: 'Fetch academic years, semesters, and course data from UNEC student portal'
    });
    // console.log('Offscreen document created.');
}
