// Exam Logic
document.addEventListener('DOMContentLoaded', function() {
    const streamSelect = document.getElementById('streamSelect');
    const questionSetSelect = document.getElementById('questionSetSelect');
    const loadQuestionsBtn = document.getElementById('loadQuestionsBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const questionSelector = document.getElementById('questionSelector');
    const examForm = document.getElementById('examForm');
    const resultsModal = document.getElementById('resultsModal');
    
    let streamsData = {};
    let currentQuestions = [];
    let examTimerInterval = null;
    let examTimeRemaining = 0;

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Fetch streams on page load
    fetchStreams();

    // Close modal button
    document.getElementById('closeResultsModal').addEventListener('click', function() {
        resultsModal.classList.add('hidden');
    });

    function fetchStreams() {
        fetch('/api/stream', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            streamsData = data.streams;
            populateStreamDropdown();
        })
        .catch(error => {
            showError('Failed to load streams: ' + error.message);
        });
    }

    function populateStreamDropdown() {
        streamSelect.innerHTML = '<option value="">-- Select Stream --</option>';
        Object.keys(streamsData).forEach(stream => {
            const option = document.createElement('option');
            option.value = stream;
            option.textContent = stream.charAt(0).toUpperCase() + stream.slice(1);
            streamSelect.appendChild(option);
        });
    }

    // Handle stream selection
    streamSelect.addEventListener('change', function() {
        const selectedStream = this.value;
        questionSetSelect.innerHTML = '<option value="">-- Select Question Set --</option>';
        
        if (selectedStream && streamsData[selectedStream]) {
            questionSetSelect.disabled = false;
            streamsData[selectedStream].forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                questionSetSelect.appendChild(option);
            });
        } else {
            questionSetSelect.disabled = true;
            loadQuestionsBtn.disabled = true;
        }
    });

    // Handle question set selection
    questionSetSelect.addEventListener('change', function() {
        loadQuestionsBtn.disabled = !this.value;
    });

    // Handle Load Questions button
    loadQuestionsBtn.addEventListener('click', function() {
        const stream = streamSelect.value;
        const filename = questionSetSelect.value;
        
        if (!stream || !filename) {
            showError('Please select both stream and question set');
            return;
        }

        loadQuestions(stream, filename);
    });

    function loadQuestions(stream, filename) {
        loadingIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        loadQuestionsBtn.disabled = true;

        fetch('/api/exam/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stream, filename })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Failed to load questions');
                });
            }
            return response.json();
        })
        .then(data => {
            currentQuestions = data.questions;
            renderQuestions(currentQuestions);
            
            // Hide selector and show exam form
            questionSelector.classList.add('hidden');
            examForm.classList.remove('hidden');
            
            loadingIndicator.classList.add('hidden');
            
            // Start exam timer
            const examDuration = parseInt(document.getElementById('examTimer').value) || 5;
            startExamTimer(examDuration * 60); // Convert minutes to seconds
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(error => {
            loadingIndicator.classList.add('hidden');
            loadQuestionsBtn.disabled = false;
            showError(error.message);
        });
    }

    function renderQuestions(questions) {
        const submitButton = examForm.querySelector('.submit-btn');
        examForm.innerHTML = '';

        // Add timer display
        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'examTimerDisplay';
        timerDisplay.className = 'fixed top-20 right-6 bg-gray-900 border-2 border-indigo-500 rounded-xl p-4 shadow-xl z-40';
        timerDisplay.innerHTML = `
            <div class="text-center">
                <div class="text-gray-400 text-sm font-semibold mb-1">Time Remaining</div>
                <div id="timerDisplay" class="text-3xl font-black text-indigo-400">--:--</div>
            </div>
        `;
        examForm.appendChild(timerDisplay);

        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 shadow-lg';
            questionDiv.dataset.questionId = question.id;
            questionDiv.dataset.correct = question.correct;

            const questionText = document.createElement('div');
            questionText.className = 'question-text text-xl md:text-2xl font-bold mb-6 text-gray-100';
            questionText.innerHTML = `<span class="text-indigo-400 mr-2">${index + 1}.</span> ${question.text}`;

            const optionsList = document.createElement('ul');
            optionsList.className = 'options space-y-3';

            question.options.forEach((option, optIndex) => {
                const optionItem = document.createElement('li');
                optionItem.className = 'option-item';

                const label = document.createElement('label');
                label.className = 'option-label flex items-center gap-4 p-4 bg-gray-850 border-2 border-gray-700 rounded-xl cursor-pointer hover:bg-gray-800 hover:border-indigo-500 transition-all';
                label.style.backgroundColor = '#1a1d29'; // Darker background for better contrast

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `question${question.id}`;
                input.value = optIndex;
                input.className = 'w-5 h-5 text-indigo-600 focus:ring-indigo-500 focus:ring-2';

                const span = document.createElement('span');
                span.className = 'text-lg text-gray-200';
                span.innerHTML = option;

                label.appendChild(input);
                label.appendChild(span);
                optionItem.appendChild(label);
                optionsList.appendChild(optionItem);
            });

            questionDiv.appendChild(questionText);
            questionDiv.appendChild(optionsList);
            examForm.appendChild(questionDiv);
        });

        // Add submit button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'submit-btn w-full md:w-auto mx-auto block bg-green-600 hover:bg-green-500 text-white text-2xl font-bold py-4 px-12 rounded-xl shadow-xl transition transform hover:scale-105';
        submitBtn.textContent = 'Submit Exam';
        examForm.appendChild(submitBtn);

        // Initialize MathJax rendering for new content
        if (window.MathJax) {
            MathJax.typesetPromise([examForm]).catch((err) => console.log('MathJax error:', err));
        }

        // Add click handlers for option selection animation
        setupOptionHandlers();
    }

    function setupOptionHandlers() {
        document.querySelectorAll('.option-label').forEach(label => {
            label.addEventListener('click', function() {
                const questionDiv = this.closest('.question');
                const allLabels = questionDiv.querySelectorAll('.option-label');
                
                allLabels.forEach(l => {
                    l.classList.remove('ring-4', 'ring-indigo-500', 'bg-indigo-600', 'border-indigo-500');
                    l.style.backgroundColor = '#1a1d29'; // Reset to darker background
                });
                
                this.classList.add('ring-4', 'ring-indigo-500', 'bg-indigo-600', 'border-indigo-500');
                this.style.backgroundColor = ''; // Remove inline style to use class
            });
        });
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
    
    // Exam Timer Functions
    function startExamTimer(seconds) {
        examTimeRemaining = seconds;
        updateTimerDisplay();
        
        examTimerInterval = setInterval(() => {
            examTimeRemaining--;
            updateTimerDisplay();
            
            // Change color when less than 1 minute remaining
            const timerDisplay = document.getElementById('timerDisplay');
            if (examTimeRemaining <= 60) {
                timerDisplay.classList.remove('text-indigo-400');
                timerDisplay.classList.add('text-red-500', 'animate-pulse');
            }
            
            // Auto-submit when time runs out
            if (examTimeRemaining <= 0) {
                clearInterval(examTimerInterval);
                autoSubmitExam();
            }
        }, 1000);
    }
    
    function updateTimerDisplay() {
        const minutes = Math.floor(examTimeRemaining / 60);
        const seconds = examTimeRemaining % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timerElement = document.getElementById('timerDisplay');
        if (timerElement) {
            timerElement.textContent = display;
        }
    }
    
    function autoSubmitExam() {
        alert('Time is up! Your exam will be submitted automatically.');
        // Trigger form submission
        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        examForm.dispatchEvent(submitEvent);
    }
    
    function stopExamTimer() {
        if (examTimerInterval) {
            clearInterval(examTimerInterval);
            examTimerInterval = null;
        }
    }
    
    // Handle form submission
    examForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Stop the timer
        stopExamTimer();
        
        // Calculate results
        const results = calculateResults();
        
        // Show results in visual feedback on questions
        displayQuestionFeedback(results);
        
        // Show results modal
        setTimeout(() => {
            showResultsModal(results);
        }, 500);
    });
    
    // Calculate exam results
    function calculateResults() {
        const questions = document.querySelectorAll('.question');
        let correct = 0;
        let wrong = 0;
        let skipped = 0;
        const userAnswers = {};
        
        questions.forEach(question => {
            const questionId = question.dataset.questionId;
            const correctAnswer = parseInt(question.dataset.correct);
            const selectedOption = question.querySelector(`input[name="question${questionId}"]:checked`);
            
            if (selectedOption) {
                const userAnswer = parseInt(selectedOption.value);
                userAnswers[questionId] = userAnswer;
                
                if (userAnswer === correctAnswer) {
                    correct++;
                } else {
                    wrong++;
                }
            } else {
                skipped++;
                userAnswers[questionId] = null;
            }
        });
        
        return {
            correct,
            wrong,
            skipped,
            total: questions.length,
            userAnswers,
            percentage: Math.round((correct / questions.length) * 100)
        };
    }
    
    // Download PDF report
    window.downloadPDF = function() {
        // Get the entire body content or the main exam container
        const element = document.body;
        const options = {
            margin:       0.5,
            filename:     'Math_Exam.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(options).from(element).save();
    }





    // Display visual feedback on questions
    function displayQuestionFeedback(results) {
        const questions = document.querySelectorAll('.question');
        
        questions.forEach(question => {
            const questionId = question.dataset.questionId;
            const correctAnswer = parseInt(question.dataset.correct);
            const userAnswer = results.userAnswers[questionId];
            const options = question.querySelectorAll('.option-item');
            
            // Disable all inputs
            question.querySelectorAll('input[type="radio"]').forEach(input => {
                input.disabled = true;
            });
            
            options.forEach((option, index) => {
                const label = option.querySelector('.option-label');
                
                // Highlight correct answer
                if (index === correctAnswer) {
                    label.style.backgroundColor = ''; // Remove inline style
                    label.classList.add('bg-green-600', 'border-green-500', 'ring-4', 'ring-green-500/30');
                }
                
                // Highlight user's wrong answer
                if (userAnswer !== null && index === userAnswer && userAnswer !== correctAnswer) {
                    label.style.backgroundColor = ''; // Remove inline style
                    label.classList.add('bg-red-600', 'border-red-500', 'ring-4', 'ring-red-500/30');
                }
                
                // Dim other options
                if (index !== correctAnswer && index !== userAnswer) {
                    label.classList.add('opacity-40');
                }
            });
            
            // Add result indicator to question
            const resultIndicator = document.createElement('div');
            resultIndicator.className = 'mt-4 text-center font-bold text-lg';
            
            if (userAnswer === null) {
                resultIndicator.innerHTML = '<span class="text-yellow-400">⚠️ Skipped</span>';
            } else if (userAnswer === correctAnswer) {
                resultIndicator.innerHTML = '<span class="text-green-400">✓ Correct!</span>';
            } else {
                resultIndicator.innerHTML = '<span class="text-red-400">✗ Incorrect</span>';
            }
            
            question.appendChild(resultIndicator);
        });
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Show results modal
    function showResultsModal(results) {
        // Update modal content
        document.getElementById('finalScore').textContent = results.correct;
        document.getElementById('totalQuestions').textContent = results.total;
        document.getElementById('scorePercentage').textContent = `${results.percentage}%`;
        document.getElementById('correctCount').textContent = results.correct;
        document.getElementById('wrongCount').textContent = results.wrong;
        document.getElementById('skippedCount').textContent = results.skipped;
        
        // Show modal with animation
        resultsModal.classList.remove('hidden');
        resultsModal.classList.add('animate-fadeIn');
    }
    
    // Add animation for selected options
    document.querySelectorAll('.option-label').forEach(label => {
        label.addEventListener('click', function() {
            const questionDiv = this.closest('.question');
            const allLabels = questionDiv.querySelectorAll('.option-label');
            
            allLabels.forEach(l => {
                l.classList.remove('ring-4', 'ring-indigo-500', 'bg-indigo-600', 'border-indigo-500');
                l.classList.add('bg-gray-800', 'border-gray-700');
            });
            
            this.classList.remove('bg-gray-800', 'border-gray-700');
            this.classList.add('ring-4', 'ring-indigo-500', 'bg-indigo-600', 'border-indigo-500');
        });
    });
    
    // Close modal on outside click
    resultsModal.addEventListener('click', function(e) {
        if (e.target === resultsModal) {
            resultsModal.classList.add('hidden');
        }
    });
});

// Add fadeIn animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    .animate-fadeIn {
        animation: fadeIn 0.3s ease-out;
    }
`;
document.head.appendChild(style);
