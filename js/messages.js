// ==================================================================
// MODULE: messages.js (v2 - Avec gestion des messages non lus)
// Gère l'affichage, l'interaction de la vue Messagerie, et la mise
// à jour des compteurs de messages non lus.
// ==================================================================

import { db } from './firebase-config.js'; // Importe l'instance Firestore
import {
    collection, query, where, orderBy, limit, onSnapshot,
    addDoc, serverTimestamp, doc, getDoc, updateDoc,
    increment // <-- NOUVELLE MANIÈRE
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { currentUser } from './app.js'; // Importe l'état global de l'utilisateur connecté


// --- Références DOM spécifiques à la Messagerie ---
const conversationsListUl = document.getElementById('conversations-list-ul');
const conversationsLoading = document.getElementById('conversations-loading');
const noConversations = document.getElementById('no-conversations');
const chatContainer = document.getElementById('chat-container');
const chatHeaderUser = document.getElementById('chat-with-user');
const chatHeaderAnnonce = document.getElementById('chat-annonce-link');
const chatMessagesDiv = document.getElementById('chat-messages');
const chatSelectPrompt = document.getElementById('chat-select-prompt');
const chatMessagesLoading = document.getElementById('chat-messages-loading');
const chatForm = document.getElementById('chat-form');
const chatMessageInput = document.getElementById('chat-message-input');
const chatSendButton = document.getElementById('chat-send-button');
const chatError = document.getElementById('chat-error');

// --- État du module Messagerie ---
let activeConversationId = null; // ID de la conversation actuellement affichée
let messagesUnsubscribe = null; // Fonction pour arrêter l'écouteur temps réel des messages

// --- Fonctions Utilitaires ---

function formatMessageTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false };
    const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('fr-FR', optionsTime);
    }
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `Hier, ${date.toLocaleTimeString('fr-FR', optionsTime)}`;
    }
    return date.toLocaleDateString('fr-FR', optionsDate);
}

// --- NOUVELLE FONCTION ---
/**
 * Met le compteur de messages non lus à 0 pour l'utilisateur actuel
 * dans une conversation spécifique.
 * @param {string} convId - L'ID de la conversation.
 */
async function markConversationAsRead(convId) {
    if (!convId || !currentUser) return;
    
    // On récupère d'abord les données pour éviter une écriture inutile
    const convRef = doc(db, "conversations", convId);
    try {
        const convSnap = await getDoc(convRef);
        if (convSnap.exists() && convSnap.data().unreadCount?.[currentUser.uid] > 0) {
            console.log(`Marquage de ${convSnap.data().unreadCount[currentUser.uid]} message(s) comme lu(s) pour la conv ${convId}`);
            const updatePayload = {
                [`unreadCount.${currentUser.uid}`]: 0
            };
            await updateDoc(convRef, updatePayload);
        } else {
            // Pas de messages non lus à marquer, on ne fait rien.
            // console.log(`Aucun message non lu à marquer pour la conv ${convId}`);
        }
    } catch (error) {
        console.error("Erreur lors du marquage 'lu':", error);
    }
}

// --- Fonctions Principales ---

function loadConversations() {
    if (!currentUser) { console.log("Messages: Non connecté."); return; }
    if (!conversationsListUl || !conversationsLoading || !noConversations) { console.error("DOM Messagerie Liste manquant"); return; }

    conversationsLoading.style.display = 'block';
    noConversations.style.display = 'none';
    conversationsListUl.innerHTML = '';

    const convRef = collection(db, "conversations");
    const q = query(convRef,
                    where("participants", "array-contains", currentUser.uid),
                    orderBy("lastMessage.timestamp", "desc"),
                    limit(30));

    onSnapshot(q, (querySnapshot) => {
        console.log("Mise à jour liste conversations reçue.");
        conversationsLoading.style.display = 'none';
        conversationsListUl.innerHTML = '';

        if (querySnapshot.empty) {
            noConversations.style.display = 'block';
        } else {
            noConversations.style.display = 'none';
            querySnapshot.forEach((doc) => {
                displayConversationInList(doc.id, doc.data());
            });

            const openConvId = sessionStorage.getItem('openConversationId');
            if (openConvId && activeConversationId !== openConvId) {
                openConversation(openConvId);
                sessionStorage.removeItem('openConversationId');
            }
        }
    }, (error) => {
        console.error("Erreur écouteur conversations:", error);
        conversationsLoading.style.display = 'none';
        if(conversationsListUl) conversationsListUl.innerHTML = '<li style="padding:10px; color:red;">Erreur chargement.</li>';
    });
}

