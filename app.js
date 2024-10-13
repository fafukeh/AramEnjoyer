document.addEventListener('DOMContentLoaded', () => {
    const sessionList = document.getElementById('sessionList');
    const errorMessage = document.getElementById('errorMessage');
    const usernameInput = document.getElementById('username');
    const newSessionTimeSelect = document.getElementById('newSessionTime');
    const createSessionBtn = document.getElementById('createSessionBtn');
    
    let sessions = [];

    // Charger les sessions à partir de localStorage
    function loadSessions() {
        const storedSessions = localStorage.getItem('sessions');
        if (storedSessions) {
            sessions = JSON.parse(storedSessions);
        }
        renderSessions();
    }

    // Sauvegarder les sessions dans localStorage
    function saveSessions() {
        localStorage.setItem('sessions', JSON.stringify(sessions));
    }

    // Remplir le sélecteur d'heure
    function populateSessionTime() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        // Clear previous options
        newSessionTimeSelect.innerHTML = '';

        let startHour = currentHour;
        let startMinute = currentMinutes >= 30 ? 30 : 0;

        if (currentMinutes >= 30) {
            startHour += 1;
            startMinute = 0;
        }

        // Remplir le sélecteur avec des heures disponibles jusqu'à 6h
        for (let hour = startHour; hour < 6; hour++) {
            const option1 = document.createElement('option');
            option1.value = `${hour}:00`;
            option1.innerText = `${hour}:00`;
            newSessionTimeSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = `${hour}:30`;
            option2.innerText = `${hour}:30`;
            newSessionTimeSelect.appendChild(option2);
        }

        const option6am = document.createElement('option');
        option6am.value = '6:00';
        option6am.innerText = '6:00';
        newSessionTimeSelect.appendChild(option6am);
        
        // Set default value to the next available time
        if (startHour < 6) {
            newSessionTimeSelect.value = `${startHour}:${startMinute}`;
        } else {
            newSessionTimeSelect.value = '6:00';
        }
    }

    // Créer une nouvelle session
    createSessionBtn.addEventListener('click', () => {
        const username = usernameInput.value;
        const newSessionTime = newSessionTimeSelect.value;

        if (!newSessionTime) {
            showError('Veuillez entrer une heure pour créer une session');
        } else if (!username) {
            showError('Veuillez entrer un pseudo pour créer une session');
        } else if (isSessionTimeTaken(newSessionTime)) {
            showError('Une session existe déjà à cette heure');
        } else {
            const sessionStartTime = new Date(`${new Date().toDateString()} ${newSessionTime}`);
            const newSession = {
                id: Math.random().toString(),
                time: newSessionTime,
                players: [{ id: Math.random().toString(), username }],
                expiration: sessionStartTime.getTime() + 30 * 60 * 1000, // 30 minutes from the session time
                creator: username,
            };

            sessions.push(newSession);
            saveSessions();  // Enregistrer les sessions après la création
            renderSessions();
            clearError();
            startSessionCountdown(newSession, sessionStartTime);
        }
    });

    // Rendre les sessions
    function renderSessions() {
        sessionList.innerHTML = '';

        sessions.forEach((session) => {
            const sessionItem = document.createElement('li');
            sessionItem.className = 'list-group-item session-card';

            sessionItem.innerHTML = `
                <div class="session-header">
                    <strong>Session de ${session.creator}</strong>
                    <div>${session.time}</div>
                    <span>${session.players.length}/5</span>
                    <button class="btn btn-primary btn-sm join-btn" onclick="joinSession('${session.id}')">Join</button>
                </div>
                <ul class="list-group mt-2">
                    ${session.players.map(player => `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            ${player.username}
                            <button class="btn btn-danger btn-sm leave-btn" onclick="leaveSession('${session.id}', '${player.id}')">Leave</button>
                        </li>
                    `).join('')}
                </ul>
                <div id="countdown-${session.id}" class="text-center"></div>
            `;

            sessionList.appendChild(sessionItem);
            startSessionCountdown(session, new Date(`${new Date().toDateString()} ${session.time}`));
        });
    }

    // Vérifier si l'heure de session est déjà prise
    function isSessionTimeTaken(sessionTime) {
        return sessions.some(session => session.time === sessionTime);
    }

    // Démarrer le compte à rebours pour la session
    function startSessionCountdown(session, sessionStartTime) {
        const countdownElement = document.getElementById(`countdown-${session.id}`);
        const intervalId = setInterval(() => {
            const now = Date.now();
            
            if (now < sessionStartTime.getTime()) {
                const timeUntilStart = Math.ceil((sessionStartTime.getTime() - now) / 1000 / 60);
                if (timeUntilStart <= 30) {
                    countdownElement.innerHTML = `<span style="color: green;">Ouvre dans ${timeUntilStart}m</span>`;
                }
            } else {
                const remainingTime = session.expiration - now;
                if (remainingTime <= 0) {
                    clearInterval(intervalId);
                    removeSession(session.id);
                } else {
                    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
                    countdownElement.innerHTML = `<span style="color: red;">Supprimé dans ${minutes}m</span>`;
                }
            }
        }, 1000);
    }

    // Supprimer une session
    function removeSession(sessionId) {
        sessions = sessions.filter(session => session.id !== sessionId);
        saveSessions();  // Enregistrer les sessions après suppression
        renderSessions();
    }

    // Rejoindre une session
    window.joinSession = function (sessionId) {
        const session = sessions.find((s) => s.id === sessionId);
        const username = usernameInput.value;

        if (!username) {
            showError('Veuillez entrer un pseudo pour rejoindre une session');
        } else if (session.players.length < 5) {
            if (session.players.some(player => player.username === username)) {
                showError('Ce pseudo est déjà utilisé dans cette session');
            } else {
                session.players.push({ id: Math.random().toString(), username });
                saveSessions();  // Enregistrer les sessions après avoir rejoint
                renderSessions();
                clearError();
                startSessionCountdown(session, new Date(`${new Date().toDateString()} ${session.time}`));
            }
        } else {
            showError('La session est pleine');
        }
    };

    // Quitter une session
    window.leaveSession = function (sessionId, playerId) {
        const session = sessions.find((s) => s.id === sessionId);
        session.players = session.players.filter((player) => player.id !== playerId);

        if (session.players.length === 0) {
            removeSession(session.id);
        } else {
            saveSessions(); // Enregistrer les sessions après avoir quitté
            renderSessions();
        }
    };

    // Afficher les messages d'erreur
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');
    }

    // Effacer le message d'erreur
    function clearError() {
        errorMessage.classList.add('d-none');
    }

    // Initialiser l'application
    loadSessions();
    populateSessionTime();
});
