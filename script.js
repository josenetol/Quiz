const socket = io("https://quiz-kj4a.onrender.com");

// Estado da aplicação
let appState = {
    mode: 'local', // 'local' ou 'online'
    currentPerson: 1,
    currentQuestion: 0,
    questions: [],
    participants: {
        1: { name: '', answered: false, answer: '' },
        2: { name: '', answered: false, answer: '' }
    },
    answers: [], // Array para armazenar todas as respostas
    sessionId: null,
    isConnected: false,
    myParticipantId: null,
    otherParticipantId: null // Adicionado para armazenar o ID do outro participante no modo online
};

// Elementos DOM
const elements = {
    // Telas
    startScreen: document.getElementById('start-screen'),
    shareScreen: document.getElementById('share-screen'),
    experienceScreen: document.getElementById('experience-screen'),
    resultScreen: document.getElementById('result-screen'),
    
    // Inputs iniciais
    person1Name: document.getElementById('person1-name'),
    person1InputGroup: document.getElementById('person1-input-group'),
    person2Name: document.getElementById('person2-name'),
    person2InputGroup: document.getElementById('person2-input-group'),
    startBtn: document.getElementById('start-experience'),
    otherPersonName: document.getElementById('other-person-name'),
    
    // Opções de modo
    optionBtns: document.querySelectorAll('.option-btn'),
    
    // Compartilhamento
    shareLink: document.getElementById('shareLink'),
    copyLinkBtn: document.getElementById('copy-link'),
    qrCode: document.getElementById('qr-code'),
    connectionStatus: document.getElementById('connection-status'),
    startLocalBtn: document.getElementById('start-local-instead'),
    
    // Interface da experiência
    currentQuestionSpan: document.getElementById('current-question'),
    totalQuestionsSpan: document.getElementById('total-questions'),
    progressFill: document.querySelector('.progress-fill'),
    person1Card: document.getElementById('person1-card'),
    person2Card: document.getElementById('person2-card'),
    person1Display: document.getElementById('person1-display'),
    person2Display: document.getElementById('person2-display'),
    person1Status: document.getElementById('person1-status'),
    person2Status: document.getElementById('person2-status'),
    currentTurnText: document.getElementById('current-turn-text'),
    questionNumber: document.getElementById('question-number'),
    questionText: document.getElementById('question-text'),
    questionDescription: document.getElementById('question-description'),
    answerInput: document.getElementById('answer-input'),
    charCount: document.getElementById('char-count'),
    submitBtn: document.getElementById('submit-answer'),
    
    // Estados de espera
    waitingOther: document.getElementById('waiting-other'),
    waitingForName: document.getElementById('waiting-for-name'),
    bothAnswered: document.getElementById('both-answered'),
    answer1Author: document.getElementById('answer1-author'),
    answer1Text: document.getElementById('answer1-text'),
    answer2Author: document.getElementById('answer2-author'),
    answer2Text: document.getElementById('answer2-text'),
    nextQuestionBtn: document.getElementById('next-question'),
    
    // Resultados
    answersSummary: document.getElementById('answers-summary'),
    downloadBtn: document.getElementById('download-results'),
    shareResultsBtn: document.getElementById('share-results'),
    startAgainBtn: document.getElementById('start-again')
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    checkUrlParams();
});