function displayConversationInList(convId, convData) {
    if (!conversationsListUl || !currentUser) return;

    const otherParticipantUid = convData.participants.find(uid => uid !== currentUser.uid);
    const otherUserInfo = convData.participantInfo?.[otherParticipantUid];
    const contactName = otherUserInfo?.nom || "Contact inconnu";
    const contactPhoto = otherUserInfo?.photoUrl || 'https://via.placeholder.com/40';
    const annonceTitre = convData.annonceTitre || "Annonce";
    const lastMsgText = convData.lastMessage?.text || "Démarrer la conversation";
    
    // --- NOUVEAU: Vérifier les messages non lus ---
    const unreadMessages = convData.unreadCount?.[currentUser.uid] || 0;

    const li = document.createElement('li');
    li.className = `conversation-item ${convId === activeConversationId ? 'active' : ''}`;
    li.dataset.convId = convId;
    
    // Si la conversation a des messages non lus, on lui donne un style particulier
    if (unreadMessages > 0) {
        li.classList.add('unread'); // Vous pouvez styler .unread en CSS (ex: font-weight: bold)
    }

    li.innerHTML = `
        <img src="${contactPhoto}" alt="${contactName}">
        <div>
            <span class="conv-user-name">${contactName}</span>
            <span class="conv-annonce-titre" title="Annonce: ${annonceTitre}">Annonce: ${annonceTitre}</span>
            <span class="conv-last-message">${lastMsgText}</span>
        </div>
        ${unreadMessages > 0 ? `<span class="conv-unread-badge">${unreadMessages}</span>` : ''}
    `;

    li.addEventListener('click', () => openConversation(convId));
    conversationsListUl.appendChild(li);
}

async function openConversation(convId) {
    if (!convId || !currentUser) return;
    if (convId === activeConversationId && messagesUnsubscribe) return;

    console.log(`Ouverture conversation: ${convId}`);
    activeConversationId = convId;

    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.toggle('active', item.dataset.convId === convId);
    });

    if (chatMessagesDiv) chatMessagesDiv.innerHTML = '';
    if (chatSelectPrompt) chatSelectPrompt.style.display = 'none';
    if (chatMessagesLoading) chatMessagesLoading.style.display = 'block';
    if (chatForm) chatForm.style.display = 'none';
    if (chatError) chatError.style.display = 'none';

    if (messagesUnsubscribe) {
        messagesUnsubscribe();
        messagesUnsubscribe = null;
    }

    try {
        const convRef = doc(db, "conversations", convId);
        const convSnap = await getDoc(convRef);
        if (!convSnap.exists()) throw new Error("Conversation introuvable.");
        
        const convData = convSnap.data();
        const otherUid = convData.participants.find(uid => uid !== currentUser.uid);
        const otherInfo = convData.participantInfo?.[otherUid];

        if(chatHeaderUser) chatHeaderUser.textContent = `Chat avec ${otherInfo?.nom || 'Inconnu'}`;
        if(chatHeaderAnnonce && convData.annonceId) {
             const titreCourt = (convData.annonceTitre || 'Annonce').substring(0, 40);
             chatHeaderAnnonce.innerHTML = `Concernant : <a href="#" class="chat-annonce-link" data-annonce-id="${convData.annonceId}" title="Voir l'annonce: ${convData.annonceTitre}">${titreCourt}${convData.annonceTitre && convData.annonceTitre.length > 40 ? '...' : ''}</a>`;
        } else if (chatHeaderAnnonce) {
             chatHeaderAnnonce.innerHTML = '';
        }
        
        // --- NOUVEAU: Marquer la conversation comme lue ---
        // On le fait dès l'ouverture, avant même de charger les messages.
        await markConversationAsRead(convId);

        const messagesRef = collection(db, "conversations", convId, "messages");
        const qMessages = query(messagesRef, orderBy("timestamp", "asc"));

        messagesUnsubscribe = onSnapshot(qMessages, (querySnapshot) => {
            console.log(`Messages reçus/maj pour ${convId}: ${querySnapshot.size}`);
            if (chatMessagesLoading) chatMessagesLoading.style.display = 'none';
            if (chatMessagesDiv) chatMessagesDiv.innerHTML = '';

            if (querySnapshot.empty) {
                if (chatMessagesDiv) chatMessagesDiv.innerHTML = '<p style="text-align:center; color:#888;">Aucun message.</p>';
            } else {
                querySnapshot.forEach((doc) => displayMessage(doc.data()));
                if(chatMessagesDiv) chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
            }
            if (chatForm) chatForm.style.display = 'flex';
        }, (error) => {
            console.error(`Erreur écoute messages ${convId}:`, error);
            if (chatMessagesLoading) chatMessagesLoading.style.display = 'none';
            if (chatError) { chatError.textContent = "Erreur chargement messages."; chatError.style.display = 'block'; }
        });

    } catch (error) {
        console.error(`Erreur ouverture conv ${convId}:`, error);
        if (chatMessagesLoading) chatMessagesLoading.style.display = 'none';
        if (chatError) { chatError.textContent = "Impossible d'ouvrir la conversation."; chatError.style.display = 'block'; }
        activeConversationId = null;
    }
}

