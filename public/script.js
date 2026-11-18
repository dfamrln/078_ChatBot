const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

const messages = [];

function addMessage(sender, text) {
    const message = document.createElement('div');
    message.classList.add('message', sender);
    const content = document.createElement('div');
    content.textContent = text;
    message.appendChild(content);
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
    return content;
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    messages.push({ role: 'user', content: message });
    
    userInput.value = '';
    userInput.disabled = true;
    const button = chatForm.querySelector("button");
    button.disabled = true;
    button.textContent = "Menunggu...";

    const botContent = addMessage('bot', '');
    let botResponse = "";

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Terjadi kesalahan di server");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                if (trimmedLine.startsWith("data:")) {
                    const data = trimmedLine.slice(5).trim();
                    if (data === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(data);
                        const token = typeof parsed === 'string' ? parsed : (parsed.text || parsed.content || '');
                        if (token) {
                            botResponse += token;
                            botContent.textContent = botResponse;
                            chatBox.scrollTop = chatBox.scrollHeight;
                        }
                    } catch (error) {}
                }
            }
        }

        messages.push({ role: 'assistant', content: botResponse });

    } catch (error) {
        console.error("Error:", error);
        botContent.textContent = "Maaf, Terjadi kesalahan: " + error.message;
    } finally {
        userInput.disabled = false;
        button.disabled = false;
        button.textContent = "Kirim";
        userInput.focus();
    }
});