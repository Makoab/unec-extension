document.addEventListener('DOMContentLoaded', function () {
    const eduYearSelect = document.getElementById('eduYear');
    const eduSemesterSelect = document.getElementById('eduSemester');
    const fetchDataButton = document.getElementById('fetchData'); // Corrected ID
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const resultsDiv = document.getElementById('results');
    const coursesBody = document.getElementById('coursesBody');
    const totalCreditsDiv = document.getElementById('totalCredits');
    const successMessageDiv = resultsDiv.querySelector('.success'); // Get the success message div

    function showLoading(show, message = 'Məlumatlar yüklənir...') {
        loadingDiv.textContent = message;
        loadingDiv.style.display = show ? 'block' : 'none';
        fetchDataButton.disabled = show;
        eduYearSelect.disabled = show;
        eduSemesterSelect.disabled = show;
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        resultsDiv.style.display = 'none'; // Hide results when error occurs
    }

    function hideError() {
        errorDiv.style.display = 'none';
    }

    function hideResults() {
        resultsDiv.style.display = 'none';
        coursesBody.innerHTML = ''; // Clear previous results
        totalCreditsDiv.textContent = '';
    }

    function showSuccessMessage(message) {
        if (successMessageDiv) {
            successMessageDiv.textContent = message;
            successMessageDiv.style.display = 'block';
        }
         // Ensure resultsDiv itself is shown to make success message visible
        resultsDiv.style.display = 'block';
    }


    // Function to populate semester dropdown
    function populateSemesterDropdown(semesters) {
        eduSemesterSelect.innerHTML = ''; // Clear existing options

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = '--Semestri seçin--';
        eduSemesterSelect.appendChild(placeholderOption);

        if (semesters && semesters.length > 0) {
            semesters.forEach(semester => {
                const option = document.createElement('option');
                option.value = semester.value;
                option.textContent = semester.text;
                eduSemesterSelect.appendChild(option);
            });
            eduSemesterSelect.disabled = false;
        } else {
            // No semesters found or an error occurred
            const noSemesterOption = document.createElement('option');
            noSemesterOption.value = '';
            noSemesterOption.textContent = 'Semestr tapılmadı';
            eduSemesterSelect.appendChild(noSemesterOption);
            eduSemesterSelect.disabled = true; // Disable if no valid semesters
        }
    }

    // Function to fetch semesters for a given year
    async function fetchAndLoadSemesters(eduYearValue) {
        if (!eduYearValue) {
            populateSemesterDropdown([]); // Clear/disable semester dropdown
            return;
        }

        showLoading(true, 'Semestrlər yüklənir...');
        hideError();
        hideResults(); // Clear previous course results when year changes

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchSemesters',
                eduYear: eduYearValue
            });

            if (response && response.success) {
                populateSemesterDropdown(response.data);
                // Try to restore saved semester for this year if available
                chrome.storage.local.get(['savedEduSemester-' + eduYearValue], function(result) {
                    if (result['savedEduSemester-' + eduYearValue]) {
                        eduSemesterSelect.value = result['savedEduSemester-' + eduYearValue];
                    }
                });
            } else {
                showError('Semestrləri yükləmək mümkün olmadı: ' + (response ? response.error : 'Bilinməyən xəta'));
                populateSemesterDropdown([]); // Show "Semestr tapılmadı"
            }
        } catch (error) {
            console.error('Error fetching semesters:', error);
            showError('Semestrləri yükləyərkən xəta: ' + error.message);
            populateSemesterDropdown([]);
        } finally {
            showLoading(false);
        }
    }

    // Load saved year and trigger semester load
    chrome.storage.local.get(['savedEduYear'], function (result) {
        if (result.savedEduYear) {
            eduYearSelect.value = result.savedEduYear;
            fetchAndLoadSemesters(result.savedEduYear); // Load semesters for the saved year
        } else {
            populateSemesterDropdown([]); // Ensure semester dropdown is in a clean state
        }
    });

    // Event listener for year selection change
    eduYearSelect.addEventListener('change', function () {
        const selectedYear = this.value;
        chrome.storage.local.set({ savedEduYear: selectedYear });
        hideResults(); // Clear previous results when year changes
        hideError();
        fetchAndLoadSemesters(selectedYear);
    });

    // Event listener for semester selection change (for saving preference)
    eduSemesterSelect.addEventListener('change', function() {
        const selectedYear = eduYearSelect.value;
        if (selectedYear && this.value) {
            let storageKey = 'savedEduSemester-' + selectedYear;
            chrome.storage.local.set({[storageKey]: this.value});
        }
    });

    // Event listener for the "Fetch Data" button
    fetchDataButton.addEventListener('click', async function () {
        const eduYear = eduYearSelect.value;
        const eduSemester = eduSemesterSelect.value;

        if (!eduYear || !eduSemester) {
            showError('Zəhmət olmasa həm tədris ilini, həm də semestri seçin.');
            return;
        }

        showLoading(true, 'Kurs məlumatları yüklənir...');
        hideError();
        hideResults();

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchCourseData',
                eduYear: eduYear,
                eduSemester: eduSemester
            });

            if (response && response.success) {
                if (response.data && response.data.length > 0) {
                    displayResults(response.data);
                    showSuccessMessage('Məlumatlar uğurla yükləndi!');
                } else {
                    showSuccessMessage('Seçilmiş dövr üçün kurs məlumatı tapılmadı.');
                    // displayResults([]); // Ensure table is cleared or shows a message
                }
            } else {
                showError(response.error || 'Məlumatları əldə etmək mümkün olmadı.');
            }
        } catch (error) {
            console.error('Error fetching course data:', error);
            showError('Kurs məlumatlarını əldə edərkən xəta: ' + error.message);
        } finally {
            showLoading(false);
        }
    });

    function displayResults(courses) {
        coursesBody.innerHTML = ''; // Clear previous entries
        let totalCredits = 0;

        if (!courses || courses.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7; // Span across all columns
            cell.textContent = 'Bu dövr üçün kurs məlumatı yoxdur.';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            coursesBody.appendChild(row);
            totalCreditsDiv.textContent = 'Ümumi Kredit: 0';
            resultsDiv.style.display = 'block'; // Make sure results div is visible
            return;
        }

        courses.forEach(course => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${course.name || '-'}</td>
                <td>${course.credits || '-'}</td>
                <td>${course.kollokviutOrta || '-'}</td>
                <td>${course.seminarOrta || '-'}</td>
                <td>${course.cariQiymet || '-'}</td>
                <td>${course.qaibFaizi || '-'}</td>
                <td>${course.qaibSayi || '-'}</td>
            `;
            coursesBody.appendChild(row);
            if (course.credits && !isNaN(parseInt(course.credits))) {
                totalCredits += parseInt(course.credits);
            }
        });

        totalCreditsDiv.textContent = `Ümumi Kredit: ${totalCredits}`;
        resultsDiv.style.display = 'block'; // Make sure results div is visible
    }
});
