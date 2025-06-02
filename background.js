chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchSemesters') {
        handleFetchSemesters(request, sendResponse);
        return true; // Keep the message channel open for async response
    } else if (request.action === 'fetchCourseData') {
        handleFetchCourseData(request, sendResponse);
        return true; // Keep the message channel open for async response
    }
    // Optional: handle unknown actions
    // else {
    //     console.warn('Unknown action received in background:', request.action);
    //     sendResponse({ success: false, error: 'Unknown action' });
    // }
    return false; // Explicitly return false if not handling async
});

async function handleFetchSemesters(request, sendResponse) {
    try {
        await setupOffscreenDocumentIfNeeded(); // Ensure offscreen document is ready

        const response = await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'getSemesters', // New action for offscreen
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
        await setupOffscreenDocumentIfNeeded(); // Ensure offscreen document is ready

        const response = await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'fetchData', // Existing action for offscreen
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
        console.log('Offscreen document already exists.');
        return;
    }

    console.log('Creating offscreen document...');
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_SCRAPING', 'IFRAME_SCRIPTING'], // Added IFRAME_SCRIPTING as fetch is like a sub-request
        justification: 'Fetch semester and course data from UNEC student portal'
    });
    console.log('Offscreen document created.');
}