function initializeApp() {
    // Event listeners para seleção de modo
    elements.optionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            elements.optionBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            appState.mode = this.dataset.mode;
            updateInputVisibility();
            validateInputs();
        });
    });

    // Chamar uma vez na inicialização para definir o estado correto
    updateInputVisibility();

    // Event listener para iniciar
    elements.startBtn.addEventListener('click', startExperience);
    
    // Event listeners para compartilhamento
    elements.copyLinkBtn.addEventListener('click', copyShareLink);
    elements.startLocalBtn.addEventListener('click', startLocalMode);
    
    // Event listeners para a experiência
    elements.answerInput.addEventListener('input', updateCharCounter);
    elements.submitBtn.addEventListener('click', submitAnswer);
    elements.nextQuestionBtn.addEventListener('click', nextQuestion);
    
    // Event listeners para resultados
    elements.downloadBtn.addEventListener('click', downloadResults);
    elements.shareResultsBtn.addEventListener('click', shareResults);
    elements.startAgainBtn.addEventListener('click', resetApp);
    
    // Validação de entrada
    elements.person1Name.addEventListener('input', validateInputs);
    elements.person2Name.addEventListener('input', validateInputs);
    
    // Obter perguntas (agora gerenciado pelo servidor no modo online)
    // appState.questions = getRandomQuestions(10);
    // elements.totalQuestionsSpan.textContent = appState.questions.length;

    // Socket.IO Event Listeners
    socket.on('sessionCreated', (data) => {
        console.log('Client: Received sessionCreated event. Data:', data);
        appState.sessionId = data.sessionId;
        const shareUrl = `${window.location.origin}?session=${appState.sessionId}&participant=2`;

        // Garante que os elementos existem antes de tentar usá-los
        if (!elements.shareLink || !elements.qrCode) {
            console.error('Elemento de link ou QR Code não encontrado no objeto elements.');
            return;
        }

        elements.shareLink.value = shareUrl;
        console.log("Link gerado:", elements.shareLink.value);
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(elements.qrCode, shareUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#667eea',
                    light: '#ffffff'
                }
            });
        } else {
            console.error("QRCode library not loaded or initialized yet. Cannot generate QR code.");
        }
        elements.connectionStatus.textContent = 'Aguardando o outro jogador...';
        showScreen('share');
    });

    socket.on('playerJoined', (data) => {
        const playerIds = Object.keys(data.players);
        const mySocketId = socket.id;
        
        // Determinar quem é quem
        if (playerIds[0] === mySocketId) {
            appState.participants[1].name = data.players[playerIds[0]];
            appState.participants[2].name = data.players[playerIds[1]];
            appState.myParticipantId = 1;
            appState.otherParticipantId = 2;
        } else {
            appState.participants[1].name = data.players[playerIds[1]];
            appState.participants[2].name = data.players[playerIds[0]];
            appState.myParticipantId = 2;
            appState.otherParticipantId = 1;
        }

        elements.connectionStatus.textContent = 'Conectado!';
        appState.isConnected = true;
        startExperienceScreen();
    });

    socket.on('loadQuestion', (data) => {
        appState.questions = data.questions;
        appState.currentQuestion = data.currentQuestion;
        elements.totalQuestionsSpan.textContent = appState.questions.length;
        loadQuestion();
    });

    socket.on('allAnswered', (data) => {
        const currentQuestionData = appState.questions[appState.currentQuestion];
        appState.answers.push({
            question: currentQuestionData,
            answers: data.answers
        });
        showBothAnswered(data.answers);
    });

    socket.on('sessionError', (data) => {
        alert(`Erro na sessão: ${data.message}`);
        resetApp();
    });

    socket.on('disconnect', () => {
        console.log('Desconectado do servidor.');
        // Implementar lógica de reconexão ou mensagem para o usuário
    });
}

function validateInputs() {
    let isInputValid = false;
    const person1NameValue = elements.person1Name.value.trim();
    const person2NameValue = elements.person2Name.value.trim();

    if (appState.mode === 'local') {
        isInputValid = person1NameValue.length > 0 && person2NameValue.length > 0;
    } else { // Online mode
        let currentParticipantId = appState.myParticipantId;

        // Se myParticipantId não estiver definido, tenta obtê-lo dos parâmetros da URL
        if (currentParticipantId === null) {
            const urlParams = new URLSearchParams(window.location.search);
            const participantIdFromUrl = urlParams.get('participant');
            if (participantIdFromUrl) {
                currentParticipantId = parseInt(participantIdFromUrl);
            } else {
                // Padrão para participante 1 se não houver parâmetro de URL e myParticipantId não estiver definido (criador de nova sessão)
                currentParticipantId = 1;
            }
        }

        if (currentParticipantId === 1) {
            isInputValid = person1NameValue.length > 0;
        } else if (currentParticipantId === 2) {
            isInputValid = person2NameValue.length > 0;
        }
    }
    elements.startBtn.disabled = !isInputValid;
}

function updateInputVisibility() {
    if (appState.mode === 'local') {
        elements.person2InputGroup.style.display = 'block';
    } else {
        elements.person2InputGroup.style.display = 'none';
    }
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    const participantId = urlParams.get('participant');
    
    if (sessionId && participantId) {
        appState.sessionId = sessionId;
        appState.myParticipantId = parseInt(participantId);
        appState.mode = 'online';
        
        // Mostrar tela inicial
        showScreen('start'); 
        
        // Desabilitar o input do nome da pessoa que já está na sessão
        if (appState.myParticipantId === 1) {
            elements.person2InputGroup.style.display = 'none';
            elements.person1Name.focus();
        } else {
            elements.person1InputGroup.style.display = 'none';
            elements.person2Name.focus();
        }
        // Atualizar texto do botão para indicar que está entrando em uma sessão
        elements.startBtn.textContent = 'Entrar na sessão';
        validateInputs();
    }
}

