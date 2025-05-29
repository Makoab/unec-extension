document.addEventListener('DOMContentLoaded', function() {
    const eduYearSelect = document.getElementById('eduYear');
    const eduSemesterSelect = document.getElementById('eduSemester');
    const fetchButton = document.getElementById('fetchData');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const resultsDiv = document.getElementById('results');
    const coursesBody = document.getElementById('coursesBody');
    const totalCreditsDiv = document.getElementById('totalCredits');

    // Load saved selections
    chrome.storage.local.get(['savedEduYear', 'savedEduSemester'], function(result) {
        if (result.savedEduYear) {
            eduYearSelect.value = result.savedEduYear;
        }
        if (result.savedEduSemester) {
            eduSemesterSelect.value = result.savedEduSemester;
        }
    });

    // Save selections when changed
    eduYearSelect.addEventListener('change', function() {
        chrome.storage.local.set({savedEduYear: this.value});
    });

    eduSemesterSelect.addEventListener('change', function() {
        chrome.storage.local.set({savedEduSemester: this.value});
    });

    fetchButton.addEventListener('click', async function() {
        const eduYear = eduYearSelect.value;
        const eduSemester = eduSemesterSelect.value;

        if (!eduYear || !eduSemester) {
            showError('Zəhmət olmasa həm tədris ilini həm də semestri seçin.');
            return;
        }

        showLoading(true);
        hideError();
        hideResults();

        try {
            // Send message to background script to create offscreen document
            const response = await chrome.runtime.sendMessage({
                action: 'fetchCourseData',
                eduYear: eduYear,
                eduSemester: eduSemester
            });

            if (response.success) {
                displayResults(response.data);
            } else {
                showError(response.error || 'Məlumatları əldə etmək mümkün olmadı.');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Xəta baş verdi: ' + error.message);
        } finally {
            showLoading(false);
        }
    });

    function showLoading(show) {
        loadingDiv.style.display = show ? 'block' : 'none';
        fetchButton.disabled = show;
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    function hideError() {
        errorDiv.style.display = 'none';
    }

    function hideResults() {
        resultsDiv.style.display = 'none';
    }

    function displayResults(courses) {
        coursesBody.innerHTML = '';
        let totalCredits = 0;

        courses.forEach(course => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${course.name}</td>
                <td>${course.credits}</td>
                <td>${course.kollokviutOrta || '-'}</td>
                <td>${course.seminarOrta || '-'}</td>
                <td>${course.cariQiymet || '-'}</td>
                <td>${course.qaibFaizi || '-'}</td>
                <td>${course.qaibSayi || '-'}</td> 
            `;
            coursesBody.appendChild(row);
            totalCredits += parseInt(course.credits) || 0;
        });

        totalCreditsDiv.textContent = `Ümumi Kredit: ${totalCredits}`;
        resultsDiv.style.display = 'block';
    }
});