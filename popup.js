document.addEventListener('DOMContentLoaded', function () {
    const eduYearSelect = document.getElementById('eduYear');
    const eduSemesterSelect = document.getElementById('eduSemester');
    const fetchDataButton = document.getElementById('fetchData');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const resultsDiv = document.getElementById('results');
    const coursesBody = document.getElementById('coursesBody');
    const totalCreditsDiv = document.getElementById('totalCredits');
    const successMessageDiv = resultsDiv.querySelector('.success');

    // --- UI Helper Functions ---
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
        resultsDiv.style.display = 'none';
        if (successMessageDiv) successMessageDiv.style.display = 'none';
    }

    function hideError() {
        errorDiv.style.display = 'none';
    }

    function hideResults() {
        resultsDiv.style.display = 'none';
        coursesBody.innerHTML = '';
        totalCreditsDiv.textContent = '';
        if (successMessageDiv) successMessageDiv.style.display = 'none';
    }

    function showSuccessMessage(message) {
        if (successMessageDiv) {
            successMessageDiv.textContent = message;
            successMessageDiv.style.display = 'block';
        }
        resultsDiv.style.display = 'block'; // Ensure parent results div is visible
    }

    // --- Dropdown Population Functions ---
    function populateYearDropdown(years) {
        eduYearSelect.innerHTML = ''; // Clear existing
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '--Tədris ilini seçin--';
        eduYearSelect.appendChild(placeholder);

        if (years && years.length > 0) {
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year.value;
                option.textContent = year.text;
                eduYearSelect.appendChild(option);
            });
            eduYearSelect.disabled = false;
        } else {
            const noDataOption = document.createElement('option');
            noDataOption.value = '';
            noDataOption.textContent = 'Tədris ili tapılmadı';
            eduYearSelect.appendChild(noDataOption);
            eduYearSelect.disabled = true;
        }
    }

    function populateSemesterDropdown(semesters) {
        eduSemesterSelect.innerHTML = ''; // Clear existing
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '--Semestri seçin--';
        eduSemesterSelect.appendChild(placeholder);

        if (semesters && semesters.length > 0) {
            semesters.forEach(semester => {
                const option = document.createElement('option');
                option.value = semester.value;
                option.textContent = semester.text;
                eduSemesterSelect.appendChild(option);
            });
            eduSemesterSelect.disabled = false;
        } else {
            const noDataOption = document.createElement('option');
            noDataOption.value = '';
            noDataOption.textContent = 'Semestr tapılmadı';
            eduSemesterSelect.appendChild(noDataOption);
            eduSemesterSelect.disabled = true;
        }
    }

    // --- Data Fetching Orchestration ---
    async function fetchAndLoadSemesters(eduYearValue, attemptRestoreSemester = true) {
        if (!eduYearValue) {
            populateSemesterDropdown([]);
            showLoading(false); // Ensure loading stops if year is cleared
            return;
        }

        showLoading(true, 'Semestrlər yüklənir...');
        hideError();
        // Do not hide results here, only when year truly changes or new course data is fetched

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchSemesters',
                eduYear: eduYearValue
            });

            if (response && response.success) {
                populateSemesterDropdown(response.data);
                if (attemptRestoreSemester) {
                    chrome.storage.local.get(['savedEduSemester-' + eduYearValue], function(result) {
                        const savedSemester = result['savedEduSemester-' + eduYearValue];
                        if (savedSemester && eduSemesterSelect.querySelector(`option[value="${savedSemester}"]`)) {
                            eduSemesterSelect.value = savedSemester;
                        } else if (response.data && response.data.length > 0) {
                            // Optionally default to first semester if no saved one and semesters exist
                            // eduSemesterSelect.value = response.data[0].value;
                        }
                    });
                }
            } else {
                showError('Semestrləri yükləmək mümkün olmadı: ' + (response ? response.error : 'Bilinməyən xəta'));
                populateSemesterDropdown([]);
            }
        } catch (error) {
            console.error('Error fetching semesters:', error);
            showError('Semestrləri yükləyərkən xəta: ' + error.message);
            populateSemesterDropdown([]);
        } finally {
            showLoading(false); // Stop loading after semesters are attempted
        }
    }

    async function initializePopup() {
        showLoading(true, 'Tədris illəri yüklənir...');
        hideError();
        hideResults();
        populateYearDropdown([]); // Initialize with placeholder
        populateSemesterDropdown([]); // Initialize with placeholder

        try {
            const yearResponse = await chrome.runtime.sendMessage({ action: 'fetchAcademicYears' });

            if (yearResponse && yearResponse.success && yearResponse.data && yearResponse.data.length > 0) {
                populateYearDropdown(yearResponse.data);

                // Restore saved year or select a default (e.g., most recent - often first in list)
                chrome.storage.local.get(['savedEduYear'], async function (storageResult) {
                    let yearToLoadSemestersFor = null;
                    if (storageResult.savedEduYear && eduYearSelect.querySelector(`option[value="${storageResult.savedEduYear}"]`)) {
                        eduYearSelect.value = storageResult.savedEduYear;
                        yearToLoadSemestersFor = storageResult.savedEduYear;
                    } else if (yearResponse.data.length > 0) {
                        // Default to the first actual year (assuming it's the most recent from site)
                        yearToLoadSemestersFor = yearResponse.data[0].value;
                        eduYearSelect.value = yearToLoadSemestersFor;
                        chrome.storage.local.set({ savedEduYear: yearToLoadSemestersFor }); // Save this default
                    }

                    if (yearToLoadSemestersFor) {
                        // fetchAndLoadSemesters handles its own loading message for semesters
                        // and will call showLoading(false) when done.
                        await fetchAndLoadSemesters(yearToLoadSemestersFor);
                    } else {
                        populateSemesterDropdown([]);
                        showLoading(false); // No year, stop loading.
                    }
                });
            } else {
                showError('Tədris illərini yükləmək mümkün olmadı: ' + (yearResponse ? yearResponse.error : 'Serverlə əlaqə qurulmadı.'));
                populateYearDropdown([]);
                populateSemesterDropdown([]);
                showLoading(false);
            }
        } catch (error) {
            console.error('Error initializing popup:', error);
            showError('Başlanğıc məlumatları yükləyərkən xəta: ' + error.message);
            populateYearDropdown([]);
            populateSemesterDropdown([]);
            showLoading(false);
        }
    }

    // --- Event Listeners ---
    eduYearSelect.addEventListener('change', function () {
        const selectedYear = this.value;
        chrome.storage.local.set({ savedEduYear: selectedYear });
        hideResults(); // Clear previous course results when year changes
        hideError();

        if (selectedYear) {
            eduYearSelect.lastValidYearValue = selectedYear; // For cleaning storage
            fetchAndLoadSemesters(selectedYear);
        } else {
            populateSemesterDropdown([]);
            // Optionally clear storage for the last valid year's semester
            if (eduYearSelect.lastValidYearValue) {
                chrome.storage.local.remove(['savedEduSemester-' + eduYearSelect.lastValidYearValue]);
            }
        }
    });

    eduSemesterSelect.addEventListener('change', function() {
        const selectedYear = eduYearSelect.value;
        if (selectedYear && this.value) {
            chrome.storage.local.set({['savedEduSemester-' + selectedYear]: this.value});
        } else if (selectedYear && !this.value) {
             // If semester is deselected (back to placeholder)
            chrome.storage.local.remove(['savedEduSemester-' + selectedYear]);
        }
    });

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
                    displayResults([]); // Show "no data" message in table
                    showSuccessMessage('Seçilmiş dövr üçün kurs məlumatı tapılmadı.');
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
        coursesBody.innerHTML = '';
        let totalCredits = 0;

        if (!courses || courses.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.textContent = 'Bu dövr üçün kurs məlumatı yoxdur.';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            coursesBody.appendChild(row);
        } else {
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
        }
        totalCreditsDiv.textContent = `Ümumi Kredit: ${totalCredits}`;
        // resultsDiv.style.display = 'block'; // success/error message will handle this
    }

    // --- Initialize Popup ---
    initializePopup();
});