function startExperience() {
    const person1Name = elements.person1Name.value.trim();
    const person2Name = elements.person2Name.value.trim();

    if (appState.mode === 'local') {
        if (!person1Name || !person2Name) {
            alert('Por favor, digite os nomes das duas pessoas!');
            return;
        }
        appState.participants[1].name = person1Name;
        appState.participants[2].name = person2Name;
        startLocalMode();
    } else { // Online mode
        let myName = '';
        let myNameInput = null; // Reference to the input element

        // Determine which input field corresponds to 'my' name based on current state
        // This logic needs to be robust for both new sessions and joining existing ones
        if (appState.myParticipantId === 1 || (appState.myParticipantId === null && !appState.sessionId)) {
            // If creating a new session (myParticipantId is null and no sessionId) or already participant 1
            myNameInput = elements.person1Name;
            appState.myParticipantId = 1; // Explicitly set for new session creator
            appState.otherParticipantId = 2;
        } else if (appState.myParticipantId === 2 || (appState.myParticipantId === null && appState.sessionId)) {
            // If joining an existing session (myParticipantId is null but sessionId exists) or already participant 2
            myNameInput = elements.person2Name;
            // If myParticipantId is null here, it means we're joining a session as participant 2
            if (appState.myParticipantId === null) {
                const urlParams = new URLSearchParams(window.location.search);
                const participantIdFromUrl = urlParams.get('participant');
                appState.myParticipantId = parseInt(participantIdFromUrl); // Should be 2
                appState.otherParticipantId = 1;
            }
        }

        myName = myNameInput.value.trim();

        if (!myName) {
            alert('Por favor, digite seu nome!');
            return;
        }

        // Atribuir nomes aos participantes no appState
        appState.participants[appState.myParticipantId].name = myName;
        // O nome do outro participante será definido quando ele se conectar ou é temporário
        if (appState.myParticipantId === 1) {
            appState.participants[2].name = elements.person2Name.value.trim() || 'Aguardando...';
        } else { // myParticipantId === 2
            appState.participants[1].name = elements.person1Name.value.trim() || 'Aguardando...';
        }

        if (appState.sessionId) {
            // Entrando em uma sessão existente
            socket.emit('joinSession', { sessionId: appState.sessionId, playerName: myName });
            elements.connectionStatus.textContent = 'Conectando à sessão existente...';
        } else {
            // Criando uma nova sessão
            socket.emit('createSession', { playerName: myName });
            appState.myParticipantId = 1; // The creator is always participant 1
            appState.otherParticipantId = 2;
            validateInputs(); // Chamar validateInputs após definir myParticipantId
            elements.otherPersonName.textContent = appState.participants[appState.otherParticipantId].name; // Será 'Aguardando...' inicialmente
            elements.connectionStatus.textContent = 'Aguardando o outro jogador...';
        }
        showScreen('share');
    }

    // Tentativa de obter localização (mantido, mas não diretamente ligado ao Socket.IO)
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            let cidade = '', pais = '';
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const data = await res.json();
                cidade = data.address.city || data.address.town || data.address.village || '';
                pais = data.address.country || '';
            } catch (e) {
                console.error('Erro ao buscar cidade/pais', e);
            }

            try {
                await fetch(window.location.origin + '/api/localizacao', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pessoa1: appState.participants[1].name,
                        pessoa2: appState.participants[2].name,
                        latitude: lat,
                        longitude: lon,
                        cidade,
                        pais
                    })
                });
                console.log('Localização enviada com sucesso!');
            } catch (e) {
                console.error('Erro ao enviar localização', e);
            }
        },
        (err) => {
            console.warn('Geolocalização negada ou indisponível');
        },
        {
            timeout: 5000
        }
    );
}





function startLocalMode() {
    appState.mode = 'local';
    appState.isConnected = true;
    appState.questions = getRandomQuestions(10); // Carrega perguntas para o modo local
    elements.totalQuestionsSpan.textContent = appState.questions.length;
    startExperienceScreen();
    console.log('Client: startExperienceScreen() called.');
}

function startExperienceScreen() {
    // Configurar interface
    elements.person1Display.textContent = appState.participants[1].name;
    elements.person2Display.textContent = appState.participants[2].name;
    
    // Mostrar tela da experiência
    showScreen('experience');
    
    // Carregar primeira pergunta (ou a pergunta atual no modo online)
    if (appState.mode === 'local') {
        loadQuestion();
    }
    updateInterface();
    console.log('Client: updateInterface() called.');
}

