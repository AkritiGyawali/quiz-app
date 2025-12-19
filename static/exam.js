// Exam Logic
document.addEventListener('DOMContentLoaded', function() {
    const examForm = document.getElementById('examForm');
    const resultsModal = document.getElementById('resultsModal');
    
    // Handle form submission
    examForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
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
                    label.classList.remove('bg-gray-800', 'border-gray-700');
                    label.classList.add('bg-green-600', 'border-green-500', 'ring-4', 'ring-green-500/30');
                }
                
                // Highlight user's wrong answer
                if (userAnswer !== null && index === userAnswer && userAnswer !== correctAnswer) {
                    label.classList.remove('bg-gray-800', 'border-gray-700');
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
