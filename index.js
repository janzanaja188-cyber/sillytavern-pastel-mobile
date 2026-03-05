console.log("Pastel Mobile extension loaded");

function createPhoneUI() {

    if (document.getElementById("pastel-phone")) return;

    const phone = document.createElement("div");
    phone.id = "pastel-phone";

    phone.innerHTML = `
        <div class="phone-header">
            Pastel Phone
        </div>

        <textarea id="pastel-input" placeholder="Type message..."></textarea>

        <div class="phone-buttons">
            <button id="pastel-send">Confirm</button>
            <button id="pastel-close">Close</button>
        </div>
    `;

    document.body.appendChild(phone);

    document.getElementById("pastel-close").onclick = () => {
        phone.remove();
    };

    document.getElementById("pastel-send").onclick = () => {

        const text = document.getElementById("pastel-input").value;

        console.log("Message from phone:", text);

        // ตรงนี้สามารถส่งเข้า ST chat ได้ภายหลัง
    };
}

function createFloatingButton() {

    if (document.getElementById("pastel-floating")) return;

    const btn = document.createElement("div");

    btn.id = "pastel-floating";
    btn.innerText = "📱";

    btn.onclick = createPhoneUI;

    document.body.appendChild(btn);
}

function waitForST() {

    if (document.body) {
        createFloatingButton();
    } else {
        setTimeout(waitForST, 500);
    }
}

waitForST();