function loadQuestion() {
    if (appState.currentQuestion >= appState.questions.length) {
        showResults();
        return;
    }

    const question = appState.questions[appState.currentQuestion];
    
    // Atualizar interface da pergunta
    elements.currentQuestionSpan.textContent = appState.currentQuestion + 1;
    elements.questionNumber.textContent = appState.currentQuestion + 1;
    elements.questionText.textContent = question.question;
    elements.questionDescription.textContent = question.description;
    
    // Atualizar progresso
    const progress = ((appState.currentQuestion + 1) / appState.questions.length) * 100;
    elements.progressFill.style.width = `${progress}%`;
    
    // Resetar estado da pergunta
    appState.participants[1].answered = false;
    appState.participants[1].answer = '';
    appState.participants[2].answered = false;
    appState.participants[2].answer = '';
    
    // Limpar input
    elements.answerInput.value = '';
    updateCharCounter();
    
    updateInterface();
}

function updateInterface() {
    // Atualizar indicador de turno
    const currentName = appState.participants[appState.currentPerson].name;
    elements.currentTurnText.textContent = `Vez de ${currentName}`;
    
    // Atualizar cards dos participantes
    elements.person1Card.classList.toggle('active', appState.currentPerson === 1);
    elements.person2Card.classList.toggle('active', appState.currentPerson === 2);
    
    // Atualizar status
    updateParticipantStatus(1);
    updateParticipantStatus(2);
    
    // Mostrar/esconder elementos baseado no estado
    const bothAnswered = appState.participants[1].answered && appState.participants[2].answered;
    const currentAnswered = appState.participants[appState.currentPerson].answered;
    
    if (bothAnswered) {
        showBothAnswered();
    } else if (currentAnswered && appState.mode === 'local') {
        switchTurn();
    } else if (currentAnswered) {
        showWaitingForOther();
    } else {
        showAnswerInput();
    }
}

function updateParticipantStatus(participantId) {
    const participant = appState.participants[participantId];
    const statusElement = participantId === 1 ? elements.person1Status : elements.person2Status;
    
    if (participant.answered) {
        statusElement.innerHTML = '<i class="fas fa-check"></i><span>Respondeu</span>';
        statusElement.className = 'status answered';
    } else if (participantId === appState.currentPerson) {
        statusElement.innerHTML = '<i class="fas fa-edit"></i><span>Respondendo</span>';
        statusElement.className = 'status active';
    } else {
        statusElement.innerHTML = '<i class="fas fa-clock"></i><span>Aguardando</span>';
        statusElement.className = 'status waiting';
    }
}

function updateCharCounter() {
    const count = elements.answerInput.value.length;
    elements.charCount.textContent = count;
    elements.submitBtn.disabled = count === 0;
}

function submitAnswer() {
    const answer = elements.answerInput.value.trim();
    if (!answer) return;

    let participantToUpdateId;
    if (appState.mode === 'local') {
        participantToUpdateId = appState.currentPerson;
    } else { // online mode
        participantToUpdateId = appState.myParticipantId;
    }
    
    // Salvar resposta localmente
    appState.participants[participantToUpdateId].answer = answer;
    appState.participants[participantToUpdateId].answered = true;
    console.log(`Client: Submitted answer for participant ${participantToUpdateId}. Answer: ${answer}`);
    
    if (appState.mode === 'online') {
        socket.emit('submitAnswer', { sessionId: appState.sessionId, answer: answer, participantId: appState.myParticipantId });
    }
    
    updateInterface();
}

function switchTurn() {
    appState.currentPerson = appState.currentPerson === 1 ? 2 : 1;
    elements.answerInput.value = '';
    updateCharCounter();
    updateInterface();
}

function showAnswerInput() {
    document.querySelector('.answer-container').style.display = 'block';
    elements.waitingOther.style.display = 'none';
    elements.bothAnswered.style.display = 'none';
}

function showWaitingForOther() {
    document.querySelector('.answer-container').style.display = 'none';
    elements.waitingOther.style.display = 'block';
    elements.bothAnswered.style.display = 'none';
    
    const otherPerson = appState.currentPerson === 1 ? 2 : 1;
    elements.waitingForName.textContent = appState.participants[otherPerson].name;
}