function displayMessage(msgData) {
    if (!chatMessagesDiv || !currentUser) return;

    const msgContainer = document.createElement('div'); msgContainer.classList.add('message-container');
    const msgDiv = document.createElement('div'); msgDiv.classList.add('message'); msgDiv.textContent = msgData.text;
    const timeSpan = document.createElement('span'); timeSpan.classList.add('message-timestamp');
    timeSpan.textContent = formatMessageTimestamp(msgData.timestamp);

    if (msgData.senderUid === currentUser.uid) {
        msgContainer.classList.add('message-sent-container'); msgDiv.classList.add('message-sent');
    } else {
        msgContainer.classList.add('message-received-container'); msgDiv.classList.add('message-received');
    }
    msgContainer.appendChild(msgDiv);
    msgContainer.appendChild(timeSpan);
    chatMessagesDiv.appendChild(msgContainer);
}

// --- MISE À JOUR DE CETTE FONCTION ---
async function handleSendMessage(event) {
    event.preventDefault();
    if (!currentUser || !activeConversationId || !chatMessageInput || !chatSendButton) return;

    const messageText = chatMessageInput.value.trim();
    if (messageText === "") return;

    chatSendButton.disabled = true;
    chatMessageInput.disabled = true;

    try {
        const convRef = doc(db, "conversations", activeConversationId);
        const convSnap = await getDoc(convRef);
        if (!convSnap.exists()) throw new Error("Conversation parente introuvable.");

        const receiverUid = convSnap.data().participants.find(uid => uid !== currentUser.uid);
        if (!receiverUid) throw new Error("Destinataire non trouvé dans la conversation.");

        // 1. Ajouter le nouveau message
        const messagesRef = collection(db, "conversations", activeConversationId, "messages");
        await addDoc(messagesRef, {
            senderUid: currentUser.uid,
            receiverUid: receiverUid,
            text: messageText,
            timestamp: serverTimestamp()
        });

        // 2. Mettre à jour la conversation parente (dernier message ET compteur non lu)
        const updatePayload = {
            lastMessage: {
                text: messageText.substring(0, 50),
                senderUid: currentUser.uid,
                timestamp: serverTimestamp()
            },
            // APPEL CORRIGÉ ICI
            [`unreadCount.${receiverUid}`]: increment(1) 
        };
        await updateDoc(convRef, updatePayload);

        console.log("Message envoyé et conversation mise à jour.");
        chatMessageInput.value = '';

    } catch (error) {
        console.error("Erreur envoi/maj:", error);
        alert("Erreur lors de l'envoi du message.");
    } finally {
        chatSendButton.disabled = false;
        chatMessageInput.disabled = false;
        chatMessageInput.focus();
    }
}

function setupMessagesViewListeners() {
    if (chatForm) {
        chatForm.addEventListener('submit', handleSendMessage);
    } else {
        console.error("Chat form (#chat-form) not found for listener setup.");
    }
}

function setupChatHeaderListener() {
    const chatHeaderElement = document.getElementById('chat-header');
    if (chatHeaderElement) {
        chatHeaderElement.addEventListener('click', (event) => {
            const annonceLink = event.target.closest('.chat-annonce-link');
            if (annonceLink && annonceLink.dataset.annonceId) {
                event.preventDefault();
                const annonceId = annonceLink.dataset.annonceId;
                import('./relais-details-modal.js')
                    .then(module => module.afficherDetailsRelais(annonceId))
                    .catch(err => console.error("Erreur chargement module details modal:", err));
            }
        });
    }
}

function initializeMessagesModule() {
    console.log("Initialisation module messages...");
    setupMessagesViewListeners();
    setupChatHeaderListener();
}

export { initializeMessagesModule, loadConversations };