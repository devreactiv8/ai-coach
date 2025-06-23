document.addEventListener('DOMContentLoaded', () => {
    const AccountabilityCoach = {
        elements: {
            chatContainer: document.getElementById('chat-container'),
            userInput: document.getElementById('user-input'),
            sendButton: document.getElementById('send-button'),
            sessionCount: document.getElementById('session-count'),
            streakDays: document.getElementById('streak-days'),
            sessionLimitModal: document.getElementById('session-limit-modal'),
            closeModal: document.getElementById('close-modal'),
            characterCount: document.getElementById('character-count'),
            typingIndicator: document.getElementById('typing-indicator')
        },

        state: {
            sessionsToday: 0,
            streak: 0,
            lastSessionDate: null,
            chatHistory: []
        },

        // API configuration
        apiConfig: {
            endpoint: 'http://localhost:3000/api/chat', // Replace with your deployed backend URL
            headers: {
                'Content-Type': 'application/json'
            }
        },

        init() {
            this.loadState();
            this.checkStreak();
            this.updateUI();
            this.setupEventListeners();
        },

        loadState() {
            const savedState = localStorage.getItem('accountability_coach_state');
            if (savedState) {
                this.state = JSON.parse(savedState);
            }
            
            const today = new Date().toDateString();
            if (this.state.lastSessionDate !== today) {
                this.state.sessionsToday = 0;
                this.state.lastSessionDate = today;
                this.saveState();
            }
        },

        saveState() {
            localStorage.setItem('accountability_coach_state', JSON.stringify(this.state));
        },

        checkStreak() {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (this.state.lastSessionDate === yesterday.toDateString()) {
                this.state.streak++;
            } else if (this.state.lastSessionDate !== today.toDateString()) {
                this.state.streak = 0;
            }
            
            this.saveState();
        },

        updateUI() {
            this.elements.sessionCount.textContent = this.state.sessionsToday;
            this.elements.streakDays.textContent = this.state.streak;
            
            if (this.state.sessionsToday >= 10) {
                this.elements.userInput.disabled = true;
                this.elements.userInput.placeholder = "You've completed your daily check-ins";
                this.elements.sendButton.disabled = true;
            }
        },

        setupEventListeners() {
            this.elements.sendButton.addEventListener('click', () => this.handleUserMessage());
            
            this.elements.userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleUserMessage();
                }
                this.elements.characterCount.textContent = e.target.value.length;
            });
            
            this.elements.closeModal.addEventListener('click', () => {
                this.elements.sessionLimitModal.classList.add('hidden');
            });
            
            this.elements.userInput.addEventListener('input', (e) => {
                this.elements.sendButton.disabled = e.target.value.trim().length === 0;
                this.elements.characterCount.textContent = e.target.value.length;
            });
        },

        async handleUserMessage() {
            const message = this.elements.userInput.value.trim();
            if (message.length === 0) return;
            
            if (this.state.sessionsToday >= 10) {
                this.elements.sessionLimitModal.classList.remove('hidden');
                return;
            }
            
            this.addMessageToChat('user', message);
            this.elements.userInput.value = '';
            this.elements.sendButton.disabled = true;
            this.elements.characterCount.textContent = '0';
            
            this.state.sessionsToday++;
            this.state.lastSessionDate = new Date().toDateString();
            this.saveState();
            this.updateUI();
            
            this.showTypingIndicator();
            // Show the typing animation in the chat UI
            if (this.elements.typingIndicator) {
                this.elements.typingIndicator.classList.remove('hidden');
                this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
            }
            
            try {
                await this.generateResponse(message);
            } catch (error) {
                console.error('Error generating response:', error);
                this.addMessageToChat('ai', "System offline. Try again later.");
            }
            // Hide the typing animation after response
            if (this.elements.typingIndicator) {
                this.elements.typingIndicator.classList.add('hidden');
            }
        },

        addMessageToChat(sender, message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `animate-fade-in`;
            
            const senderLabel = document.createElement('div');
            senderLabel.className = sender === 'user' 
                ? 'text-gray-500 text-xs mb-1 text-right' 
                : 'text-gray-500 text-xs mb-1';
            senderLabel.textContent = sender === 'user' ? 'You' : 'Coach';
            
            const messageBubble = document.createElement('div');
            messageBubble.className = sender === 'user'
                ? 'bg-blue-50 rounded-lg p-4 text-gray-800 mb-4'
                : 'bg-white rounded-lg p-4 text-gray-800 shadow-sm border border-gray-200 mb-4';
            messageBubble.innerHTML = `<p>${message}</p>`;
            
            messageDiv.appendChild(senderLabel);
            messageDiv.appendChild(messageBubble);
            this.elements.chatContainer.appendChild(messageDiv);
            
            this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
            
            this.state.chatHistory.push({
                sender,
                message,
                timestamp: new Date().toISOString()
            });
            this.saveState();
        },

        showTypingIndicator() {
            // No-op: handled by the static typing indicator in the DOM
        },

        async generateResponse(userMessage) {
            // Remove typing indicator
            const typingElements = document.querySelectorAll('.typing-indicator');
            typingElements.forEach(el => el.closest('.animate-fade-in')?.remove());

            try {
                const response = await this.fetchAIResponse(userMessage);
                this.addMessageToChat('ai', response);
            } catch (error) {
                console.error('API Error:', error);
                this.addMessageToChat('ai', "Network error. Try again later.");
            }
        },

        async fetchAIResponse(userMessage) {
            const response = await fetch(this.apiConfig.endpoint, {
                method: 'POST',
                headers: this.apiConfig.headers,
                body: JSON.stringify({
                    message: userMessage,
                    chatHistory: this.state.chatHistory.slice(-4) // Send last 4 messages for context
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            return data.reply;
        }
    };

    AccountabilityCoach.init();
});