function showBothAnswered(answersFromSocket = null) {
    document.querySelector('.answer-container').style.display = 'none';
    elements.waitingOther.style.display = 'none';
    elements.bothAnswered.style.display = 'block';
    
    let p1Answer = '';
    let p2Answer = '';

    if (appState.mode === 'online' && answersFromSocket) {
        for (const socketId in answersFromSocket) {
            const answerData = answersFromSocket[socketId];
            if (answerData.playerName === appState.participants[1].name) {
                p1Answer = answerData.answer;
            } else if (answerData.playerName === appState.participants[2].name) {
                p2Answer = answerData.answer;
            }
        }
    } else { // Local mode or if answersFromSocket is null (shouldn't happen in online mode)
        p1Answer = appState.participants[1].answer;
        p2Answer = appState.participants[2].answer;
    }

    // Mostrar respostas
    elements.answer1Author.textContent = appState.participants[1].name;
    elements.answer1Text.textContent = p1Answer;
    elements.answer2Author.textContent = appState.participants[2].name;
    elements.answer2Text.textContent = p2Answer;
}

function nextQuestion() {
    // Salvar respostas da pergunta atual
    const questionData = {
        question: appState.questions[appState.currentQuestion],
        answers: {
            [appState.participants[1].name]: appState.participants[1].answer,
            [appState.participants[2].name]: appState.participants[2].answer
        }
    };
    appState.answers.push(questionData);
    console.log('Client: Moving to next question.');
    
    if (appState.mode === 'online') {
        socket.emit('nextQuestion', { sessionId: appState.sessionId });
    } else {
        // Avançar para próxima pergunta
        appState.currentQuestion++;
        
        // Alternar quem começa
        appState.currentPerson = appState.currentPerson === 1 ? 2 : 1;
        
        loadQuestion();
    }
}

function showResults() {
    showScreen('result');
    displayAnswersSummary();
}

function displayAnswersSummary() {
    const summaryHtml = appState.answers.map((item, index) => `
        <div class="question-summary">
            <h3>Pergunta ${index + 1}: ${item.question.question}</h3>
            <div class="answers-pair">
                <div class="answer-item">
                    <h4>${appState.participants[1].name}:</h4>
                    <p>${item.answers[appState.participants[1].name]}</p>
                </div>
                <div class="answer-item">
                    <h4>${appState.participants[2].name}:</h4>
                    <p>${item.answers[appState.participants[2].name]}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    elements.answersSummary.innerHTML = summaryHtml;
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function copyShareLink() {
    elements.shareLink.select();
    document.execCommand('copy');
    
    // Feedback visual
    const originalText = elements.copyLinkBtn.innerHTML;
    elements.copyLinkBtn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
        elements.copyLinkBtn.innerHTML = originalText;
    }, 2000);
}

// A função connectToSession não é mais necessária, pois a conexão é gerenciada pelo Socket.IO
// function connectToSession() {
//     // ... (código removido)
// }

function downloadResults() {
    const content = generateResultsText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversa-${appState.participants[1].name}-${appState.participants[2].name}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
}

function generateResultsText() {
    let content = `Conversa entre ${appState.participants[1].name} e ${appState.participants[2].name}\n`;
    content += `Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    
    appState.answers.forEach((item, index) => {
        content += `Pergunta ${index + 1}: ${item.question.question}\n\n`;
        content += `${appState.participants[1].name}: ${item.answers[appState.participants[1].name]}\n\n`;
        content += `${appState.participants[2].name}: ${item.answers[appState.participants[2].name]}\n\n`;
        content += '---\n\n';
    });
    
    return content;
}

function shareResults() {
    if (navigator.share) {
        navigator.share({
            title: 'Nossa conversa especial',
            text: `${appState.participants[1].name} e ${appState.participants[2].name} se conheceram melhor!`,
            url: window.location.href
        });
    } else {
        // Fallback para navegadores que não suportam Web Share API
        copyShareLink();
    }
}

function resetApp() {
    // Resetar estado
    appState = {
        mode: 'local',
        currentPerson: 1,
        currentQuestion: 0,
        questions: fetishQuestions, // Mantido para o modo local
        participants: {
            1: { name: '', answered: false, answer: '' },
            2: { name: '', answered: false, answer: '' }
        },
        answers: [],
        sessionId: null,
        isConnected: false,
        myParticipantId: null,
        otherParticipantId: null
    };
    
    // Limpar inputs
    elements.person1Name.value = '';
    elements.person2Name.value = '';
    elements.answerInput.value = '';
    
    // Voltar para tela inicial
    showScreen('start');
    
    // Resetar validação
    validateInputs();
}

// A função generateSessionId não é mais necessária, pois o servidor gera o ID da sessão
// function generateSessionId() {
//     return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
// }
