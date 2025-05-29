chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchCourseData') {
        handleFetchCourseData(request, sendResponse);
        return true; // Keep the message channel open for async response
    }
});

async function handleFetchCourseData(request, sendResponse) {
    try {
        // Create offscreen document if it doesn't exist
        await setupOffscreenDocument();
        
        // Send message to offscreen document to fetch data
        const response = await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'fetchData',
            eduYear: request.eduYear,
            eduSemester: request.eduSemester
        });
        
        sendResponse(response);
    } catch (error) {
        console.error('Background script error:', error);
        sendResponse({
            success: false,
            error: 'Xəta baş verdi: ' + error.message
        });
    }
}

async function setupOffscreenDocument() {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length > 0) {
        return; // Offscreen document already exists
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_SCRAPING'],
        justification: 'Fetch course data from UNEC student portal'
    });
}