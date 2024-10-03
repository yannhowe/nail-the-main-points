const startButton = document.getElementById('start-recording');
const stopButton = document.getElementById('stop-recording');
const statusDisplay = document.getElementById('status');
const transcriptionArea = document.getElementById('transcription');
const summaryArea = document.getElementById('summary');
const recordingTimerDisplay = document.getElementById('recording-timer');
const summaryTimerDisplay = document.getElementById('summary-timer');

let mediaRecorder;
let audioChunks = [];
let recordingInterval; // For recording in 5-second intervals
let summarizationInterval; // For summarizing every 5 seconds
let isRecording = false; // To track recording state
let recordingCountdown = 5;
let summaryCountdown = 5;
let recordingCountdownInterval;
let summaryCountdownInterval;

function updateRecordingTimer() {
    if (recordingCountdown > 0) {
        recordingCountdown--;
        recordingTimerDisplay.textContent = recordingCountdown;
    } else {
        recordingCountdown = 5; // Reset countdown for the next interval
    }
}

function updateSummaryTimer() {
    if (summaryCountdown > 0) {
        summaryCountdown--;
        summaryTimerDisplay.textContent = summaryCountdown;
    } else {
        summaryCountdown = 5; // Reset countdown for the next summarization
    }
}

// Function to summarize the transcription text every 5 seconds
function summarizeTranscriptionPeriodically() {
    const textToSummarize = transcriptionArea.value;

    if (textToSummarize.trim() === "") {
        statusDisplay.textContent = "Status: No text to summarize";
        return;
    }

    statusDisplay.textContent = "Status: Summarizing...";
    
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToSummarize })
    })
    .then(response => response.json())
    .then(data => {
        summaryArea.value = data.summary;
        statusDisplay.textContent = 'Status: Summary Complete';
    })
    .catch(error => {
        console.error('Error during summary:', error);
        statusDisplay.textContent = 'Status: Error during summary';
    });
}

// Request microphone access
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioChunks = []; // Clear audioChunks after sending

                const formData = new FormData();
                formData.append('audio', audioBlob, 'audio.wav');

                // Send audio to server for transcription
                fetch('/transcribe', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    transcriptionArea.value += data.transcription + '\n'; // Append transcription
                    statusDisplay.textContent = 'Status: Transcription Complete';
                })
                .catch(error => {
                    console.error('Error during transcription:', error);
                    statusDisplay.textContent = 'Status: Error during transcription';
                });
            }
        };

        // Function to start recording and summarization intervals
        function startIntervalRecordingAndSummarization() {
            mediaRecorder.start();
            statusDisplay.textContent = 'Status: Recording...';

            // Start recording and countdown timers
            recordingCountdownInterval = setInterval(updateRecordingTimer, 1000);

            recordingInterval = setInterval(() => {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop(); // Stop the current recording every 5 seconds
                }
                mediaRecorder.start(); // Start a new recording
            }, 5000); // Set interval for 5 seconds

            // Start summarization every 5 seconds
            summaryCountdownInterval = setInterval(updateSummaryTimer, 5000);
            summarizationInterval = setInterval(summarizeTranscriptionPeriodically, 20000);
        }

        startButton.addEventListener('click', () => {
            if (!isRecording) {
                startIntervalRecordingAndSummarization();
                isRecording = true;
                startButton.disabled = true;
                stopButton.disabled = false;
            }
        });

        stopButton.addEventListener('click', () => {
            if (isRecording) {
                clearInterval(recordingInterval); // Stop the recording interval
                clearInterval(recordingCountdownInterval); // Stop the recording countdown timer
                clearInterval(summarizationInterval); // Stop the summarization interval
                clearInterval(summaryCountdownInterval); // Stop the summarization countdown timer
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop(); // Ensure the last recording stops
                }
                isRecording = false;
                startButton.disabled = false;
                stopButton.disabled = true;
                statusDisplay.textContent = 'Status: Stopped';
            }
        });
    })
    .catch(error => {
        console.error('Error accessing microphone:', error);
        statusDisplay.textContent = 'Error: Unable to access microphone';
    });
